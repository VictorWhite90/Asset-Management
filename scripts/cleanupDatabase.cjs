/**
 * Firebase Cleanup Script
 * Deletes all users and their associated data
 *
 * USAGE: node scripts/cleanupDatabase.cjs
 *
 * WARNING: This will permanently delete:
 * - All user documents from Firestore
 * - All asset documents from Firestore
 * - All audit log documents from Firestore
 * - All user accounts from Firebase Authentication
 */

require('dotenv').config();
const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents from batch`);

    // Recurse on the next process tick to avoid exploding the stack
    process.nextTick(() => {
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

async function deleteAllAuthUsers() {
  let totalDeleted = 0;
  let nextPageToken;

  do {
    try {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);

      const deletePromises = listUsersResult.users.map(user =>
        auth.deleteUser(user.uid)
          .then(() => {
            totalDeleted++;
            console.log(`Deleted user: ${user.email} (${user.uid})`);
          })
          .catch(error => {
            console.error(`Error deleting user ${user.uid}:`, error.message);
          })
      );

      await Promise.all(deletePromises);
      nextPageToken = listUsersResult.pageToken;
    } catch (error) {
      console.error('Error listing users:', error);
      break;
    }
  } while (nextPageToken);

  return totalDeleted;
}

async function getCollectionCount(collectionPath) {
  const snapshot = await db.collection(collectionPath).count().get();
  return snapshot.data().count;
}

async function listAllUsers() {
  console.log('\n📊 Current Users in System:\n');
  console.log('═'.repeat(80));

  const usersSnapshot = await db.collection('users').get();

  if (usersSnapshot.empty) {
    console.log('No users found in Firestore.');
    return 0;
  }

  usersSnapshot.forEach((doc, index) => {
    const user = doc.data();
    console.log(`\n${index + 1}. Email: ${user.email}`);
    console.log(`   Agency: ${user.agencyName}`);
    console.log(`   Ministry Type: ${user.ministryType}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Email Verified: ${user.emailVerified ? '✓' : '✗'}`);
    console.log(`   Region: ${user.region}`);
    console.log(`   User ID: ${user.userId}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\nTotal Users: ${usersSnapshot.size}`);

  return usersSnapshot.size;
}

async function showStatistics() {
  console.log('\n📊 Database Statistics:\n');
  console.log('═'.repeat(50));

  try {
    const usersCount = await getCollectionCount('users');
    const assetsCount = await getCollectionCount('assets');
    const auditLogsCount = await getCollectionCount('auditLogs');

    console.log(`Users:      ${usersCount}`);
    console.log(`Assets:     ${assetsCount}`);
    console.log(`Audit Logs: ${auditLogsCount}`);
    console.log('═'.repeat(50));
  } catch (error) {
    console.error('Error getting statistics:', error);
  }
}

async function cleanup() {
  console.log('\n🇳🇬 Nigeria Asset Management - Database Cleanup Tool\n');

  await showStatistics();
  await listAllUsers();

  rl.question('\n⚠️  WARNING: This will DELETE ALL data. Are you sure? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Cleanup cancelled.');
      rl.close();
      process.exit(0);
      return;
    }

    try {
      console.log('\n🗑️  Starting cleanup...\n');

      // Delete Firestore collections
      console.log('📦 Deleting users collection...');
      await deleteCollection('users');
      console.log('✓ Users collection deleted');

      console.log('📦 Deleting assets collection...');
      await deleteCollection('assets');
      console.log('✓ Assets collection deleted');

      console.log('📦 Deleting auditLogs collection...');
      await deleteCollection('auditLogs');
      console.log('✓ Audit logs collection deleted');

      // Delete Authentication users
      console.log('\n🔐 Deleting Firebase Authentication users...');
      const deletedCount = await deleteAllAuthUsers();
      console.log(`✓ Deleted ${deletedCount} authentication users`);

      console.log('\n✅ Cleanup completed successfully!\n');

      await showStatistics();

    } catch (error) {
      console.error('\n❌ Error during cleanup:', error);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Cleanup cancelled by user');
  rl.close();
  process.exit(0);
});

cleanup();
