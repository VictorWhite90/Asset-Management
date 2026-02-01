/**
 * Firebase Admin Seeder
 * Seeds Firestore categories using Admin SDK (bypasses security rules)
 *
 * USAGE: node scripts/seedFirestoreAdmin.cjs
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Asset categories with updated required fields
const categories = [
  {
    id: 'office-equipment',
    name: 'Office Equipment',
    description: 'Computers, printers, and other office equipment',
    requiredFields: ['itemType', 'quantity'],
  },
  {
    id: 'furniture-fittings',
    name: 'Furniture & Fittings',
    description: 'Office furniture and fixtures',
    requiredFields: ['itemType', 'quantity'],
  },
  {
    id: 'motor-vehicle',
    name: 'Motor Vehicle',
    description: 'Cars, trucks, motorcycles, and other vehicles',
    requiredFields: ['vehicleType', 'model', 'registrationNumber'],
  },
  {
    id: 'plant-generator',
    name: 'Plant/Generator',
    description: 'Power generators and industrial plants',
    requiredFields: ['equipmentType', 'quantity'],
  },
  {
    id: 'building',
    name: 'Building',
    description: 'Structures and buildings',
    requiredFields: ['buildingType', 'numberOfFloors', 'yearBuilt', 'buildingArea', 'condition', 'currentlyInUse', 'usageDescription'],
  },
  {
    id: 'land',
    name: 'Land',
    description: 'Real estate properties and land parcels',
    requiredFields: ['sizeInHectares', 'landTitleType', 'state', 'surveyPlanNumber', 'condition', 'currentlyInUse', 'usageDescription'],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Roads, bridges, and public infrastructure',
    requiredFields: ['infrastructureType', 'location', 'yearCompleted', 'specifications'],
  },
  {
    id: 'extractive-assets',
    name: 'Extractive Assets',
    description: 'Natural resource assets (mining, oil & gas)',
    requiredFields: ['assetType', 'location', 'estimatedReserves', 'quantities', 'operationalStatus'],
  },
  {
    id: 'securities-financial-assets',
    name: 'Securities/Financial Assets',
    description: 'Financial instruments, stocks, bonds, and investments',
    requiredFields: ['assetType', 'tickerSymbol', 'units', 'purchasePrice'],
  },
  {
    id: 'others',
    name: 'Others',
    description: 'Other assets not covered by the categories above',
    requiredFields: ['assetType', 'specifications'],
  },
];

async function seedCategories() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🇳🇬 Nigeria Asset Management - Admin Seeder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('🌱 Seeding asset categories with updated fields...\n');

    for (const category of categories) {
      const { id, ...data } = category;

      await db.collection('categories').doc(id).set(data, { merge: true });

      console.log(`✓ Seeded: ${data.name}`);
      console.log(`  Required fields: ${data.requiredFields.join(', ')}`);
    }

    console.log('\n✅ Successfully seeded all categories!\n');
    console.log('📋 Category Summary:');
    console.log('─'.repeat(50));
    console.log(`Total Categories: ${categories.length}`);
    console.log('\nUpdated Fields:');
    console.log('  • Land: sizeInHectares, landTitleType, state, condition, currentlyInUse, usageDescription');
    console.log('  • Building: currentlyInUse, usageDescription');
    console.log('  • Extractive Assets: quantities');
    console.log('  • Securities/Financial Assets: units (renamed from numberOfShares)');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error seeding categories:', error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedCategories();
