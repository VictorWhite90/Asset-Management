import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '../src/utils/constants';
import { User } from '../src/types/user.types';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

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
 * Create admin user
 */
async function seedAdmin() {
  console.log('🔐 Creating admin user...');
  console.log(`Email: ${ADMIN_EMAIL}`);

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

    console.log('✅ Firebase Auth user created');
    console.log(`User ID: ${user.uid}`);

    // Create user document in Firestore
    const userData: User = {
      userId: user.uid,
      email: ADMIN_EMAIL,
      agencyName: ADMIN_AGENCY_NAME,
      role: 'admin', // Admin role
      region: 'FCT (Abuja)',
      ministryType: 'Federal Ministry',
      createdAt: Timestamp.now(),
      emailVerified: true, // Auto-verify admin
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), userData);

    console.log('✅ Firestore user document created');

    console.log('\n🎉 Admin user created successfully!');
    console.log('-----------------------------------');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Role: admin`);
    console.log('-----------------------------------');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');

    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️  Admin user already exists');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log('If you need to reset, delete the user from Firebase Console first.');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
    process.exit(1);
  }
}

// Run the seed function
seedAdmin();
