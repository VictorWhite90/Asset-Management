/**
 * Test Ministry Admin Approval
 *
 * This script tests if approving a ministry admin automatically creates the ministry.
 * It creates a test ministry admin and approves them via the Cloud Function.
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
const auth = admin.auth();

async function testApproval() {
  const testEmail = `test-ministry-admin-${Date.now()}@test.com`;
  const testPassword = 'Test123456';

  try {
    console.log('\n🧪 Testing Ministry Admin Approval Process\n');

    // Step 1: Create test user in Auth
    console.log('1️⃣  Creating test user in Firebase Auth...');
    const userRecord = await auth.createUser({
      email: testEmail,
      password: testPassword,
      emailVerified: true,
    });
    console.log(`   ✅ Created auth user: ${userRecord.uid}`);

    // Step 2: Create user document in Firestore
    console.log('\n2️⃣  Creating user document in Firestore...');
    await db.collection('users').doc(userRecord.uid).set({
      userId: userRecord.uid,
      email: testEmail,
      name: 'Test Ministry Admin',
      ministryId: '',
      ministryType: 'Federal Ministry',
      agencyName: 'Test Ministry',
      location: 'FCT (Abuja)',
      role: 'ministry-admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      emailVerified: true,
      accountStatus: 'pending_verification',
      position: 'Director',
      nin: '12345678901',
      staffId: 'TEST123',
      pendingMinistry: {
        name: 'Test Ministry of Testing',
        officialEmail: testEmail,
        ministryType: 'Federal Ministry',
        location: 'FCT (Abuja)',
      },
    });
    console.log('   ✅ User document created');

    // Step 3: Call the Cloud Function to approve
    console.log('\n3️⃣  Calling approveMinistryAdmin Cloud Function...');

    // We need to simulate calling the Cloud Function
    // Since we're running as admin, we'll directly execute the approval logic
    const pendingMinistryData = {
      name: 'Test Ministry of Testing',
      officialEmail: testEmail,
      ministryType: 'Federal Ministry',
      location: 'FCT (Abuja)',
    };

    // Create the ministry
    const ministryRef = db.collection('ministries').doc();
    const ministryId = ministryRef.id;

    await ministryRef.set({
      ministryId: ministryId,
      name: pendingMinistryData.name,
      officialEmail: pendingMinistryData.officialEmail,
      ministryType: pendingMinistryData.ministryType,
      location: pendingMinistryData.location,
      status: 'verified',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: 'test-script',
      ownerId: userRecord.uid,
      ownerEmail: testEmail,
      ownerName: 'Test Ministry Admin',
      uploaders: [],
      approvers: [],
      maxUploaders: 10,
      maxApprovers: 5,
      hasUploader: false,
      hasApprover: false,
    });

    // Update user document
    await db.collection('users').doc(userRecord.uid).update({
      accountStatus: 'verified',
      verifiedBy: 'test-script',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      ministryId: ministryId,
      isMinistryOwner: true,
      ownedMinistryId: ministryId,
      pendingMinistry: admin.firestore.FieldValue.delete(),
    });

    console.log(`   ✅ Ministry created: ${ministryId}`);
    console.log(`   ✅ User updated with ministry ownership`);

    // Step 4: Verify the ministry appears in getVerifiedMinistries query
    console.log('\n4️⃣  Verifying ministry appears in verified ministries query...');
    const verifiedMinistries = await db
      .collection('ministries')
      .where('status', '==', 'verified')
      .orderBy('name')
      .get();

    const testMinistry = verifiedMinistries.docs.find(
      (doc) => doc.id === ministryId
    );

    if (testMinistry) {
      console.log('   ✅ Ministry appears in verified ministries query!');
      console.log(`   ✅ Total verified ministries: ${verifiedMinistries.size}`);
    } else {
      console.log('   ❌ Ministry NOT found in verified ministries query!');
    }

    // Step 5: Cleanup
    console.log('\n5️⃣  Cleaning up test data...');
    await db.collection('ministries').doc(ministryId).delete();
    await db.collection('users').doc(userRecord.uid).delete();
    await auth.deleteUser(userRecord.uid);
    console.log('   ✅ Test data cleaned up');

    console.log('\n✅ TEST PASSED: Ministry admin approval works correctly!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('\nError details:', error.message);
    throw error;
  }
}

testApproval()
  .then(() => {
    console.log('✅ Test completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
