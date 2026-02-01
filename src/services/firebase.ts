import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error(
    'Missing required environment variables:',
    missingEnvVars.join(', ')
  );
  console.error('Please check your .env file');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Connect to emulators if in development mode
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

if (useEmulators && import.meta.env.DEV) {
  console.log('🔧 Connecting to Firebase Emulators...');

  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);

    console.log('✅ Connected to Firebase Emulators');
  } catch (error) {
    console.error('❌ Error connecting to emulators:', error);
  }
}

// Offline persistence is currently disabled to allow multiple browser tabs.
// To enable for production, use enableIndexedDbPersistence(db) from 'firebase/firestore'.

export default app;
