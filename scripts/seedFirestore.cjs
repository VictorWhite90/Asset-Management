// Comprehensive Firestore seed script for Phase 3
// Run with: node scripts/seedFirestore.cjs
// Make sure you have a .env file with your Firebase config

require('dotenv').config();
const { initializeApp } = require('firebase/app');
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Categories with requiredFields for dynamic form generation
 */
const CATEGORIES = [
  {
    id: 'motor-vehicle',
    name: 'Motor Vehicle',
    description: 'Government vehicles including cars (e.g., Toyota Camry), trucks, buses, and other motorized transportation assets',
    requiredFields: ['make', 'model', 'year', 'mileage', 'registrationNumber', 'condition'],
  },
  {
    id: 'land',
    name: 'Land',
    description: 'Real estate properties including plots in Lagos and other locations, undeveloped land, and land parcels',
    requiredFields: ['sizeInHectares', 'landTitleType', 'state', 'surveyPlanNumber', 'condition', 'currentlyInUse', 'usageDescription'],
  },
  {
    id: 'building',
    name: 'Building',
    description: 'Structures including office blocks, residential buildings, warehouses, and other constructed facilities',
    requiredFields: ['buildingType', 'numberOfFloors', 'yearBuilt', 'buildingArea', 'condition', 'currentlyInUse', 'usageDescription'],
  },
  {
    id: 'office-equipment',
    name: 'Office Equipment',
    description: 'Office technology and equipment including laptops, computers, printers, scanners, and other office machinery',
    requiredFields: ['equipmentType', 'brand', 'model', 'serialNumber', 'condition'],
  },
  {
    id: 'furniture-fittings',
    name: 'Furniture & Fittings',
    description: 'Office furniture, fixtures, and fittings including desks, chairs, cabinets, and other furnishings',
    requiredFields: ['furnitureType', 'material', 'condition'],
  },
  {
    id: 'plant-generator',
    name: 'Plant/Generator',
    description: 'Power generation equipment, generators, and industrial plant machinery',
    requiredFields: ['generatorType', 'capacityKW', 'fuelType', 'yearManufactured', 'condition'],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Public infrastructure including roads, bridges, water systems, and other civil engineering assets',
    requiredFields: ['infrastructureType', 'lengthOrArea', 'yearCompleted', 'condition'],
  },
  {
    id: 'extractive-assets',
    name: 'Extractive Assets',
    description: 'Natural resource assets including oil fields, mining operations, and extractive industry assets',
    requiredFields: ['assetType', 'location', 'estimatedReserves', 'quantities', 'operationalStatus'],
  },
  {
    id: 'securities-financial-assets',
    name: 'Securities/Financial Assets',
    description: 'Financial instruments including shares, stocks, bonds, securities, and other financial holdings',
    requiredFields: ['assetType', 'tickerSymbol', 'units', 'purchasePrice'],
  },
  {
    id: 'others',
    name: 'Others',
    description: 'Other assets that do not fit into the above categories',
    requiredFields: [],
  },
];

/**
 * Seed asset categories to Firestore
 */
async function seedCategories() {
  console.log('\n🌱 Seeding asset categories with requiredFields...');

  try {
    for (const category of CATEGORIES) {
      const categoryData = {
        name: category.name,
        description: category.description,
        requiredFields: category.requiredFields,
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'categories', category.id), categoryData);

      console.log(`  ✅ ${category.name}`);
      console.log(`     Fields: ${category.requiredFields.length > 0 ? category.requiredFields.join(', ') : 'None'}`);
    }

    console.log(`\n✅ Seeded ${CATEGORIES.length} categories successfully!`);
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seed() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🇳🇬 Nigeria Asset Management - Firestore Seeder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Validate Firebase config
  const missingConfig = Object.entries(firebaseConfig)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingConfig.length > 0) {
    console.error('\n❌ Missing Firebase configuration:');
    console.error(`   ${missingConfig.join(', ')}`);
    console.error('\n   Please check your .env file');
    process.exit(1);
  }

  try {
    await seedCategories();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Database seeding complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Summary:');
    console.log(`   • Categories: ${CATEGORIES.length}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Verify data in Firebase Console');
    console.log('   2. Seed users collection if needed');
    console.log('   3. Start adding assets through your application\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seed();




