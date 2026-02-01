/**
 * Cleanup Test Accounts Script
 *
 * Deletes all user accounts EXCEPT the admin account for testing purposes.
 * Also cleans up associated ministry role assignments.
 *
 * DANGER: This will permanently delete user accounts and their data!
 *
 * Run with: node scripts/cleanupTestAccounts.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// Constants
const USERS_COLLECTION = 'users';
const MINISTRIES_COLLECTION = 'ministries';

/**
 * Delete a user from both Firebase Auth and Firestore
 */
async function deleteUser(userId, userEmail, userRole) {
  try {
    console.log(`\n🗑️  Deleting user: ${userEmail} (${userRole})`);

    // 1. Get user document to find ministry
    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
    const userData = userDoc.data();

    if (userData && userData.ministryId) {
      // 2. Remove user from ministry's role arrays
      const ministryRef = db.collection(MINISTRIES_COLLECTION).doc(userData.ministryId);
      const ministryDoc = await ministryRef.get();

      if (ministryDoc.exists) {
        const updateData = {};

        if (userRole === 'agency') {
          updateData.uploaders = admin.firestore.FieldValue.arrayRemove(userId);
          console.log(`   ✓ Removed from ministry uploaders`);
        } else if (userRole === 'agency-approver') {
          updateData.approvers = admin.firestore.FieldValue.arrayRemove(userId);
          console.log(`   ✓ Removed from ministry approvers`);
        }

        if (Object.keys(updateData).length > 0) {
          await ministryRef.update(updateData);
        }
      }
    }

    // 3. Delete from Firestore
    await db.collection(USERS_COLLECTION).doc(userId).delete();
    console.log(`   ✓ Deleted from Firestore`);

    // 4. Delete from Firebase Auth
    try {
      await auth.deleteUser(userId);
      console.log(`   ✓ Deleted from Firebase Auth`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log(`   ℹ️  User not found in Firebase Auth (already deleted)`);
      } else {
        throw authError;
      }
    }

    console.log(`   ✅ User deleted successfully`);
    return { success: true, email: userEmail };
  } catch (error) {
    console.error(`   ❌ Error deleting user ${userEmail}:`, error.message);
    return { success: false, email: userEmail, error: error.message };
  }
}

/**
 * Main cleanup function
 */
async function cleanupTestAccounts() {
  console.log('🚀 Starting Test Accounts Cleanup...\n');
  console.log('================================================');
  console.log('This will DELETE all user accounts EXCEPT admin');
  console.log('⚠️  WARNING: This action is IRREVERSIBLE!');
  console.log('================================================\n');

  // Wait 3 seconds to allow user to cancel
  console.log('Starting in 3 seconds... Press Ctrl+C to cancel\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // 1. Fetch all users from Firestore
    console.log('📥 Fetching users from Firestore...');
    const usersSnapshot = await db.collection(USERS_COLLECTION).get();
    const totalUsers = usersSnapshot.size;

    console.log(`Found ${totalUsers} users\n`);

    if (totalUsers === 0) {
      console.log('No users found. Nothing to delete.');
      return;
    }

    // 2. Identify admin users (DO NOT DELETE)
    const adminUsers = [];
    const nonAdminUsers = [];

    usersSnapshot.docs.forEach((doc) => {
      const user = { userId: doc.id, ...doc.data() };
      if (user.role === 'admin') {
        adminUsers.push(user);
      } else {
        nonAdminUsers.push(user);
      }
    });

    console.log(`👤 Admin users (will be KEPT): ${adminUsers.length}`);
    adminUsers.forEach((user) => {
      console.log(`   - ${user.email} (${user.role})`);
    });

    console.log(`\n👥 Non-admin users (will be DELETED): ${nonAdminUsers.length}`);
    nonAdminUsers.forEach((user) => {
      console.log(`   - ${user.email} (${user.role})`);
    });

    if (nonAdminUsers.length === 0) {
      console.log('\nNo non-admin users to delete. Exiting.');
      return;
    }

    console.log(`\n⚠️  About to delete ${nonAdminUsers.length} users...`);
    console.log('Waiting 2 seconds... Press Ctrl+C to cancel\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Delete non-admin users
    const results = {
      deleted: [],
      failed: [],
    };

    for (const user of nonAdminUsers) {
      const result = await deleteUser(user.userId, user.email, user.role);
      if (result.success) {
        results.deleted.push(result.email);
      } else {
        results.failed.push({ email: result.email, error: result.error });
      }
    }

    // 4. Print summary
    console.log('\n================================================');
    console.log('📊 CLEANUP SUMMARY');
    console.log('================================================');
    console.log(`Total users before: ${totalUsers}`);
    console.log(`Admin users (kept): ${adminUsers.length}`);
    console.log(`✅ Successfully deleted: ${results.deleted.length}`);
    console.log(`❌ Failed to delete: ${results.failed.length}`);
    console.log(`Remaining users: ${adminUsers.length + results.failed.length}`);

    if (results.deleted.length > 0) {
      console.log('\n✅ Deleted users:');
      results.deleted.forEach((email) => console.log(`   - ${email}`));
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed deletions:');
      results.failed.forEach((item) => console.log(`   - ${item.email}: ${item.error}`));
    }

    console.log('\n✅ Cleanup completed!');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    throw error;
  } finally {
    // Close the admin app
    await admin.app().delete();
  }
}

// Run cleanup
cleanupTestAccounts()
  .then(() => {
    console.log('\n✅ All done! Admin accounts preserved.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
