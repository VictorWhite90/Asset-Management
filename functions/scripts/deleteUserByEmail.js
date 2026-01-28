const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const EMAIL_TO_DELETE = 'victorwhite590@gmail.com';

async function deleteUserByEmail() {
  try {
    console.log('🗑️  Deleting user account...\n');

    // ============================================================================
    // 1. FIND USER BY EMAIL
    // ============================================================================
    console.log(`🔍 Looking for user: ${EMAIL_TO_DELETE}`);

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(EMAIL_TO_DELETE);
      console.log(`   ✅ Found user: ${EMAIL_TO_DELETE}`);
      console.log(`   User ID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`   ℹ️  User not found: ${EMAIL_TO_DELETE}`);
        console.log(`   Nothing to delete.`);
        return;
      } else {
        throw error;
      }
    }

    // ============================================================================
    // 2. DELETE FROM FIREBASE AUTH
    // ============================================================================
    console.log(`\n🔥 Deleting from Firebase Authentication...`);
    await admin.auth().deleteUser(userRecord.uid);
    console.log(`   ✅ Deleted from Firebase Auth`);

    // ============================================================================
    // 3. DELETE FROM FIRESTORE USERS COLLECTION
    // ============================================================================
    console.log(`\n📝 Deleting from Firestore...`);
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      await userDocRef.delete();
      console.log(`   ✅ Deleted Firestore user document`);
    } else {
      console.log(`   ℹ️  No Firestore document found`);
    }

    // ============================================================================
    // 4. DELETE ANY RELATED DATA (OPTIONAL)
    // ============================================================================
    console.log(`\n🧹 Checking for related data...`);

    // Delete any assets uploaded by this user
    const assetsSnapshot = await admin
      .firestore()
      .collection('assets')
      .where('uploadedBy', '==', userRecord.uid)
      .get();

    if (!assetsSnapshot.empty) {
      console.log(`   Found ${assetsSnapshot.size} assets to delete`);
      for (const doc of assetsSnapshot.docs) {
        await doc.ref.delete();
      }
      console.log(`   ✅ Deleted ${assetsSnapshot.size} assets`);
    } else {
      console.log(`   ℹ️  No assets found`);
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✨ USER ACCOUNT COMPLETELY DELETED');
    console.log('='.repeat(60));
    console.log(`   Email:    ${EMAIL_TO_DELETE}`);
    console.log(`   User ID:  ${userRecord.uid}`);
    console.log(`   Status:   Permanently removed from database`);
    console.log('='.repeat(60));
    console.log('\n📌 The user must register again to access the system.\n');

  } catch (error) {
    console.error('❌ Error deleting user:', error);
  }
}

deleteUserByEmail()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
