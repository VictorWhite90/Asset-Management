const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

const auth = admin.auth();
const db = admin.firestore();

const testUsers = [
  {
    email: 'uploader@agriculture.gov.ng',
    password: 'Test123!',
    role: 'agency',
    agencyName: 'Ministry of Agriculture',
    region: 'Lagos',
    ministryType: 'Federal Ministry',
    displayName: 'Agriculture Uploader',
  },
  {
    email: 'approver@agriculture.gov.ng',
    password: 'Test123!',
    role: 'agency-approver',
    agencyName: 'Ministry of Agriculture',
    region: 'Lagos',
    ministryType: 'Federal Ministry',
    displayName: 'Agriculture Approver',
  },
  {
    email: 'admin@federal.gov.ng',
    password: 'Test123!',
    role: 'admin',
    agencyName: 'Federal Asset Management',
    region: 'Abuja',
    ministryType: 'Federal Agency',
    displayName: 'Federal Admin',
  },
  {
    email: 'uploader@finance.gov.ng',
    password: 'Test123!',
    role: 'agency',
    agencyName: 'Ministry of Finance',
    region: 'Abuja',
    ministryType: 'Federal Ministry',
    displayName: 'Finance Uploader',
  },
  {
    email: 'approver@finance.gov.ng',
    password: 'Test123!',
    role: 'agency-approver',
    agencyName: 'Ministry of Finance',
    region: 'Abuja',
    ministryType: 'Federal Ministry',
    displayName: 'Finance Approver',
  },
];

async function seedTestUsers() {
  console.log('🌱 Starting test user seeding...\n');

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      let user;
      try {
        user = await auth.getUserByEmail(userData.email);
        console.log(`✅ User already exists: ${userData.email}`);
      } catch (error) {
        // User doesn't exist, create them
        user = await auth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: true, // Auto-verify for testing
        });
        console.log(`✅ Created user: ${userData.email}`);
      }

      // Create/update Firestore document
      await db.collection('users').doc(user.uid).set({
        userId: user.uid,
        email: userData.email,
        agencyName: userData.agencyName,
        role: userData.role,
        region: userData.region,
        ministryType: userData.ministryType,
        emailVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`   📝 Role: ${userData.role}`);
      console.log(`   🏛️  Agency: ${userData.agencyName}`);
      console.log(`   🔑 Password: ${userData.password}\n`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }

  console.log('\n✨ Test user seeding completed!');
  console.log('\n📋 Test Accounts Created:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n🔵 AGENCY UPLOADERS (can upload assets)');
  console.log('   Email: uploader@agriculture.gov.ng');
  console.log('   Email: uploader@finance.gov.ng');
  console.log('   Password: Test123!');
  console.log('\n🟡 AGENCY APPROVERS (can approve/reject uploads)');
  console.log('   Email: approver@agriculture.gov.ng');
  console.log('   Email: approver@finance.gov.ng');
  console.log('   Password: Test123!');
  console.log('\n🟢 FEDERAL ADMIN (views all approved assets)');
  console.log('   Email: admin@federal.gov.ng');
  console.log('   Password: Test123!');
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Run the seeding
seedTestUsers()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
