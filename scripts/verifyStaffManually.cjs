/**
 * Manually Verify Staff
 *
 * This script fully verifies a staff member who should have been approved
 * but whose verification didn't complete properly.
 *
 * Usage: node scripts/verifyStaffManually.cjs <userId>
 */

const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function verifyStaff(userId) {
  console.log(`\nVerifying staff: ${userId}`);
  console.log('='.repeat(50));

  try {
    // Get user document from Firestore
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error('❌ User not found in Firestore');
      return;
    }

    const userData = userDoc.data();
    console.log('\n📋 Current User Data:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Account Status: ${userData.accountStatus}`);
    console.log(`   Ministry ID: ${userData.ministryId || 'NOT SET'}`);
    console.log(`   UUID: ${userData.uuid || 'NOT SET'}`);

    // Check if already verified
    if (userData.accountStatus === 'verified' && userData.uuid) {
      console.log('\n✅ User is already verified!');
      return;
    }

    // Generate UUID if not set
    const uuid = userData.uuid || uuidv4();

    // Update user document
    await userRef.update({
      accountStatus: 'verified',
      uuid: uuid,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: 'manual_fix_script',
    });

    console.log('\n✅ User document updated:');
    console.log(`   Account Status: verified`);
    console.log(`   UUID: ${uuid}`);

    // Set custom claims
    const newClaims = {
      role: userData.role,
      ministryId: userData.ministryId,
    };

    await admin.auth().setCustomUserClaims(userId, newClaims);
    console.log(`   Custom Claims: ${JSON.stringify(newClaims)}`);

    // Update ministry document if applicable
    if (userData.ministryId) {
      const ministryRef = db.collection('ministries').doc(userData.ministryId);
      const ministryDoc = await ministryRef.get();

      if (ministryDoc.exists) {
        const updateData = {};

        if (userData.role === 'agency') {
          updateData.uploaders = admin.firestore.FieldValue.arrayUnion(userId);
          updateData.hasUploader = true;
        } else if (userData.role === 'agency-approver') {
          updateData.approvers = admin.firestore.FieldValue.arrayUnion(userId);
          updateData.hasApprover = true;
        }

        if (Object.keys(updateData).length > 0) {
          await ministryRef.update(updateData);
          console.log(`   Ministry updated with new staff member`);
        }
      }
    }

    console.log('\n📌 IMPORTANT: The user must log out and log back in to get the new claims.');
    console.log(`\n📋 Staff UUID (save this): ${uuid}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node scripts/verifyStaffManually.cjs <userId>');
  console.log('\nTo find the userId, check:');
  console.log('  node scripts/listUsers.cjs');
  process.exit(1);
}

verifyStaff(userId).then(() => {
  console.log('\nDone!');
  process.exit(0);
});
