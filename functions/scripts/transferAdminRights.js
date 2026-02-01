const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const OLD_ADMIN_EMAIL = 'victorwhite590@gmail.com';
const NEW_ADMIN_EMAIL = 'favhinzy@gmail.com';

async function transferAdminRights() {
  try {
    console.log('🔄 Transferring admin rights...\n');

    // ============================================================================
    // 1. SET ADMIN CLAIMS FOR NEW EMAIL
    // ============================================================================
    console.log(`✅ Setting admin claims for: ${NEW_ADMIN_EMAIL}`);

    try {
      const newAdminUser = await admin.auth().getUserByEmail(NEW_ADMIN_EMAIL);
      await admin.auth().setCustomUserClaims(newAdminUser.uid, {
        role: 'admin'
      });
      console.log(`   ✅ Admin claims set for ${NEW_ADMIN_EMAIL}`);
      console.log(`   User ID: ${newAdminUser.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error(`   ❌ User not found: ${NEW_ADMIN_EMAIL}`);
        console.log(`   ⚠️  Please register this email first before setting admin claims.`);
        console.log(`   Skipping removal of old admin claims.\n`);
        return;
      } else {
        throw error;
      }
    }

    // ============================================================================
    // 2. REMOVE ADMIN CLAIMS FROM OLD EMAIL
    // ============================================================================
    console.log(`\n🗑️  Removing admin claims from: ${OLD_ADMIN_EMAIL}`);

    try {
      const oldAdminUser = await admin.auth().getUserByEmail(OLD_ADMIN_EMAIL);
      await admin.auth().setCustomUserClaims(oldAdminUser.uid, null);
      console.log(`   ✅ Admin claims removed from ${OLD_ADMIN_EMAIL}`);
      console.log(`   User ID: ${oldAdminUser.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`   ℹ️  Old admin user not found (already deleted?)`);
      } else {
        console.error(`   ❌ Error removing old admin claims:`, error.message);
      }
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✨ ADMIN RIGHTS TRANSFER COMPLETE');
    console.log('='.repeat(60));
    console.log(`   New Admin: ${NEW_ADMIN_EMAIL}`);
    console.log(`   Old Admin: ${OLD_ADMIN_EMAIL} (claims removed)`);
    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANT: The new admin must log out and log back in');
    console.log('   to get the new custom claims.\n');

  } catch (error) {
    console.error('❌ Error during transfer:', error);
  }
}

transferAdminRights()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
