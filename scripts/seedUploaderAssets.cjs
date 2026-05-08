'use strict';

/**
 * Seed sample assets in Firestore as if uploaded by a specific uploader (agency role).
 *
 * Uses the Admin SDK (bypasses security rules). Documents match the shape produced by
 * src/services/asset.service.ts createAsset (uploadedBy, agencyId, ministryId, state, etc.).
 *
 * Usage:
 *   node scripts/seedUploaderAssets.cjs --email=uploader@example.com --project=<firebase-project-id> --service-account=<path-to-json>
 *
 * Optional:
 *   --count=3          Number of assets (default 3)
 *   --dry-run=1        Print payloads without writing
 *
 * Prerequisites:
 *   - Uploader must exist in Auth + users/{uid} with role "agency" and non-empty ministryId
 *   - Categories collection seeded (scripts/seedCategories.cjs)
 */

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

function generateAssetId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ASSET-${year}${month}${day}-${random}`;
}

const DEFAULT_FIELD_VALUES = {
  itemType: 'Seed inventory item',
  quantity: 1,
  make: 'Seed Motors',
  model: 'Standard',
  vehicleYear: 2022,
  registrationNumber: 'SEED-REG-001',
  engineNumber: 'SEED-ENG-001',
  chassisNumber: 'SEED-CHS-001',
  colour: 'White',
  equipmentType: 'Standby generator set',
  buildingType: 'Office complex',
  numberOfFloors: 3,
  buildingUse: 'Administrative',
  landTitleType: 'R of O (Right of Occupancy)',
  surveyPlanNumber: 'SEED-SRV-001',
  infrastructureType: 'Road section',
  length: 120,
  width: 7.5,
  extractiveType: 'Not applicable (seed)',
  licenceNumber: 'SEED-LIC-001',
  securityType: 'Government security (seed)',
  faceValue: 1_000_000,
  issuer: 'Seed issuer',
};

async function getRequiredFields(db, categoryName) {
  const docId = sanitizeDocumentId(categoryName);
  const snap = await db.collection('categories').doc(docId).get();
  if (!snap.exists) {
    throw new Error(
      `Category "${categoryName}" not found (doc "${docId}"). Run: node scripts/seedCategories.cjs --project=... --service-account=...`,
    );
  }
  const data = snap.data();
  if (!Array.isArray(data.requiredFields)) return [];
  return data.requiredFields.filter((f) => typeof f === 'string' && f.trim() !== '');
}

function applyRequiredFields(categoryName, requiredFields, target) {
  for (const field of requiredFields) {
    if (target[field] !== undefined && target[field] !== null && target[field] !== '') continue;
    if (DEFAULT_FIELD_VALUES[field] !== undefined) {
      target[field] = DEFAULT_FIELD_VALUES[field];
      continue;
    }
    throw new Error(
      `Category "${categoryName}" requires field "${field}" but no default is defined in seedUploaderAssets.cjs. Add it to DEFAULT_FIELD_VALUES or the template.`,
    );
  }
}

const projectId = getArg('project') || process.env.FIREBASE_PROJECT_ID;
const serviceAccountPath =
  getArg('service-account') ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'serviceAccountKey.json');
const email = getArg('email');
const count = Math.max(1, parseInt(getArg('count') || '3', 10) || 3);
const dryRun = getArg('dry-run') === '1' || getArg('dry-run') === 'true';

if (!email || !email.includes('@')) {
  console.error('Missing or invalid --email=uploader@example.com');
  process.exit(1);
}

if (!projectId) {
  console.error('Missing --project=<firebase-project-id>');
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

if (serviceAccount.project_id !== projectId) {
  console.error('Service account project does not match --project.');
  console.error(`  Expected: ${projectId}`);
  console.error(`  Key file: ${serviceAccount.project_id}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});

const auth = admin.auth();
const db = admin.firestore();

/** Rotate through these categories so samples are not all identical */
const CATEGORY_ROTATION = ['Others', 'Office Equipment', 'Furniture & Fittings', 'Plant/Generator'];

async function main() {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.error(`No Auth user for email: ${email}`);
      process.exit(1);
    }
    throw e;
  }

  const uid = userRecord.uid;
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    console.error(`Firestore users/${uid} does not exist.`);
    process.exit(1);
  }

  const user = userSnap.data();

  if (user.role !== 'agency') {
    console.error(`User role is "${user.role}", expected "agency" (uploader).`);
    process.exit(1);
  }

  if (!user.ministryId || String(user.ministryId).trim() === '') {
    console.error('User has no ministryId. Uploaders must belong to a ministry.');
    process.exit(1);
  }

  const ministryName = user.ministryName || user.agencyName || 'Ministry';
  const ministryType = user.ministryType || '';
  const laneState = user.state != null ? String(user.state).trim() : '';
  if (!laneState) {
    console.warn('Warning: user.state is empty. Approver rules match asset.state to JWT state; fix the user profile if approvers cannot see these assets.');
  }

  const templates = [];
  for (let i = 0; i < count; i++) {
    const category = CATEGORY_ROTATION[i % CATEGORY_ROTATION.length];
    const requiredFields = await getRequiredFields(db, category);

    const purchasedDate = { day: 15, month: (i % 12) + 1, year: 2024 };
    const base = {
      category,
      description: `Seed asset ${i + 1} — ${category} (script upload for ${email})`,
      location: user.location || 'HQ — seeded location',
      state: laneState,
      purchasedDate,
      purchaseCost: 250_000 + i * 75_000,
      remarks: 'Created by scripts/seedUploaderAssets.cjs',
    };

    if (category === 'Office Equipment') {
      base.itemType = 'Desktop workstation';
      base.quantity = 2 + i;
    } else if (category === 'Furniture & Fittings') {
      base.itemType = 'Conference tables';
      base.quantity = 4 + i;
    } else if (category === 'Plant/Generator') {
      base.equipmentType = 'Diesel generator 250KVA';
    }

    applyRequiredFields(category, requiredFields, base);

    if (user.ministryName && String(user.ministryName).trim()) {
      base.ministry = String(user.ministryName).trim();
    }
    const staffAgency = user.staffAgencyName || user.agencyName;
    if (staffAgency && String(staffAgency).trim()) {
      base.agency = String(staffAgency).trim();
    }

    const assetId = generateAssetId();
    const uploadTime = admin.firestore.Timestamp.now();

    const assetDocument = {
      assetId,
      agencyId: uid,
      ministryId: user.ministryId,
      agencyName: ministryName,
      ministryType,
      description: base.description,
      category: base.category,
      location: base.location,
      state: base.state,
      purchasedDate: base.purchasedDate,
      purchaseCost: base.purchaseCost,
      uploadTimestamp: uploadTime,
      uploadedAt: uploadTime,
      status: 'pending',
      uploadedBy: uid,
      remarks: base.remarks,
    };

    if (user.displayId) {
      assetDocument.uploaderDisplayId = user.displayId;
    }

    if (base.ministry) assetDocument.ministry = base.ministry;
    if (base.agency) {
      assetDocument.agency = base.agency;
      assetDocument.staffAgencyName = base.agency;
    }

    requiredFields.forEach((field) => {
      if (base[field] !== undefined && base[field] !== null) {
        assetDocument[field] = base[field];
      }
    });

    templates.push({ assetDocument });
  }

  if (dryRun) {
    console.log(JSON.stringify(templates, null, 2));
    console.log('Dry run: no writes.');
    return;
  }

  const batch = db.batch();
  const createdRefs = [];
  for (const { assetDocument } of templates) {
    const ref = db.collection('assets').doc();
    batch.set(ref, assetDocument);
    createdRefs.push({ ref, assetId: assetDocument.assetId });
  }
  await batch.commit();

  console.log(`Created ${createdRefs.length} asset(s) for ${email} (${uid}):`);
  for (const { ref, assetId } of createdRefs) {
    console.log(`  docId=${ref.id}  assetId=${assetId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
