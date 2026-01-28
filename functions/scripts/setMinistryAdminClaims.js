const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setMinistryAdminClaims(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    // Set custom claims for ministry-admin
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'ministry-admin'
    });

    console.log(`✅ Successfully set ministry-admin claims for ${email}`);
    console.log(`User ID: ${user.uid}`);
    console.log(`Custom Claims: { role: 'ministry-admin' }`);
    console.log('');
    console.log('⚠️  IMPORTANT: The user must log out and log back in to get the new claims.');

  } catch (error) {
    console.error('❌ Error setting ministry-admin claims:', error.message);

    if (error.code === 'auth/user-not-found') {
      console.log('');
      console.log('User not found. Please make sure:');
      console.log('1. The email address is correct');
      console.log('2. The user has already registered in the system');
    }
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('');
  console.log('Usage: node setMinistryAdminClaims.js <ministry-admin-email>');
  console.log('Example: node setMinistryAdminClaims.js victorwhite590@gmail.com');
  console.log('');
  process.exit(1);
}

setMinistryAdminClaims(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
