/**
 * Check Ministry Admins in Database
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

async function checkMinistryAdmins() {
  try {
    console.log('\n📋 Checking ministry admins in database...\n');

    // Get all ministry admins
    const usersSnapshot = await db
      .collection('users')
      .where('role', '==', 'ministry-admin')
      .get();

    if (usersSnapshot.empty) {
      console.log('❌ No ministry admins found!\n');
      return;
    }

    console.log(`✅ Found ${usersSnapshot.size} ministry admin(s):\n`);

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`User ID: ${doc.id}`);
      console.log(`  Email: ${data.email}`);
      console.log(`  Name: ${data.name || data.agencyName}`);
      console.log(`  Account Status: ${data.accountStatus}`);
      console.log(`  Is Ministry Owner: ${data.isMinistryOwner}`);
      console.log(`  Owned Ministry ID: ${data.ownedMinistryId}`);
      console.log(`  Ministry ID: ${data.ministryId}`);
      console.log(`  Pending Ministry: ${data.pendingMinistry ? JSON.stringify(data.pendingMinistry, null, 2) : 'None'}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkMinistryAdmins()
  .then(() => {
    console.log('\n✅ Check complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
