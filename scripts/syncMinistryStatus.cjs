const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Sync Ministry Status with Owner Status
 *
 * This script ensures that:
 * - If ministry owner is deleted → ministry is suspended
 * - If ministry owner is disabled → ministry is suspended
 * - If ministry owner is verified → ministry stays verified
 */
async function syncMinistryStatus() {
  console.log('🔄 Syncing ministry status with owner status...\n');

  try {
    // Get all ministries
    const ministriesSnapshot = await db.collection('ministries').get();
    console.log(`📊 Found ${ministriesSnapshot.size} ministries\n`);

    let updated = 0;
    let skipped = 0;

    for (const ministryDoc of ministriesSnapshot.docs) {
      const ministry = ministryDoc.data();
      const ministryId = ministryDoc.id;

      // Skip if no owner
      if (!ministry.ownerId) {
        console.log(`⏭️  Skipping ${ministry.name} (no owner)`);
        skipped++;
        continue;
      }

      // Check if owner exists
      const ownerDoc = await db.collection('users').doc(ministry.ownerId).get();

      if (!ownerDoc.exists) {
        // Owner deleted → suspend ministry
        if (ministry.status === 'verified') {
          await db.collection('ministries').doc(ministryId).update({
            status: 'suspended',
            suspendedReason: 'Ministry admin account deleted',
            suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`🔴 Suspended ${ministry.name} (owner deleted)`);
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const owner = ownerDoc.data();

      // Check owner status
      if (owner.accountStatus === 'disabled' || owner.accountStatus === 'rejected') {
        // Owner disabled/rejected → suspend ministry
        if (ministry.status === 'verified') {
          await db.collection('ministries').doc(ministryId).update({
            status: 'suspended',
            suspendedReason: `Ministry admin account ${owner.accountStatus}`,
            suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`🔴 Suspended ${ministry.name} (owner ${owner.accountStatus})`);
          updated++;
        } else {
          skipped++;
        }
      } else if (owner.accountStatus === 'verified' && ministry.status === 'suspended') {
        // Owner verified but ministry suspended → reactivate ministry
        await db.collection('ministries').doc(ministryId).update({
          status: 'verified',
          suspendedReason: admin.firestore.FieldValue.delete(),
          suspendedAt: admin.firestore.FieldValue.delete(),
        });
        console.log(`🟢 Reactivated ${ministry.name} (owner verified)`);
        updated++;
      } else {
        console.log(`✅ ${ministry.name} (already in sync)`);
        skipped++;
      }
    }

    console.log('\n✅ Sync complete!');
    console.log(`   Updated: ${updated} ministries`);
    console.log(`   Skipped: ${skipped} ministries`);

  } catch (error) {
    console.error('❌ Error syncing ministry status:', error);
    process.exit(1);
  }

  process.exit(0);
}

syncMinistryStatus();
