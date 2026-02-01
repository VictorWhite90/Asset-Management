/**
 * Fix User Custom Claims
 *
 * This script checks and fixes custom claims for a user who should be verified
 * but whose claims might not have been set correctly.
 *
 * Usage: node scripts/fixUserClaims.cjs <userId>
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixUserClaims(userId) {
  console.log(`\nChecking user: ${userId}`);
  console.log('='.repeat(50));

  try {
    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.error('❌ User not found in Firestore');
      return;
    }

    const userData = userDoc.data();
    console.log('\n📋 User Data from Firestore:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Account Status: ${userData.accountStatus}`);
    console.log(`   Ministry ID: ${userData.ministryId || 'NOT SET'}`);
    console.log(`   UUID: ${userData.uuid || 'NOT SET'}`);

    // Check current custom claims
    const authUser = await admin.auth().getUser(userId);
    console.log('\n🔐 Current Custom Claims:');
    console.log(`   ${JSON.stringify(authUser.customClaims || {})}`);

    // Check if claims need to be fixed
    const currentClaims = authUser.customClaims || {};
    const expectedRole = userData.role;
    const expectedMinistryId = userData.ministryId;

    const needsFix =
      currentClaims.role !== expectedRole ||
      currentClaims.ministryId !== expectedMinistryId;

    if (!needsFix) {
      console.log('\n✅ Custom claims are correct! No fix needed.');
      return;
    }

    // Fix the claims
    console.log('\n⚠️  Claims mismatch detected! Fixing...');

    const newClaims = {
      role: expectedRole,
      ministryId: expectedMinistryId,
    };

    await admin.auth().setCustomUserClaims(userId, newClaims);

    console.log('\n✅ Custom claims updated successfully!');
    console.log(`   New claims: ${JSON.stringify(newClaims)}`);
    console.log('\n📌 IMPORTANT: The user must log out and log back in to get the new claims.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node scripts/fixUserClaims.cjs <userId>');
  console.log('\nTo find the userId, check the Firebase Auth console or run:');
  console.log('  node scripts/listUsers.cjs');
  process.exit(1);
}

fixUserClaims(userId).then(() => {
  console.log('\nDone!');
  process.exit(0);
});
