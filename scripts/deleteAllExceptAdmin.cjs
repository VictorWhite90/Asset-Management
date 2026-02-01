/**
 * Delete All Users Except Federal Admin
 *
 * This script deletes all users from both Firestore and Firebase Auth,
 * except users with the 'admin' role (Federal Admins).
 *
 * Usage: node scripts/deleteAllExceptAdmin.cjs
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Prompt user for confirmation
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Delete all users except federal admins
 */
async function deleteAllExceptAdmin() {
  console.log('\n🚨 WARNING: This will delete ALL users except Federal Admins! 🚨\n');

  try {
    // Step 1: Get all users from Firestore
    console.log('📋 Fetching all users from Firestore...');
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('✅ No users found in Firestore.');
      return;
    }

    // Step 2: Filter users (exclude admins)
    const usersToDelete = [];
    const adminsToKeep = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.role === 'admin') {
        adminsToKeep.push({
          id: doc.id,
          email: userData.email,
          name: userData.name || userData.agencyName,
        });
      } else {
        usersToDelete.push({
          id: doc.id,
          email: userData.email,
          role: userData.role,
          name: userData.name || userData.agencyName,
        });
      }
    });

    // Step 3: Display summary
    console.log('\n📊 Summary:');
    console.log(`   Total users: ${usersSnapshot.size}`);
    console.log(`   Federal Admins to KEEP: ${adminsToKeep.length}`);
    console.log(`   Users to DELETE: ${usersToDelete.length}\n`);

    if (adminsToKeep.length > 0) {
      console.log('✅ Federal Admins that will be KEPT:');
      adminsToKeep.forEach((admin) => {
        console.log(`   - ${admin.email} (${admin.name})`);
      });
      console.log('');
    }

    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete. Only Federal Admins exist.');
      return;
    }

    console.log('❌ Users that will be DELETED:');
    usersToDelete.slice(0, 10).forEach((user) => {
      console.log(`   - ${user.email} (${user.role}) - ${user.name}`);
    });
    if (usersToDelete.length > 10) {
      console.log(`   ... and ${usersToDelete.length - 10} more`);
    }
    console.log('');

    // Step 4: Ask for confirmation
    const confirmed = await askConfirmation(
      `Are you sure you want to DELETE ${usersToDelete.length} users? (yes/no): `
    );

    if (!confirmed) {
      console.log('❌ Operation cancelled by user.');
      return;
    }

    // Step 5: Delete users
    console.log(`\n🗑️  Deleting ${usersToDelete.length} users...`);
    let deletedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const user of usersToDelete) {
      try {
        // Delete from Firestore
        await db.collection('users').doc(user.id).delete();

        // Delete from Firebase Auth
        try {
          await auth.deleteUser(user.id);
        } catch (authError) {
          // User might not exist in Auth, that's okay
          if (authError.code !== 'auth/user-not-found') {
            console.warn(`   ⚠️  Auth deletion failed for ${user.email}: ${authError.message}`);
          }
        }

        deletedCount++;
        if (deletedCount % 10 === 0) {
          console.log(`   Deleted ${deletedCount}/${usersToDelete.length} users...`);
        }
      } catch (error) {
        failedCount++;
        errors.push({ email: user.email, error: error.message });
        console.error(`   ❌ Failed to delete ${user.email}: ${error.message}`);
      }
    }

    // Step 6: Display results
    console.log('\n✅ Deletion complete!');
    console.log(`   Successfully deleted: ${deletedCount} users`);
    console.log(`   Federal Admins kept: ${adminsToKeep.length}`);

    if (failedCount > 0) {
      console.log(`   Failed deletions: ${failedCount}`);
      console.log('\n❌ Errors:');
      errors.forEach((err) => {
        console.log(`   - ${err.email}: ${err.error}`);
      });
    }

    console.log('\n🎉 All non-admin users have been deleted!');

    // Step 7: Sync ministry status
    console.log('\n🔄 Syncing ministry status...');
    const { execSync } = require('child_process');
    try {
      execSync('node scripts/syncMinistryStatus.cjs', { stdio: 'inherit' });
    } catch (syncError) {
      console.warn('⚠️  Ministry sync failed, but user deletion completed');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
deleteAllExceptAdmin()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
