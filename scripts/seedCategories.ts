import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { ASSET_CATEGORIES, COLLECTIONS } from '../src/utils/constants';

// Firebase configuration - uses same config as main app
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Seed asset categories to Firestore
 */
async function seedCategories() {
  console.log('🌱 Seeding asset categories...');

  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);

    for (const category of ASSET_CATEGORIES) {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');

      await setDoc(doc(categoriesRef, categoryId), {
        id: categoryId,
        name: category,
        description: `Asset category: ${category}`,
        createdAt: new Date(),
      });

      console.log(`✅ Added category: ${category}`);
    }

    console.log('\n🎉 Categories seeded successfully!');
    console.log(`Total categories: ${ASSET_CATEGORIES.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCategories();
