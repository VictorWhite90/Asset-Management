'use strict';

const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');

function getArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function sanitizeDocumentId(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const expectedProject = getArg('project') || process.env.FIREBASE_PROJECT_ID;
const serviceAccountPath =
  getArg('service-account') ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account file not found: ${serviceAccountPath}`);
  console.error('Download a service account key for the target Firebase project and pass it with:');
  console.error('  node scripts/seedCategories.cjs --project=<project-id> --service-account=<path>');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

if (expectedProject && serviceAccount.project_id !== expectedProject) {
  console.error('Refusing to seed: service account project does not match target project.');
  console.error(`  Expected: ${expectedProject}`);
  console.error(`  Key file: ${serviceAccount.project_id}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

const categories = [
  { name: 'Office Equipment', requiredFields: ['itemType', 'quantity'], description: 'Computers, printers, scanners, and other office equipment' },
  { name: 'Furniture & Fittings', requiredFields: ['itemType', 'quantity'], description: 'Desks, chairs, shelves, and fixtures' },
  { name: 'Motor Vehicle', requiredFields: ['make', 'model', 'vehicleYear', 'registrationNumber', 'engineNumber', 'chassisNumber', 'colour'], description: 'Cars, trucks, vans, and other vehicles' },
  { name: 'Plant/Generator', requiredFields: ['equipmentType'], description: 'Industrial plant, machinery, and power generators' },
  { name: 'Building', requiredFields: ['buildingType', 'numberOfFloors', 'buildingUse'], description: 'Government buildings, offices, and structures' },
  { name: 'Land', requiredFields: ['landTitleType', 'surveyPlanNumber'], description: 'Land parcels and plots' },
  { name: 'Infrastructure', requiredFields: ['infrastructureType', 'length', 'width'], description: 'Roads, bridges, dams, and public infrastructure' },
  { name: 'Extractive Assets', requiredFields: ['extractiveType', 'licenceNumber'], description: 'Mining, oil and gas, and other extractive assets' },
  { name: 'Securities/Financial Assets', requiredFields: ['securityType', 'faceValue', 'issuer'], description: 'Bonds, shares, and financial instruments' },
  { name: 'Others', requiredFields: [], description: 'Miscellaneous assets not covered by other categories' },
];

async function seedCategories() {
  console.log(`Starting category seed for project: ${serviceAccount.project_id}`);

  let created = 0;
  let skipped = 0;

  for (const category of categories) {
    const docId = sanitizeDocumentId(category.name);
    const docRef = db.collection('categories').doc(docId);
    const existing = await docRef.get();

    if (existing.exists) {
      console.log(`Skipped existing: ${docId}`);
      skipped++;
      continue;
    }

    await docRef.set({
      name: category.name,
      description: category.description,
      requiredFields: category.requiredFields,
      createdAt: admin.firestore.Timestamp.now(),
    });

    console.log(`Created: ${docId} -> ${category.name}`);
    created++;
  }

  console.log(`Done. Created: ${created}, skipped: ${skipped}`);
  process.exit(0);
}

seedCategories().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
