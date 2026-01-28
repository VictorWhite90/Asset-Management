/**
 * Migration Script: Convert Ministries to Array-Based Role Model
 *
 * This script migrates existing ministry documents from the single-user model
 * to the new array-based model that supports multiple uploaders and approvers.
 *
 * What it does:
 * 1. Reads all ministries from Firestore
 * 2. Converts legacy single-user fields to arrays
 * 3. Initializes empty arrays if no users exist
 * 4. Sets default role capacity limits (6 uploaders, 5 approvers)
 * 5. Preserves legacy fields for backward compatibility
 *
 * Run with: node scripts/migrateMinistryRoles.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Constants
const MINISTRIES_COLLECTION = 'ministries';
const MAX_UPLOADERS = 6;
const MAX_APPROVERS = 5;

/**
 * Migrate a single ministry document
 */
async function migrateMinistry(ministryDoc) {
  const ministryId = ministryDoc.id;
  const ministry = ministryDoc.data();

  console.log(`\n📋 Migrating ministry: ${ministry.name} (${ministryId})`);

  // Prepare update data
  const updateData = {};
  let needsUpdate = false;

  // 1. Migrate uploaders
  if (!ministry.uploaders) {
    // Initialize uploaders array from legacy field
    if (ministry.hasUploader && ministry.uploaderUserId) {
      updateData.uploaders = [ministry.uploaderUserId];
      console.log(`  ✓ Converted legacy uploader: ${ministry.uploaderUserId}`);
    } else {
      updateData.uploaders = [];
      console.log('  ✓ Initialized empty uploaders array');
    }
    needsUpdate = true;
  } else {
    console.log(`  ℹ Uploaders array already exists (${ministry.uploaders.length} users)`);
  }

  // 2. Migrate approvers
  if (!ministry.approvers) {
    // Initialize approvers array from legacy field
    if (ministry.hasApprover && ministry.approverUserId) {
      updateData.approvers = [ministry.approverUserId];
      updateData.primaryApprover = ministry.approverUserId; // First approver becomes primary
      console.log(`  ✓ Converted legacy approver: ${ministry.approverUserId}`);
    } else {
      updateData.approvers = [];
      console.log('  ✓ Initialized empty approvers array');
    }
    needsUpdate = true;
  } else {
    console.log(`  ℹ Approvers array already exists (${ministry.approvers.length} users)`);
  }

  // 3. Set default max limits if not present
  if (!ministry.maxUploaders) {
    updateData.maxUploaders = MAX_UPLOADERS;
    needsUpdate = true;
    console.log(`  ✓ Set maxUploaders to ${MAX_UPLOADERS}`);
  }

  if (!ministry.maxApprovers) {
    updateData.maxApprovers = MAX_APPROVERS;
    needsUpdate = true;
    console.log(`  ✓ Set maxApprovers to ${MAX_APPROVERS}`);
  }

  // 4. Ensure legacy fields exist for backward compatibility
  if (ministry.hasUploader === undefined) {
    updateData.hasUploader = (updateData.uploaders || ministry.uploaders || []).length > 0;
    needsUpdate = true;
  }

  if (ministry.hasApprover === undefined) {
    updateData.hasApprover = (updateData.approvers || ministry.approvers || []).length > 0;
    needsUpdate = true;
  }

  // 5. Apply updates if needed
  if (needsUpdate) {
    await db.collection(MINISTRIES_COLLECTION).doc(ministryId).update(updateData);
    console.log('  ✅ Migration completed');
    return { migrated: true, ministryName: ministry.name };
  } else {
    console.log('  ⏭️  No migration needed (already using new model)');
    return { migrated: false, ministryName: ministry.name };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Ministry Role Migration...\n');
  console.log('================================================');
  console.log('This will convert ministries to array-based role model');
  console.log('- Single uploader → Array of up to 6 uploaders');
  console.log('- Single approver → Array of up to 5 approvers');
  console.log('- Legacy fields will be preserved for compatibility');
  console.log('================================================\n');

  try {
    // 1. Fetch all ministries
    console.log('📥 Fetching ministries from Firestore...');
    const ministriesSnapshot = await db.collection(MINISTRIES_COLLECTION).get();
    const totalCount = ministriesSnapshot.size;

    console.log(`Found ${totalCount} ministries to process\n`);

    if (totalCount === 0) {
      console.log('No ministries found. Nothing to migrate.');
      return;
    }

    // 2. Process each ministry
    const results = {
      migrated: [],
      skipped: [],
      errors: [],
    };

    for (const doc of ministriesSnapshot.docs) {
      try {
        const result = await migrateMinistry(doc);
        if (result.migrated) {
          results.migrated.push(result.ministryName);
        } else {
          results.skipped.push(result.ministryName);
        }
      } catch (error) {
        console.error(`  ❌ Error migrating ${doc.data().name}:`, error.message);
        results.errors.push({ ministryName: doc.data().name, error: error.message });
      }
    }

    // 3. Print summary
    console.log('\n================================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('================================================');
    console.log(`Total ministries: ${totalCount}`);
    console.log(`✅ Successfully migrated: ${results.migrated.length}`);
    console.log(`⏭️  Skipped (already migrated): ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.migrated.length > 0) {
      console.log('\n✅ Migrated ministries:');
      results.migrated.forEach((name) => console.log(`   - ${name}`));
    }

    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped ministries:');
      results.skipped.forEach((name) => console.log(`   - ${name}`));
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((err) => console.log(`   - ${err.ministryName}: ${err.error}`));
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
    console.log('\n✅ All done! You can now use the new array-based role model.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
