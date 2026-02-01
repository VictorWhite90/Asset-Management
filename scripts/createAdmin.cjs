/**
 * Create Admin Account Script
 * Creates a federal administrator account with full system access
 *
 * USAGE: node scripts/createAdmin.cjs
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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminAccount() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   🇳🇬 CREATE FEDERAL ADMIN ACCOUNT                ║');
  console.log('║   Nigeria Government Asset Management System      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // Get admin details
    const email = await askQuestion('Enter admin email address: ');

    if (!email || !email.includes('@')) {
      console.log('\n❌ Invalid email address.');
      rl.close();
      process.exit(1);
    }

    const password = await askQuestion('Enter admin password (min 8 characters): ');

    if (!password || password.length < 8) {
      console.log('\n❌ Password must be at least 8 characters.');
      rl.close();
      process.exit(1);
    }

    console.log('\n📋 Admin Account Details:');
    console.log('─'.repeat(50));
    console.log(`Email:        ${email}`);
    console.log(`Role:         Federal Administrator (Central Oversight)`);
    console.log(`Access:       ALL assets nationwide`);
    console.log(`Office:       Federal Asset Management Office`);
    console.log(`Location:     FCT (Abuja)`);
    console.log('─'.repeat(50));

    const confirm = await askQuestion('\nCreate this admin account? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Account creation cancelled.');
      rl.close();
      process.exit(0);
    }

    console.log('\n🔐 Creating Firebase Authentication account...');

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true, // Auto-verify admin email
      displayName: 'Federal Administrator',
    });

    console.log(`✓ Auth user created with UID: ${userRecord.uid}`);

    console.log('\n📝 Creating Firestore user document...');

    // Create Firestore user document
    const userData = {
      userId: userRecord.uid,
      email: email,
      ministryType: 'Federal Government',
      agencyName: 'Federal Asset Management Office',
      location: 'Federal Capital Territory, Abuja', // HQ address
      role: 'admin',
      createdAt: admin.firestore.Timestamp.now(),
      emailVerified: true,
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    console.log('✓ Firestore document created');

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   ✅ ADMIN ACCOUNT CREATED SUCCESSFULLY           ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log('🔑 Login Credentials:');
    console.log('─'.repeat(50));
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     Federal Administrator (Central Oversight)`);
    console.log('─'.repeat(50));

    console.log('\n📌 Admin Capabilities:');
    console.log('  ✓ View ALL assets from ALL agencies nationwide');
    console.log('  ✓ Verify/approve new approver registrations');
    console.log('  ✓ Access federal-level reports and analytics');
    console.log('  ✓ Manage system-wide asset oversight');

    console.log('\n📌 Next Steps:');
    console.log('  1. Go to your application');
    console.log('  2. Log in with the credentials above');
    console.log('  3. Access the Admin Panel from dashboard');
    console.log('  4. Click "View All Assets" or "Pending Verifications"\n');

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.error('\n❌ Error: Email already exists. Use a different email or delete the existing account first.');
    } else {
      console.error('\n❌ Error creating admin account:', error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Account creation cancelled by user');
  rl.close();
  process.exit(0);
});

createAdminAccount();
