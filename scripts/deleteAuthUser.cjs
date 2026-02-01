/**
 * Delete Firebase Auth User Script
 * Deletes a user from Firebase Auth by email (even if no Firestore document exists)
 * Use this for orphaned accounts where Auth succeeded but Firestore failed
 *
 * USAGE: node scripts/deleteAuthUser.cjs <email>
 * Example: node scripts/deleteAuthUser.cjs vixchineduforex@gmail.com
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

async function deleteAuthUser(email) {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   🗑️  DELETE FIREBASE AUTH ACCOUNT                ║');
  console.log('║   (For orphaned accounts)                         ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  if (!email) {
    console.error('❌ Error: Email address is required');
    console.log('\nUsage: node scripts/deleteAuthUser.cjs <email>');
    console.log('Example: node scripts/deleteAuthUser.cjs user@example.com\n');
    process.exit(1);
  }

  try {
    console.log(`🔍 Looking up Firebase Auth user: ${email}...`);

    // Get user by email from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    const userId = userRecord.uid;

    console.log(`✓ Found Firebase Auth account with UID: ${userId}`);

    // Check if Firestore document exists
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('\n📋 User Details (from Firestore):');
      console.log('─'.repeat(50));
      console.log(`Email:        ${userData.email}`);
      console.log(`Agency:       ${userData.agencyName}`);
      console.log(`Ministry:     ${userData.ministryType}`);
      console.log(`Role:         ${userData.role}`);
      console.log('─'.repeat(50));
      console.log('\n⚠️  This account has both Auth and Firestore data.');
      console.log('Deleting both...\n');
    } else {
      console.log('\n⚠️  ORPHANED ACCOUNT DETECTED!');
      console.log('This account exists in Firebase Auth but has no Firestore document.');
      console.log('This usually happens when registration failed partway through.\n');
    }

    console.log('⚠️  WARNING: This action cannot be undone!\n');

    // Delete from Firestore if exists
    if (userDoc.exists) {
      console.log('🗑️  Deleting Firestore document...');
      await db.collection('users').doc(userId).delete();
      console.log('✓ Firestore document deleted');
    } else {
      console.log('⏭️  No Firestore document to delete (orphaned account)');
    }

    // Delete from Firebase Auth
    console.log('🗑️  Deleting Firebase Auth account...');
    await auth.deleteUser(userId);
    console.log('✓ Firebase Auth account deleted');

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   ✅ ACCOUNT DELETED SUCCESSFULLY                 ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log(`Account ${email} has been removed from the system.`);
    console.log('You can now register this email again.\n');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error('\n❌ Error: No Firebase Auth account found with that email address.');
      console.log('This email is not registered in the system.\n');
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
deleteAuthUser(email);
