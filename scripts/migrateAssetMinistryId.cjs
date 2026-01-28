/**
 * Migration Script: Add ministryId to Existing Assets
 *
 * This script adds the ministryId field to all existing assets by looking up
 * the uploader's ministry from the users collection.
 *
 * What it does:
 * 1. Reads all assets from Firestore
 * 2. For each asset, looks up the uploader's user document
 * 3. Adds the ministryId field from the user's document
 * 4. Updates the asset document
 *
 * Run with: node scripts/migrateAssetMinistryId.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Constants
const ASSETS_COLLECTION = 'assets';
const USERS_COLLECTION = 'users';

/**
 * Migrate a single asset document
 */
async function migrateAsset(assetDoc) {
  const assetId = assetDoc.id;
  const asset = assetDoc.data();

  console.log(`\n📄 Migrating asset: ${asset.assetId} - ${asset.description}`);

  // Check if ministryId already exists
  if (asset.ministryId) {
    console.log('  ⏭️  Asset already has ministryId, skipping');
    return { migrated: false, assetId: asset.assetId };
  }

  // Get uploader's user document to fetch ministryId
  const uploaderUserId = asset.agencyId || asset.uploadedBy;
  if (!uploaderUserId) {
    console.log('  ⚠️  Warning: No uploader ID found, cannot migrate');
    return { migrated: false, assetId: asset.assetId, error: 'No uploader ID' };
  }

  try {
    const userDoc = await db.collection(USERS_COLLECTION).doc(uploaderUserId).get();

    if (!userDoc.exists) {
      console.log(`  ⚠️  Warning: Uploader user ${uploaderUserId} not found`);
      return { migrated: false, assetId: asset.assetId, error: 'Uploader not found' };
    }

    const user = userDoc.data();
    const ministryId = user.ministryId;

    if (!ministryId) {
      console.log('  ⚠️  Warning: Uploader has no ministryId');
      return { migrated: false, assetId: asset.assetId, error: 'User has no ministryId' };
    }

    // Update asset with ministryId
    await db.collection(ASSETS_COLLECTION).doc(assetId).update({
      ministryId: ministryId,
    });

    console.log(`  ✅ Added ministryId: ${ministryId}`);
    return { migrated: true, assetId: asset.assetId, ministryId };
  } catch (error) {
    console.error(`  ❌ Error migrating asset:`, error.message);
    return { migrated: false, assetId: asset.assetId, error: error.message };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Asset MinistryId Migration...\n');
  console.log('================================================');
  console.log('This will add ministryId field to all existing assets');
  console.log('by looking up the uploader\'s ministry from users collection');
  console.log('================================================\n');

  try {
    // 1. Fetch all assets
    console.log('📥 Fetching assets from Firestore...');
    const assetsSnapshot = await db.collection(ASSETS_COLLECTION).get();
    const totalCount = assetsSnapshot.size;

    console.log(`Found ${totalCount} assets to process\n`);

    if (totalCount === 0) {
      console.log('No assets found. Nothing to migrate.');
      return;
    }

    // 2. Process each asset
    const results = {
      migrated: [],
      skipped: [],
      errors: [],
    };

    for (const doc of assetsSnapshot.docs) {
      const result = await migrateAsset(doc);
      if (result.migrated) {
        results.migrated.push(result);
      } else if (result.error) {
        results.errors.push(result);
      } else {
        results.skipped.push(result);
      }
    }

    // 3. Print summary
    console.log('\n================================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('================================================');
    console.log(`Total assets: ${totalCount}`);
    console.log(`✅ Successfully migrated: ${results.migrated.length}`);
    console.log(`⏭️  Skipped (already have ministryId): ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.migrated.length > 0 && results.migrated.length <= 10) {
      console.log('\n✅ Sample migrated assets:');
      results.migrated.slice(0, 10).forEach((result) =>
        console.log(`   - ${result.assetId}: ${result.ministryId}`)
      );
    } else if (results.migrated.length > 10) {
      console.log(`\n✅ Migrated ${results.migrated.length} assets (showing first 10):`);
      results.migrated.slice(0, 10).forEach((result) =>
        console.log(`   - ${result.assetId}: ${result.ministryId}`)
      );
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((err) =>
        console.log(`   - ${err.assetId}: ${err.error}`)
      );
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    // Close the admin app
    await admin.app().delete();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ All done! Assets now have ministryId field for access control.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
