/**
 * COMPLETE MIGRATION SOLUTION
 * 
 * 1. Add this to your functions/src/index.ts
 * 2. Deploy functions
 * 3. Call the migration function once as super-admin
 */

// Add this migration function to functions/src/index.ts
export const backfillDisplayIds = onCall(
  { cors: true },
  async (request): Promise<{ migrated: number; results: Array<{ email: string; displayId: string }> }> => {
    // Super-admin check - only federal admins can run migration
    requireRole(request.auth, 'admin'); // Your existing requireRole function
    
    console.log('Starting display ID backfill migration...');
    
    // Get all users without displayId
    const snapshot = await admin.firestore()
      .collection(USERS_COLLECTION)
      .where('accountStatus', '==', 'verified') // Only migrate verified users
      .get();

    const results: Array<{ email: string; displayId: string }> = [];
    const updates: Promise<void>[] = [];

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      
      // Skip if user already has displayId
      if (userData.displayId) {
        continue;
      }

      // Skip non-staff roles (admin, ministry-admin don't need display IDs)
      if (!['agency', 'agency-approver'].includes(userData.role)) {
        continue;
      }

      try {
        // Get ministry name for display ID generation
        const ministryDoc = await admin.firestore()
          .collection(MINISTRIES_COLLECTION)
          .doc(userData.ministryId)
          .get();
        
        if (!ministryDoc.exists) {
          console.warn(`Ministry not found for user ${userData.email}`);
          continue;
        }
        
        const ministryName = ministryDoc.data()!.name;
        
        // Generate display ID
        const displayId = await generateStaffDisplayId(ministryName, userData.role);
        
        // Add update to batch
        updates.push(
          doc.ref.update({ 
            displayId: displayId,
            uuid: displayId, // Update legacy uuid field for backward compatibility
          })
        );
        
        results.push({
          email: userData.email,
          displayId: displayId
        });
        
        console.log(`Generated ${displayId} for ${userData.email}`);
        
      } catch (error) {
        console.error(`Error generating display ID for ${userData.email}:`, error);
      }
    }

    // Execute all updates
    await Promise.all(updates);
    
    console.log(`Migration completed: ${results.length} users updated`);
    
    return { 
      migrated: results.length,
      results: results 
    };
  }
);

/**
 * ENHANCED generateStaffDisplayId function with better ministry name handling
 */
async function generateStaffDisplayId(
  ministryName: string, 
  role: string
): Promise<string> {
  
  // Extract ministry code from ministry name with better handling
  let ministryCode = getMinistryCode(ministryName);
  const roleCode = role === 'agency-approver' ? 'APV' : 'STF';
  
  const year = new Date().getFullYear();
  const counterKey = `${ministryCode}-${roleCode}-${year}`;

  // Atomic counter — prevents duplicate IDs under concurrent approvals
  const counterRef = admin.firestore().collection('_counters').doc(counterKey);
  
  const sequence = await admin.firestore().runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const next = (doc.exists ? doc.data()!.count : 0) + 1;
    tx.set(counterRef, { count: next }, { merge: true });
    return next;
  });

  return `${ministryCode}-${roleCode}-${String(sequence).padStart(3, '0')}`;
}

/**
 * Helper function to extract ministry codes
 */
function getMinistryCode(ministryName: string): string {
  const name = ministryName.toLowerCase();
  
  // Handle specific cases first
  if (name.includes('education')) return 'EDU';
  if (name.includes('works') || name.includes('housing')) return 'WRK';
  if (name.includes('health')) return 'HLT';
  if (name.includes('finance') || name.includes('budget')) return 'FIN';
  if (name.includes('defence') || name.includes('defense')) return 'DEF';
  if (name.includes('agriculture')) return 'AGR';
  if (name.includes('transport') || name.includes('aviation')) return 'TRP';
  if (name.includes('power') || name.includes('energy')) return 'PWR';
  if (name.includes('water')) return 'WTR';
  if (name.includes('environment')) return 'ENV';
  if (name.includes('justice')) return 'JUS';
  if (name.includes('foreign')) return 'FOR';
  if (name.includes('interior') || name.includes('internal')) return 'INT';
  if (name.includes('trade') || name.includes('commerce')) return 'TRD';
  if (name.includes('labor') || name.includes('labour') || name.includes('employment')) return 'LAB';
  if (name.includes('information') || name.includes('communication')) return 'ICT';
  if (name.includes('youth') || name.includes('sports')) return 'YTH';
  if (name.includes('women')) return 'WMN';
  if (name.includes('humanitarian')) return 'HUM';
  if (name.includes('science') || name.includes('technology')) return 'SCI';
  
  // Fallback: extract first 3 characters after removing common prefixes
  let code = ministryName
    .replace(/^(Federal )?Ministry of /i, '')
    .replace(/^Federal /i, '')
    .substring(0, 3)
    .toUpperCase();
    
  return code || 'MIN'; // Final fallback
}

/**
 * HOW TO RUN THE MIGRATION:
 * 
 * 1. Deploy your updated functions:
 *    cd functions && npm run deploy
 * 
 * 2. In your admin dashboard or browser console, call:
 *    
 *    const { httpsCallable } = await import('firebase/functions');
 *    const { functions } = await import('./src/services/firebase');
 *    const migrate = httpsCallable(functions, 'backfillDisplayIds');
 *    const result = await migrate();
 *    console.log('Migration result:', result.data);
 * 
 * 3. Check the results to see all migrated users
 */





// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7BdgTN-Mdr6_y2TIln5vpyUK6YoKltCY",
  authDomain: "connectsphere-6e46a.firebaseapp.com",
  projectId: "connectsphere-6e46a",
  storageBucket: "connectsphere-6e46a.firebasestorage.app",
  messagingSenderId: "625772276399",
  appId: "1:625772276399:web:e29f040f9d711aa319025a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);