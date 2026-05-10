import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

/** GA4 IDs look like G-XXXXXXXX; omit or use a dummy in Vercel only if the form requires a value — invalid IDs skip Analytics. */
const isValidMeasurementId = (id?: string) => Boolean(id && /^G-[A-Z0-9]+$/i.test(id.trim()));

const env = {
  DEPLOYMENT_ID: process.env.NEXT_PUBLIC_DEPLOYMENT_ID || process.env.VITE_DEPLOYMENT_ID || viteEnv.VITE_DEPLOYMENT_ID,
  GOVERNMENT_LEVEL: process.env.NEXT_PUBLIC_GOVERNMENT_LEVEL || process.env.VITE_GOVERNMENT_LEVEL || viteEnv.VITE_GOVERNMENT_LEVEL,
  DEPLOYMENT_NAME: process.env.NEXT_PUBLIC_DEPLOYMENT_NAME || process.env.VITE_DEPLOYMENT_NAME || viteEnv.VITE_DEPLOYMENT_NAME,
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || viteEnv.VITE_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || viteEnv.VITE_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || viteEnv.VITE_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    viteEnv.VITE_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || viteEnv.VITE_FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.VITE_FIREBASE_MEASUREMENT_ID || viteEnv.VITE_FIREBASE_MEASUREMENT_ID,
  USE_EMULATORS: process.env.NEXT_PUBLIC_USE_EMULATORS || process.env.VITE_USE_EMULATORS || viteEnv.VITE_USE_EMULATORS,
};

export const deploymentConfig = {
  id: env.DEPLOYMENT_ID || 'default',
  governmentLevel: env.GOVERNMENT_LEVEL || 'federal',
  name: env.DEPLOYMENT_NAME || 'Nigeria Government Asset Management System',
};

const measurementId = env.FIREBASE_MEASUREMENT_ID?.trim();
const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
  ...(isValidMeasurementId(measurementId) ? { measurementId } : {}),
};

const requiredEnvVars: Array<keyof typeof env> = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter((varName) => !env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file');
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export const analytics: Promise<Analytics | null> =
  typeof window !== 'undefined' && isValidMeasurementId(env.FIREBASE_MEASUREMENT_ID)
    ? isSupported()
        .then((supported) => (supported ? getAnalytics(app) : null))
        .catch((error) => {
          console.warn('Firebase Analytics is not available:', error);
          return null;
        })
    : Promise.resolve(null);

const useEmulators = env.USE_EMULATORS === 'true';

if (useEmulators && process.env.NODE_ENV === 'development') {
  console.log('Connecting to Firebase Emulators...');

  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase Emulators');
  } catch (error) {
    console.error('Error connecting to emulators:', error);
  }
}

console.log('Testing Mode: Firestore persistence disabled (allows multiple tabs)');
console.log('Deployment:', deploymentConfig);

export default app;
