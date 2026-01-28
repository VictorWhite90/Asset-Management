const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const ADMIN_EMAIL = 'victorwhite590@gmail.com'; // Email to keep

async function deleteUsersExceptAdmin() {
  try {
    console.log('🔍 Fetching all users...\n');

    // Get all users
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;

    console.log(`Found ${users.length} total users\n`);

    let deletedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (user.email === ADMIN_EMAIL) {
        console.log(`⏭️  Skipping admin: ${user.email}`);
        skippedCount++;
        continue;
      }

      try {
        // Delete from Authentication
        await admin.auth().deleteUser(user.uid);

        // Delete from Firestore users collection
        await admin.firestore().collection('users').doc(user.uid).delete();

        console.log(`✅ Deleted: ${user.email || user.uid}`);
        deletedCount++;

      } catch (error) {
        console.error(`❌ Error deleting ${user.email || user.uid}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Deleted: ${deletedCount}`);
    console.log(`   Kept (admin): ${skippedCount}`);
    console.log('\n✨ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

deleteUsersExceptAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
