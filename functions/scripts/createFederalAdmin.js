const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Federal Admin Details
const ADMIN_EMAIL = 'favhinzy@gmail.com';
const ADMIN_PASSWORD = 'ChangeMe123!'; // You'll change this after first login
const ADMIN_NAME = 'Federal Administrator';

async function createFederalAdmin() {
  try {
    console.log('👤 Creating Federal Admin Account...\n');

    // ============================================================================
    // 1. CREATE USER IN FIREBASE AUTH
    // ============================================================================
    console.log(`📧 Creating auth account for: ${ADMIN_EMAIL}`);

    let userRecord;
    try {
      // Check if user already exists
      userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      console.log(`   ℹ️  User already exists: ${ADMIN_EMAIL}`);
      console.log(`   User ID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        userRecord = await admin.auth().createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          emailVerified: true, // Auto-verify for admin
          displayName: ADMIN_NAME,
        });
        console.log(`   ✅ Created auth account: ${ADMIN_EMAIL}`);
        console.log(`   User ID: ${userRecord.uid}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log(`   ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!`);
      } else {
        throw error;
      }
    }

    // ============================================================================
    // 2. SET ADMIN CUSTOM CLAIMS
    // ============================================================================
    console.log(`\n🔑 Setting admin custom claims...`);
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin'
    });
    console.log(`   ✅ Admin claims set`);

    // ============================================================================
    // 3. CREATE USER DOCUMENT IN FIRESTORE
    // ============================================================================
    console.log(`\n📝 Creating Firestore user document...`);

    const userDoc = {
      userId: userRecord.uid,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'admin',
      emailVerified: true,
      accountStatus: 'verified',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      agencyName: 'Federal Asset Management Office',
      location: 'FCT (Abuja)',
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userDoc);
    console.log(`   ✅ Firestore document created`);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✨ FEDERAL ADMIN ACCOUNT CREATED');
    console.log('='.repeat(60));
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     Federal Admin`);
    console.log(`   Status:   Verified`);
    console.log('='.repeat(60));
    console.log('\n📌 NEXT STEPS:');
    console.log('   1. Log in with the credentials above');
    console.log('   2. CHANGE YOUR PASSWORD immediately');
    console.log('   3. Start managing the system\n');

  } catch (error) {
    console.error('❌ Error creating federal admin:', error);
  }
}

createFederalAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
