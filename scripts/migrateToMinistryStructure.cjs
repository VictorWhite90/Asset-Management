// Data Migration Script: Migrate existing users to ministry-based structure
// Run with: node scripts/migrateToMinistryStructure.cjs
// Make sure you have a .env file with your Firebase config

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  addDoc,
} = require('firebase/firestore');

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
 * Main migration function
 */
async function migrateData() {
  console.log('\n🔄 Starting migration to ministry-based structure...\n');

  try {
    // Step 1: Fetch all existing users
    console.log('📥 Fetching existing users...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    console.log(`✅ Found ${users.length} users\n`);

    // Step 2: Group users by agency to create ministries
    console.log('🏢 Grouping users by agency...');
    const agencyMap = new Map();

    users.forEach((user) => {
      // Skip admin users
      if (user.role === 'admin') {
        console.log(`⏭️  Skipping admin user: ${user.email}`);
        return;
      }

      const key = `${user.agencyName}|${user.ministryType}|${user.location}`;

      if (!agencyMap.has(key)) {
        agencyMap.set(key, {
          agencyName: user.agencyName,
          ministryType: user.ministryType,
          location: user.location,
          users: [],
        });
      }

      agencyMap.get(key).users.push(user);
    });

    console.log(`✅ Found ${agencyMap.size} unique agencies\n`);

    // Step 3: Create ministry documents
    console.log('🏛️  Creating ministry documents...');
    const ministryIdMap = new Map(); // Map agency key to ministryId

    for (const [key, agencyData] of agencyMap.entries()) {
      console.log(`\n  Creating ministry: ${agencyData.agencyName}`);

      // Generate a simple official email if not already formatted
      const sanitizedName = agencyData.agencyName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      const officialEmail = `info@${sanitizedName}.gov.ng`;

      // Check if any user in this agency is an uploader or approver
      const hasUploader = agencyData.users.some((u) => u.role === 'agency');
      const hasApprover = agencyData.users.some((u) => u.role === 'agency-approver');
      const uploaderUser = agencyData.users.find((u) => u.role === 'agency');
      const approverUser = agencyData.users.find((u) => u.role === 'agency-approver');

      // Determine ministry status
      // If there are existing users, mark as verified (they were already using the system)
      const status = 'verified';

      const ministryData = {
        name: agencyData.agencyName,
        officialEmail: officialEmail,
        ministryType: agencyData.ministryType,
        location: agencyData.location,
        status: status,
        createdAt: Timestamp.now(),
        verifiedAt: Timestamp.now(),
        verifiedBy: 'SYSTEM_MIGRATION', // Indicate this was auto-verified during migration
        hasUploader: hasUploader,
        hasApprover: hasApprover,
        uploaderUserId: uploaderUser ? uploaderUser.userId : null,
        approverUserId: approverUser ? approverUser.userId : null,
      };

      // Create ministry document
      const ministryRef = await addDoc(collection(db, 'ministries'), ministryData);

      // Update the document with its own ID
      await updateDoc(ministryRef, {
        ministryId: ministryRef.id,
      });

      ministryIdMap.set(key, ministryRef.id);

      console.log(`  ✅ Created ministry: ${agencyData.agencyName} (ID: ${ministryRef.id})`);
      console.log(`     - Uploader: ${hasUploader ? 'Assigned' : 'Available'}`);
      console.log(`     - Approver: ${hasApprover ? 'Assigned' : 'Available'}`);
      console.log(`     - Users: ${agencyData.users.length}`);
    }

    // Step 4: Update user documents with ministryId
    console.log('\n\n👥 Updating user documents with ministryId...');
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Skip admin users
      if (user.role === 'admin') {
        console.log(`  ⏭️  Skipping admin user: ${user.email}`);
        skippedCount++;
        continue;
      }

      const key = `${user.agencyName}|${user.ministryType}|${user.location}`;
      const ministryId = ministryIdMap.get(key);

      if (!ministryId) {
        console.log(`  ⚠️  Warning: No ministry found for user ${user.email}`);
        continue;
      }

      // Update user document
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        ministryId: ministryId,
      });

      console.log(`  ✅ Updated user: ${user.email} -> Ministry ID: ${ministryId}`);
      updatedCount++;
    }

    // Summary
    console.log('\n\n📊 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Ministries created: ${agencyMap.size}`);
    console.log(`✅ Users updated: ${updatedCount}`);
    console.log(`⏭️  Users skipped (admins): ${skippedCount}`);
    console.log(`📋 Total users processed: ${users.length}`);
    console.log('═══════════════════════════════════════\n');

    console.log('🎉 Migration completed successfully!\n');
    console.log('📌 Next Steps:');
    console.log('   1. Review the ministries collection in Firestore');
    console.log('   2. Update any ministry official emails if needed');
    console.log('   3. Test the user registration flow with ministry dropdown');
    console.log('   4. Test role uniqueness enforcement\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
