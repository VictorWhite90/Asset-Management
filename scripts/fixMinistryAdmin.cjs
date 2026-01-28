/**
 * Fix Ministry Admin - Create Missing Ministry
 *
 * This script fixes a ministry admin whose approval didn't complete properly.
 * It creates the ministry from their pendingMinistry data and updates their user document.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixMinistryAdmin() {
  try {
    const ministryAdminEmail = 'victorwhite590@gmail.com';

    console.log(`\n🔧 Fixing ministry admin: ${ministryAdminEmail}\n`);

    // Get the ministry admin user
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', ministryAdminEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log('❌ Ministry admin not found!');
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log('✅ Found ministry admin:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Account Status: ${userData.accountStatus}`);
    console.log(`   Has Pending Ministry: ${!!userData.pendingMinistry}\n`);

    // Check if they already have a ministry
    if (userData.ownedMinistryId && userData.isMinistryOwner) {
      console.log('✅ Ministry admin already has a ministry. Checking...');

      const ministryDoc = await db.collection('ministries').doc(userData.ownedMinistryId).get();
      if (ministryDoc.exists) {
        const ministryData = ministryDoc.data();
        console.log(`   Ministry: ${ministryData.name}`);
        console.log(`   Status: ${ministryData.status}`);

        if (ministryData.status !== 'verified') {
          console.log('\n🔧 Updating ministry status to verified...');
          await db.collection('ministries').doc(userData.ownedMinistryId).update({
            status: 'verified',
          });
          console.log('✅ Ministry status updated to verified!');
        } else {
          console.log('✅ Ministry is already verified!');
        }
        return;
      }
    }

    // Check for pending ministry data
    if (!userData.pendingMinistry) {
      console.log('❌ No pending ministry data found! Cannot create ministry.');
      return;
    }

    const pendingMinistry = userData.pendingMinistry;
    console.log('📋 Pending Ministry Data:');
    console.log(`   Name: ${pendingMinistry.name}`);
    console.log(`   Official Email: ${pendingMinistry.officialEmail}`);
    console.log(`   Type: ${pendingMinistry.ministryType}`);
    console.log(`   Location: ${pendingMinistry.location}\n`);

    // Create the ministry
    console.log('🏛️  Creating ministry...');
    const ministryRef = db.collection('ministries').doc();
    const ministryId = ministryRef.id;

    await ministryRef.set({
      ministryId: ministryId,
      name: pendingMinistry.name,
      officialEmail: pendingMinistry.officialEmail,
      ministryType: pendingMinistry.ministryType,
      location: pendingMinistry.location,
      status: 'verified',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: 'auto-fix-script',
      ownerId: userId,
      ownerEmail: userData.email,
      ownerName: userData.name || userData.agencyName,
      uploaders: [],
      approvers: [],
      maxUploaders: 10,
      maxApprovers: 5,
      hasUploader: false,
      hasApprover: false,
    });

    console.log(`✅ Ministry created with ID: ${ministryId}\n`);

    // Update user document
    console.log('👤 Updating user document...');
    await db.collection('users').doc(userId).update({
      ministryId: ministryId,
      isMinistryOwner: true,
      ownedMinistryId: ministryId,
      pendingMinistry: admin.firestore.FieldValue.delete(),
    });

    console.log('✅ User document updated!\n');

    console.log('🎉 Fix complete!');
    console.log(`   Ministry: ${pendingMinistry.name}`);
    console.log(`   Ministry ID: ${ministryId}`);
    console.log(`   Status: verified\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

fixMinistryAdmin()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
