'use strict';

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function sanitizeDocumentId(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const categories = [
  { name: 'Office Equipment', requiredFields: ['itemType', 'quantity'], description: 'Computers, printers, scanners, and other office equipment' },
  { name: 'Furniture & Fittings', requiredFields: ['itemType', 'quantity'], description: 'Desks, chairs, shelves, and fixtures' },
  { name: 'Motor Vehicle', requiredFields: ['make', 'model', 'vehicleYear', 'registrationNumber', 'engineNumber', 'chassisNumber', 'colour'], description: 'Cars, trucks, vans, and other vehicles' },
  { name: 'Plant/Generator', requiredFields: ['equipmentType'], description: 'Industrial plant, machinery, and power generators' },
  { name: 'Building', requiredFields: ['buildingType', 'numberOfFloors', 'buildingUse'], description: 'Government buildings, offices, and structures' },
  { name: 'Land', requiredFields: ['landTitleType', 'surveyPlanNumber'], description: 'Land parcels and plots' },
  { name: 'Infrastructure', requiredFields: ['infrastructureType', 'length', 'width'], description: 'Roads, bridges, dams, and public infrastructure' },
  { name: 'Extractive Assets', requiredFields: ['extractiveType', 'licenceNumber'], description: 'Mining, oil & gas, and other extractive assets' },
  { name: 'Securities/Financial Assets', requiredFields: ['securityType', 'faceValue', 'issuer'], description: 'Bonds, shares, and financial instruments' },
  { name: 'Others', requiredFields: [], description: 'Miscellaneous assets not covered by other categories' },
];

async function seedCategories() {
  console.log('🌱 Starting category seed...\n');
  let created = 0;
  let skipped = 0;

  for (const category of categories) {
    const docId = sanitizeDocumentId(category.name);
    const docRef = db.collection('categories').doc(docId);
    const existing = await docRef.get();

    if (existing.exists) {
      console.log(`⏭  Skipped (already exists): ${docId}`);
      skipped++;
      continue;
    }

    await docRef.set({
      name: category.name,
      description: category.description,
      requiredFields: category.requiredFields,
      createdAt: admin.firestore.Timestamp.now(),
    });

    console.log(`✅ Created: ${docId}  →  "${category.name}"`);
    created++;
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
  process.exit(0);
}

seedCategories().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
