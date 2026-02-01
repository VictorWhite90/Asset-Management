/**
 * Check Recent Audit Logs
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

async function checkAuditLogs() {
  try {
    console.log('\n📋 Checking recent audit logs...\n');

    // Get recent logs
    const logsSnapshot = await db
      .collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    if (logsSnapshot.empty) {
      console.log('❌ No audit logs found!\n');
      return;
    }

    console.log(`✅ Found ${logsSnapshot.size} recent logs:\n`);

    logsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Action: ${data.action}`);
      console.log(`  User: ${data.userEmail} (${data.userRole})`);
      console.log(`  Details: ${data.details}`);
      console.log(`  Resource: ${data.resourceType} - ${data.resourceId}`);
      console.log(`  Time: ${data.timestamp?.toDate()}`);
      if (data.metadata) {
        console.log(`  Metadata: ${JSON.stringify(data.metadata, null, 2)}`);
      }
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAuditLogs()
  .then(() => {
    console.log('\n✅ Check complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
