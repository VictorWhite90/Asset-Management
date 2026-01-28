/**
 * Delete All Users Script
 * This script deletes all user documents from Firestore and optionally Firebase Auth
 *
 * Usage: node scripts/deleteAllUsers.cjs
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt user for confirmation
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

async function deleteAllFirestoreUsers() {
  console.log('\n🔍 Fetching all user documents from Firestore...');

  const usersSnapshot = await db.collection('users').get();
  const userCount = usersSnapshot.size;

  if (userCount === 0) {
    console.log('✅ No users found in Firestore.');
    return [];
  }

  console.log(`📊 Found ${userCount} user document(s) in Firestore.`);

  // Show user details
  console.log('\n📋 Users to be deleted:');
  const userIds = [];
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    console.log(`  - ${userData.email} (${userData.role}) - ${userData.agencyName}`);
    userIds.push(doc.id);
  });

  const answer = await askQuestion(`\n⚠️  Delete all ${userCount} Firestore user documents? (yes/no): `);

  if (answer !== 'yes') {
    console.log('❌ Operation cancelled.');
    return [];
  }

  // Delete all user documents
  console.log('\n🗑️  Deleting Firestore user documents...');
  const batch = db.batch();
  usersSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`✅ Deleted ${userCount} user document(s) from Firestore.`);

  return userIds;
}

async function deleteAllAuthUsers() {
  console.log('\n🔍 Fetching all users from Firebase Authentication...');

  let allUsers = [];
  let nextPageToken;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    allUsers = allUsers.concat(listUsersResult.users);
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  const authUserCount = allUsers.length;

  if (authUserCount === 0) {
    console.log('✅ No users found in Firebase Authentication.');
    return;
  }

  console.log(`📊 Found ${authUserCount} user(s) in Firebase Authentication.`);

  // Show user details
  console.log('\n📋 Auth users to be deleted:');
  allUsers.forEach((user) => {
    console.log(`  - ${user.email} (UID: ${user.uid})`);
  });

  const answer = await askQuestion(`\n⚠️  Delete all ${authUserCount} Firebase Auth users? (yes/no): `);

  if (answer !== 'yes') {
    console.log('❌ Firebase Auth deletion cancelled.');
    return;
  }

  // Delete all auth users
  console.log('\n🗑️  Deleting Firebase Auth users...');
  let deletedCount = 0;

  for (const user of allUsers) {
    try {
      await auth.deleteUser(user.uid);
      deletedCount++;
      if (deletedCount % 10 === 0) {
        console.log(`   Progress: ${deletedCount}/${authUserCount} deleted...`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to delete ${user.email}:`, error.message);
    }
  }

  console.log(`✅ Deleted ${deletedCount} user(s) from Firebase Authentication.`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   🗑️  DELETE ALL USERS - CLEANUP SCRIPT           ║');
  console.log('║   Nigeria Government Asset Management System      ║');
  console.log('╚════════════════════════════════════════════════════╝');

  console.log('\n⚠️  WARNING: This will delete ALL users from:');
  console.log('   1. Firestore (users collection)');
  console.log('   2. Firebase Authentication');
  console.log('\n   This action CANNOT be undone!\n');

  const confirmStart = await askQuestion('Do you want to continue? (yes/no): ');

  if (confirmStart !== 'yes') {
    console.log('\n❌ Operation cancelled. No changes were made.');
    rl.close();
    process.exit(0);
  }

  try {
    // Step 1: Delete Firestore users
    await deleteAllFirestoreUsers();

    // Step 2: Delete Firebase Auth users
    await deleteAllAuthUsers();

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   ✅ CLEANUP COMPLETE                             ║');
    console.log('║   All users have been deleted successfully!       ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the script
main();
