/**
 * List All Users Script
 * Displays all registered users in the system
 *
 * USAGE: node scripts/listUsers.cjs
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listAllUsers() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   📋 ALL REGISTERED USERS                         ║');
  console.log('║   Nigeria Government Asset Management System      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    console.log('🔍 Fetching all users from Firestore...\n');

    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('ℹ️  No users found in the system.\n');
      process.exit(0);
    }

    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({
        userId: doc.id,
        ...doc.data()
      });
    });

    // Sort by role (admin first, then agency-approver, then agency)
    const roleOrder = { 'admin': 1, 'agency-approver': 2, 'agency': 3 };
    users.sort((a, b) => {
      const roleComparison = (roleOrder[a.role] || 999) - (roleOrder[b.role] || 999);
      if (roleComparison !== 0) return roleComparison;
      return a.email.localeCompare(b.email);
    });

    console.log(`Found ${users.length} user(s):\n`);
    console.log('═'.repeat(120));

    users.forEach((user, index) => {
      const roleEmoji = user.role === 'admin' ? '👑' : user.role === 'agency-approver' ? '✅' : '📤';
      const statusEmoji = user.accountStatus === 'verified' ? '✓' :
                          user.accountStatus === 'pending_verification' ? '⏳' :
                          user.accountStatus === 'rejected' ? '❌' : '';

      console.log(`${index + 1}. ${roleEmoji} ${user.role.toUpperCase()}${statusEmoji ? ` ${statusEmoji}` : ''}`);
      console.log(`   Email:        ${user.email}`);
      console.log(`   Agency:       ${user.agencyName}`);
      console.log(`   Ministry:     ${user.ministryType}`);
      console.log(`   Location:     ${user.location || 'N/A'}`);

      if (user.role === 'agency-approver' && user.accountStatus) {
        console.log(`   Status:       ${user.accountStatus}`);
        if (user.accountStatus === 'rejected' && user.rejectionReason) {
          console.log(`   Reason:       ${user.rejectionReason}`);
        }
      }

      console.log(`   Created:      ${user.createdAt?.toDate().toLocaleString('en-GB')}`);
      console.log(`   User ID:      ${user.userId}`);
      console.log('─'.repeat(120));
    });

    // Summary by role
    const adminCount = users.filter(u => u.role === 'admin').length;
    const approverCount = users.filter(u => u.role === 'agency-approver').length;
    const agencyCount = users.filter(u => u.role === 'agency').length;
    const pendingCount = users.filter(u => u.accountStatus === 'pending_verification').length;

    console.log('\n📊 Summary:');
    console.log(`   Total Users:        ${users.length}`);
    console.log(`   👑 Admins:          ${adminCount}`);
    console.log(`   ✅ Approvers:       ${approverCount}${pendingCount > 0 ? ` (${pendingCount} pending verification)` : ''}`);
    console.log(`   📤 Uploaders:       ${agencyCount}`);
    console.log('');

    console.log('💡 To delete a user, run:');
    console.log('   node scripts/deleteUser.cjs <email>\n');

  } catch (error) {
    console.error('\n❌ Error listing users:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

listAllUsers();
