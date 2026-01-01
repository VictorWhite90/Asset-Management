// Simple seed script for categories and admin user
// Run with: node scripts/seed.js

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, collection, doc, setDoc, Timestamp } = require('firebase/firestore');

// Firebase configuration from .env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Asset categories
const ASSET_CATEGORIES = [
  'Office Equipment',
  'Furniture & Fittings',
  'Motor Vehicle',
  'Plant/Generator',
  'Building',
  'Land',
  'Stocks',
  'Others',
];

// Admin credentials from environment variables
// Set these in your .env file:
// SEED_ADMIN_EMAIL=admin@nigeria-asset-mgmt.gov.ng
// SEED_ADMIN_PASSWORD=YourSecurePassword123!
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@nigeria-asset-mgmt.gov.ng';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'AdminSecure123!';
const ADMIN_AGENCY_NAME = process.env.SEED_ADMIN_AGENCY_NAME || 'Central Admin - Federal Republic of Nigeria';

// Warn if using default password
if (!process.env.SEED_ADMIN_PASSWORD) {
  console.warn('⚠️  WARNING: Using default admin password. Set SEED_ADMIN_PASSWORD in .env for production!');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Seed asset categories
 */
async function seedCategories() {
  console.log('\n🌱 Seeding asset categories...');

  try {
    for (const category of ASSET_CATEGORIES) {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');

      await setDoc(doc(db, 'categories', categoryId), {
        id: categoryId,
        name: category,
        description: `Asset category: ${category}`,
        createdAt: Timestamp.now(),
      });

      console.log(`  ✅ ${category}`);
    }

    console.log(`\n✅ Seeded ${ASSET_CATEGORIES.length} categories successfully!`);
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message);
    throw error;
  }
}

/**
 * Create admin user
 */
async function seedAdmin() {
  console.log('\n🔐 Creating admin user...');

  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );

    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: ADMIN_AGENCY_NAME,
    });

    // Create user document in Firestore
    const userData = {
      userId: user.uid,
      email: ADMIN_EMAIL,
      agencyName: ADMIN_AGENCY_NAME,
      role: 'admin',
      region: 'FCT (Abuja)',
      ministryType: 'Federal Ministry',
      createdAt: Timestamp.now(),
      emailVerified: true,
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    console.log(`👤 Role: admin`);
    console.log(`🆔 User ID: ${user.uid}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change password after first login!');
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('\n⚠️  Admin user already exists!');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log('Delete from Firebase Console to recreate.');
    } else {
      console.error('❌ Error creating admin:', error.message);
      throw error;
    }
  }
}

/**
 * Main seed function
 */
async function seed() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🇳🇬 Nigeria Asset Management - Database Seeder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    await seedCategories();
    await seedAdmin();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Database seeding complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seed();
