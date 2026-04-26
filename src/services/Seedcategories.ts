

import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

// ─── Helpers (inlined so this script is self-contained) ──────────────────────

const sanitizeDocumentId = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ─── Category definitions (mirrors DEFAULT_CATEGORY_REQUIRED_FIELDS) ─────────

const categories: { name: string; requiredFields: string[]; description?: string }[] = [
  {
    name: 'Office Equipment',
    requiredFields: ['itemType', 'quantity'],
    description: 'Computers, printers, scanners, and other office equipment',
  },
  {
    name: 'Furniture & Fittings',
    requiredFields: ['itemType', 'quantity'],
    description: 'Desks, chairs, shelves, and fixtures',
  },
  {
    name: 'Motor Vehicle',
    requiredFields: [
      'make',
      'model',
      'vehicleYear',
      'registrationNumber',
      'engineNumber',
      'chassisNumber',
      'colour',
    ],
    description: 'Cars, trucks, vans, and other vehicles',
  },
  {
    name: 'Plant/Generator',
    requiredFields: ['equipmentType'],
    description: 'Industrial plant, machinery, and power generators',
  },
  {
    name: 'Building',
    requiredFields: ['buildingType', 'numberOfFloors', 'buildingUse'],
    description: 'Government buildings, offices, and structures',
  },
  {
    name: 'Land',
    requiredFields: ['landTitleType', 'surveyPlanNumber'],
    description: 'Land parcels and plots',
  },
  {
    name: 'Infrastructure',
    requiredFields: ['infrastructureType', 'length', 'width'],
    description: 'Roads, bridges, dams, and public infrastructure',
  },
  {
    name: 'Extractive Assets',
    requiredFields: ['extractiveType', 'licenceNumber'],
    description: 'Mining, oil & gas, and other extractive assets',
  },
  {
    name: 'Securities/Financial Assets',
    requiredFields: ['securityType', 'faceValue', 'issuer'],
    description: 'Bonds, shares, and financial instruments',
  },
  {
    name: 'Others',
    requiredFields: [],
    description: 'Miscellaneous assets not covered by other categories',
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

async function seedCategories() {
  console.log('🌱 Starting category seed...\n');

  let created = 0;
  let skipped = 0;

  for (const category of categories) {
    const docId = sanitizeDocumentId(category.name);
    const docRef = doc(db, 'categories', docId);

    // Check if it already exists — avoid overwriting
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      console.log(`⏭  Skipped  (already exists): ${docId}`);
      skipped++;
      continue;
    }

    await setDoc(docRef, {
      name: category.name,
      description: category.description ?? '',
      requiredFields: category.requiredFields,
      createdAt: Timestamp.now(),
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