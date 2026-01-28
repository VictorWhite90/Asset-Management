const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const ADMIN_EMAIL = 'victorwhite590@gmail.com'; // Email to keep

async function completeCleanup() {
  try {
    console.log('🧹 Starting complete cleanup...\n');

    // ============================================================================
    // 1. DELETE ALL USERS EXCEPT ADMIN
    // ============================================================================
    console.log('👥 Deleting users...');
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;

    let deletedUsers = 0;
    for (const user of users) {
      if (user.email === ADMIN_EMAIL) {
        console.log(`   ⏭️  Keeping admin: ${user.email}`);
        continue;
      }

      try {
        await admin.auth().deleteUser(user.uid);
        await admin.firestore().collection('users').doc(user.uid).delete();
        console.log(`   ✅ Deleted user: ${user.email || user.uid}`);
        deletedUsers++;
      } catch (error) {
        console.error(`   ❌ Error deleting ${user.email || user.uid}:`, error.message);
      }
    }

    // ============================================================================
    // 2. DELETE ALL MINISTRIES
    // ============================================================================
    console.log('\n🏛️  Deleting ministries...');
    const ministriesSnapshot = await admin.firestore().collection('ministries').get();
    let deletedMinistries = 0;

    for (const doc of ministriesSnapshot.docs) {
      try {
        await doc.ref.delete();
        console.log(`   ✅ Deleted ministry: ${doc.data().name}`);
        deletedMinistries++;
      } catch (error) {
        console.error(`   ❌ Error deleting ministry ${doc.id}:`, error.message);
      }
    }

    // ============================================================================
    // 3. DELETE ALL ASSETS
    // ============================================================================
    console.log('\n📦 Deleting assets...');
    const assetsSnapshot = await admin.firestore().collection('assets').get();
    let deletedAssets = 0;

    for (const doc of assetsSnapshot.docs) {
      try {
        await doc.ref.delete();
        console.log(`   ✅ Deleted asset: ${doc.data().assetName || doc.id}`);
        deletedAssets++;
      } catch (error) {
        console.error(`   ❌ Error deleting asset ${doc.id}:`, error.message);
      }
    }

    // ============================================================================
    // 4. DELETE AUDIT LOGS (OPTIONAL)
    // ============================================================================
    console.log('\n📋 Deleting audit logs...');
    const auditLogsSnapshot = await admin.firestore().collection('auditLogs').get();
    let deletedAuditLogs = 0;

    for (const doc of auditLogsSnapshot.docs) {
      try {
        await doc.ref.delete();
        deletedAuditLogs++;
      } catch (error) {
        console.error(`   ❌ Error deleting audit log ${doc.id}:`, error.message);
      }
    }
    console.log(`   ✅ Deleted ${deletedAuditLogs} audit logs`);

    // ============================================================================
    // 5. DELETE NOTIFICATIONS (OPTIONAL)
    // ============================================================================
    console.log('\n🔔 Deleting notifications...');
    const notificationsSnapshot = await admin.firestore().collection('notifications').get();
    let deletedNotifications = 0;

    for (const doc of notificationsSnapshot.docs) {
      try {
        await doc.ref.delete();
        deletedNotifications++;
      } catch (error) {
        console.error(`   ❌ Error deleting notification ${doc.id}:`, error.message);
      }
    }
    console.log(`   ✅ Deleted ${deletedNotifications} notifications`);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Users deleted:         ${deletedUsers}`);
    console.log(`   Ministries deleted:    ${deletedMinistries}`);
    console.log(`   Assets deleted:        ${deletedAssets}`);
    console.log(`   Audit logs deleted:    ${deletedAuditLogs}`);
    console.log(`   Notifications deleted: ${deletedNotifications}`);
    console.log('='.repeat(60));
    console.log('\n✨ Cleanup complete! Your database is now fresh.');
    console.log(`\n👤 Admin account preserved: ${ADMIN_EMAIL}\n`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

completeCleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
