/**
 * Delete User Account Script
 * Deletes a specific user account from both Firebase Auth and Firestore
 *
 * USAGE: node scripts/deleteUser.cjs <email>
 * Example: node scripts/deleteUser.cjs user@example.com
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function deleteUser(email) {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   🗑️  DELETE USER ACCOUNT                         ║');
  console.log('║   Nigeria Government Asset Management System      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  if (!email) {
    console.error('❌ Error: Email address is required');
    console.log('\nUsage: node scripts/deleteUser.cjs <email>');
    console.log('Example: node scripts/deleteUser.cjs user@example.com\n');
    process.exit(1);
  }

  try {
    console.log(`🔍 Looking up user: ${email}...`);

    // Get user by email from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    const userId = userRecord.uid;

    console.log(`✓ Found user with UID: ${userId}`);

    // Get user data from Firestore to display info
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('\n📋 User Details:');
      console.log('─'.repeat(50));
      console.log(`Email:        ${userData.email}`);
      console.log(`Agency:       ${userData.agencyName}`);
      console.log(`Ministry:     ${userData.ministryType}`);
      console.log(`Role:         ${userData.role}`);
      console.log(`Created:      ${userData.createdAt?.toDate().toLocaleDateString('en-GB')}`);
      console.log('─'.repeat(50));
    }

    console.log('\n⚠️  WARNING: This action cannot be undone!');
    console.log('This will delete:');
    console.log('  • Firebase Authentication account');
    console.log('  • Firestore user document');
    console.log('  • User will be permanently removed from the system\n');

    // Delete from Firestore
    console.log('🗑️  Deleting Firestore document...');
    await db.collection('users').doc(userId).delete();
    console.log('✓ Firestore document deleted');

    // Delete from Firebase Auth
    console.log('🗑️  Deleting Firebase Auth account...');
    await auth.deleteUser(userId);
    console.log('✓ Firebase Auth account deleted');

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   ✅ USER ACCOUNT DELETED SUCCESSFULLY            ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log(`Account ${email} has been completely removed from the system.\n`);

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error('\n❌ Error: No user found with that email address.');
    } else {
      console.error('\n❌ Error deleting user:', error.message);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get email from command line arguments
const email = process.argv[2];
deleteUser(email);
