/**
 * Check Ministries in Database
 * Lists all ministries and their status
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

async function checkMinistries() {
  try {
    console.log('\n📋 Checking ministries in database...\n');

    // Get all ministries
    const ministriesSnapshot = await db.collection('ministries').get();

    if (ministriesSnapshot.empty) {
      console.log('❌ No ministries found in database!\n');
      return;
    }

    console.log(`✅ Found ${ministriesSnapshot.size} ministries:\n`);

    ministriesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Ministry ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Official Email: ${data.officialEmail}`);
      console.log(`  Owner ID: ${data.ownerId}`);
      console.log(`  Owner Email: ${data.ownerEmail}`);
      console.log(`  Created At: ${data.createdAt?.toDate()}`);
      console.log('---');
    });

    // Check verified ministries specifically
    const verifiedSnapshot = await db
      .collection('ministries')
      .where('status', '==', 'verified')
      .get();

    console.log(`\n✅ Verified ministries: ${verifiedSnapshot.size}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkMinistries()
  .then(() => {
    console.log('\n✅ Check complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
