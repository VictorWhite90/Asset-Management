# Code Snippets & Implementation Details

## 1. HOW DISPLAYID IS GENERATED (Backend)

### File: `functions/src/displayId.ts` (Lines 103-150)

```typescript
export async function generateStaffDisplayId(
  ministryName: string,
  role: string
): Promise<string> {

  if (!ministryName || !role) {
    throw new Error('ministryName and role are required to generate display ID');
  }

  // Step 1: Get 3-letter ministry code
  const ministryCode = getMinistryCode(ministryName);
  // Example: "Federal Ministry of Education" → "EDU"

  // Step 2: Get 3-letter role code
  const roleCode = getRoleCode(role);
  // Example: "agency" → "STF"

  // Step 3: Get current year
  const year = new Date().getFullYear();
  // Example: 2024

  // Step 4: Create counter key (internal, never shown)
  const counterKey = `${ministryCode}-${roleCode}-${year}`;
  // Example: "EDU-STF-2024"

  const counterRef = getDb().collection('_counters').doc(counterKey);

  // Step 5: Atomic transaction to increment counter
  const newSequence = await getDb().runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const currentValue = counterDoc.exists ? (counterDoc.data()?.value || 0) : 0;
    const newValue = currentValue + 1;

    if (!counterDoc.exists) {
      // First record for this ministry-role-year combo
      transaction.set(counterRef, { value: newValue });
    } else {
      // Update existing counter
      transaction.update(counterRef, { value: newValue });
    }

    return newValue;
  });

  // Step 6: Format as 4-digit zero-padded number
  const sequenceStr = String(newSequence).padStart(4, '0');
  // Example: 1 → "0001", 15 → "0015", 123 → "0123"

  // Step 7: Assemble final display ID
  const displayId = `${ministryCode}-${roleCode}-${sequenceStr}`;
  // Example: "EDU-STF-0001"

  return displayId;
}
```

---

## 2. HOW MINISTRY/ROLE CODES ARE MAPPED

### File: `functions/src/displayId.ts` (Lines 74-100)

```typescript
// Ministry name normalization & mapping
export function getMinistryCode(ministryName: string): string {
  const normalized = ministryName.toLowerCase().trim();

  // Try exact match first
  if (MINISTRY_CODE_MAP[normalized]) {
    return MINISTRY_CODE_MAP[normalized];
  }

  // Try partial match
  for (const [key, code] of Object.entries(MINISTRY_CODE_MAP)) {
    const keyword = key.replace('federal ministry of ', '');
    if (normalized.includes(keyword)) {
      return code;
    }
  }

  // Fallback: extract first 3 letters
  const cleaned = normalized
    .replace(/^federal ministry of /i, '')
    .replace(/^ministry of /i, '')
    .replace(/^federal /i, '')
    .trim();

  return cleaned.substring(0, 3).toUpperCase() || 'UNK';
}

// Role code mapping
export function getRoleCode(role: string): string {
  return ROLE_CODE_MAP[role] ?? 'STF'; // default to STF
}
```

---

## 3. APPROVAL FLOW (Cloud Function)

### File: `functions/src/index.ts` (Lines 353-500)

```typescript
/**
 * Ministry admin approves staff (uploader/approver) joining their ministry.
 */
export const approveUserByMinistryAdmin = onCall(
  async (request): Promise<{
    success: boolean;
    message: string;
    uuid?: string;
    displayId?: string;
    userEmail?: string;
    userName?: string;
  }> => {
    const { userId, ministryAdminId } = request.data;

    // Validation: Is the caller a ministry admin?
    const ministryAdminClaims = await admin.auth().getUser(ministryAdminId);
    if (!ministryAdminClaims.customClaims?.role?.includes('ministry-admin')) {
      throw new HttpsError('permission-denied', 'Only ministry admins can approve');
    }

    // Get the staff user to approve
    const staffUserRef = admin.firestore().collection('users').doc(userId);
    const staffUserDoc = await staffUserRef.get();
    const staffUser = staffUserDoc.data();

    if (!staffUser) {
      throw new HttpsError('not-found', `User ${userId} not found`);
    }

    // Validation: Is staff pending approval?
    if (staffUser.status !== 'pending') {
      throw new HttpsError('failed-precondition', `Staff is already ${staffUser.status}`);
    }

    // Get ministry info
    const ministryData = await admin.firestore()
      .collection('ministries')
      .doc(ministryAdminClaims.customClaims.ministryId)
      .get();

    const ministryName = ministryData.data()?.name || 'Unknown';

    // ========== GENERATE DISPLAY ID ==========
    const displayId = await generateStaffDisplayId(ministryName, staffUser.role);
    console.log(`Generated display ID for ${staffUser.email}: ${displayId}`);

    // Update user document
    const updateData: any = {
      status: 'verified',
      displayId,                    // ✅ NEW: Set primary field
      uuid: displayId,              // ✅ BACKWARD COMPAT: Keep uuid in sync
      approvedAt: new Date(),
      approvedBy: ministryAdminId,
    };

    await staffUserRef.update(updateData);

    // Update auth claims
    await admin.auth().setCustomUserClaims(staffUser.userId, {
      role: staffUser.role,
      ministryId: staffUser.ministryId,
    });

    // Log the action
    await admin.firestore().collection('auditLogs').add({
      action: 'staff_approved',
      actor: ministryAdminId,
      target: userId,
      details: `Approved staff: ${staffUser.email} (${staffUser.role}) - Display ID: ${displayId}`,
      timestamp: new Date(),
    });

    // Return display ID to frontend
    return {
      success: true,
      message: `${staffUser.email} approved successfully`,
      displayId,
      uuid: displayId,
      userEmail: staffUser.email,
      userName: staffUser.name,
    };
  }
);
```

---

## 4. UPLOADER ID LOADING IN TABLE

### File: `src/pages/ReviewUploadsPage.tsx` (Lines 620-650)

```typescript
// Fetch assets and load uploader display IDs
const loadData = async () => {
  try {
    // Get pending and approved assets
    const pending = await getPendingAssets();
    const approved = await getApproverAssets(userData.ministryId);
    
    setAllAssets(approved);
    setUrgentAssets(pending);

    // Generate uploader tracking UUIDs
    const allAssetsList = [...pending, ...approved];
    
    // Step 1: Extract unique uploader IDs (userId values)
    const uniqueUploaderIds = [...new Set(allAssetsList.map(asset => asset.uploadedBy))];

    // Step 2: Load uploader display IDs (async)
    const uuidMap = new Map<string, string>();
    await Promise.all(
      uniqueUploaderIds.map(async (uploaderId, index) => {
        try {
          // Fetch user document from Firestore
          const user = await getUserById(uploaderId);
          
          if (user?.displayId) {
            // ✅ PRIORITY 1: Use new display ID format
            uuidMap.set(uploaderId, user.displayId);
            // Example: "EDU-STF-0001"
            
          } else if (user?.uuid && user.uuid.length <= 10) {
            // ✅ PRIORITY 2: Use legacy UUID field (same value if approved)
            uuidMap.set(uploaderId, user.uuid);
            // Example: "EDU-STF-0001" (backward compat)
            
          } else {
            // ❌ PRIORITY 3: Generate fallback (user not approved yet)
            const userPrefix = user?.role === 'agency-approver' ? 'APV' : 'USR';
            const userNumber = String(index + 1).padStart(3, '0');
            const trackingId = `${userPrefix}${userNumber}`;
            uuidMap.set(uploaderId, trackingId);
            // Example: "USR001" (OLD FORMAT - PROBLEM!)
          }
        } catch (err) {
          // ❌ User fetch failed: Generate basic fallback
          console.error(`Error loading uploader ${uploaderId}:`, err);
          const userNumber = String(index + 1).padStart(3, '0');
          uuidMap.set(uploaderId, `USR${userNumber}`);
        }
      })
    );

    // Step 3: Store uploader UUIDs in state
    setUploaderUuids(uuidMap);

  } catch (error) {
    console.error('Error loading data:', error);
    setError('Failed to load assets');
  }
};
```

---

## 5. HOW UPLOADER COLUMN IS RENDERED

### File: `src/pages/ReviewUploadsPage.tsx` (Lines 165-180)

```typescript
{/* Uploader Column Cell */}
<TableCell sx={{ fontSize: '0.78rem', py: 1, px: 1.5, color: 'rgba(255,255,255,0.88)', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
  <Typography sx={{ 
    fontSize: '0.74rem', 
    color: '#00ff88',                            // ← Green text
    fontFamily: 'monospace',                     // ← Fixed-width font
    letterSpacing: 0.5,                          // ← Character spacing
    fontWeight: 600,                             // ← Bold
    background: 'rgba(0,255,136,0.1)',          // ← Green-tinted background
    px: 0.8, py: 0.3, borderRadius: 0.5, 
    border: '1px solid rgba(0,255,136,0.2)',    // ← Green border
    display: 'inline-block'
  }}>
    {/* Display the uploader's display ID from the map */}
    {uploaderUuids.get(asset.uploadedBy) || 'UNKNOWN'}
    
    {/* 
      This shows:
      - "EDU-STF-0001" if displayId was found ✅
      - "EDU-STF-0001" if uuid was found (same value) ✅
      - "USR001" if neither found (fallback) ❌
      - "UNKNOWN" if map doesn't have entry (race condition)
    */}
  </Typography>
</TableCell>
```

---

## 6. MINISTRY ADMIN SHOWS APPROVED ID

### File: `src/pages/MinistryAdminDashboardPage.tsx` (Lines 195-211)

```typescript
// When staff is approved, show their new display ID
const handleApprove = async (user: User) => {
  if (!currentUser) return;

  setActionLoading(true);
  try {
    // Call Cloud Function to approve
    const result = await approveUserByMinistryAdmin(user.userId, currentUser.uid);
    
    // Store the returned display ID
    setApprovedStaffData({
      displayId: result.displayId || result.uuid,  // ← Prefer new displayId
      userEmail: result.userEmail,
      userName: result.userName,
    });

    // Show dialog with the new ID
    setUuidDialogOpen(true);
    toast.success(`Approved ${user.email}`);
    
    // Refresh the staff list
    await loadData();
    
  } catch (err: any) {
    toast.error(err.message || 'Failed to approve user');
  } finally {
    setActionLoading(false);
  }
};

// Copy display ID to clipboard
const handleCopyUuid = () => {
  if (approvedStaffData?.displayId) {
    navigator.clipboard.writeText(approvedStaffData.displayId);
    // Copies something like "EDU-STF-0001"
    toast.success('Display ID copied to clipboard!');
  }
};

// Render the dialog
{/* Show the approved staff's display ID in a dialog */}
{approvedStaffData && (
  <Dialog open={uuidDialogOpen} onClose={handleCloseUuidDialog}>
    <DialogTitle>Staff Approved</DialogTitle>
    <DialogContent>
      <Typography>
        Staff: {approvedStaffData.userName} ({approvedStaffData.userEmail})
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, fontFamily: 'monospace' }}>
        Display ID: {approvedStaffData.displayId}
        {/* Shows: "Display ID: EDU-STF-0001" */}
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={handleCopyUuid}>
        Copy Display ID
      </Button>
      <Button onClick={handleCloseUuidDialog}>Close</Button>
    </DialogActions>
  </Dialog>
)}
```

---

## 7. SEARCH BY DISPLAY ID (Cloud Function)

### File: `functions/src/index.ts` (Lines 1024-1088)

```typescript
/**
 * Search for staff by their display ID
 * Example: searchStaffByDisplayId("EDU-STF-0001")
 */
export const searchStaffByDisplayId = onCall(
  async (request): Promise<SearchStaffResponse> => {
    const { displayId } = request.data;

    // Validate input
    if (!displayId || typeof displayId !== 'string') {
      throw new HttpsError('invalid-argument', 'displayId is required');
    }

    // This will be a ministry admin searching within their staff
    const adminId = request.auth?.uid;
    if (!adminId) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    // Get admin's ministry
    const adminUser = await admin.firestore()
      .collection('users')
      .doc(adminId)
      .get();

    const adminMinistryId = adminUser.data()?.ministryId;

    // Search for user by display ID using the helper function
    try {
      const user = await findUserByDisplayId(displayId);

      if (!user) {
        throw new HttpsError(
          'not-found',
          `No staff found with ID: ${displayId.trim().toUpperCase()}`
        );
      }

      // Verify user is in admin's ministry
      if (user.ministryId !== adminMinistryId) {
        throw new HttpsError(
          'permission-denied',
          'Cannot view staff from other ministries'
        );
      }

      // Return staff details
      return {
        success: true,
        displayId: user.displayId as string,
        userId: user.internalId,
        email: user.email,
        role: user.role,
        name: user.name,
        status: user.status,
      };

    } catch (error: any) {
      throw new HttpsError('internal', error.message);
    }
  }
);
```

---

## 8. FINDING USER BY DISPLAY ID

### File: `functions/src/displayId.ts` (Lines 152-180)

```typescript
/**
 * Search Firestore for user by their display ID
 * Used by searchStaffByDisplayId Cloud Function
 */
export async function findUserByDisplayId(
  displayId: string
): Promise<(admin.firestore.DocumentData & { internalId: string }) | null> {
  
  if (!displayId) {
    throw new Error('displayId is required');
  }

  // Normalize: trim whitespace and uppercase
  const cleaned = displayId.trim().toUpperCase();
  // Example: "edu-stf-0001" → "EDU-STF-0001"

  try {
    // Query Firestore for matching user
    const snapshot = await getDb()
      .collection('users')
      .where('displayId', '==', cleaned)  // ← Exact match
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;  // Not found
    }

    // Return user data with internal document ID
    const userDoc = snapshot.docs[0];
    return {
      internalId: userDoc.id,  // Document ID (uid)
      ...userDoc.data(),       // All fields
    };

  } catch (error: any) {
    console.error('Error finding user by displayId:', error);
    throw error;
  }
}
```

---

## 9. BACKFILL MIGRATION

### File: `migration-solution.ts` (Lines 10-80)

```typescript
/**
 * Cloud Function: Backfill displayId for all existing users
 * Run once to migrate legacy users to new display ID system
 */
export const backfillDisplayIds = onCall(
  async (request): Promise<{
    migrated: number;
    results: Array<{ email: string; displayId: string }>;
  }> => {
    // Check authorization: federal admin only
    if (request.auth?.uid !== FEDERAL_ADMIN_ID) {
      throw new HttpsError('permission-denied', 'Federal admin only');
    }

    const db = admin.firestore();
    const results: Array<{ email: string; displayId: string }> = [];
    let migrated = 0;

    try {
      // Get all users without displayId
      const usersSnapshot = await db
        .collection('users')
        .where('displayId', '==', null)
        .get();

      console.log(`Found ${usersSnapshot.size} users without displayId`);

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const userId = doc.id;

        // Skip if user already has displayId
        if (userData.displayId) {
          continue;
        }

        try {
          const ministryName = userData.ministryName || 'Unknown';
          
          // Generate new display ID for this user
          const displayId = await generateStaffDisplayId(
            ministryName,
            userData.role
          );

          // Update user document with new ID
          await doc.ref.update({
            displayId: displayId,
            uuid: displayId, // Update legacy uuid field for backward compatibility
          });

          results.push({
            email: userData.email,
            displayId: displayId,
          });
          migrated++;

          console.log(`Generated ${displayId} for ${userData.email}`);

        } catch (error: any) {
          console.error(`Failed to generate ID for ${userData.email}:`, error);
        }
      }

      return {
        migrated,
        results,
      };

    } catch (error: any) {
      throw new HttpsError('internal', error.message);
    }
  }
);
```

---

## 10. USER SERVICE WRAPPER

### File: `src/services/user.service.ts` (Lines 336-360, 425-430)

```typescript
/**
 * Frontend service: Approve staff (calls Cloud Function)
 */
export const approveUserByMinistryAdmin = async (
  userId: string,
  ministryAdminId: string
): Promise<{ uuid: string; displayId: string; userEmail: string; userName: string }> => {
  const { approveUserByMinistryAdminCF } = await import('./cloudFunctions.service');

  try {
    const result = await approveUserByMinistryAdminCF(userId, ministryAdminId);
    
    return {
      uuid: result.displayId || result.uuid || '',  // ← Prefer displayId
      displayId: result.displayId || '',
      userEmail: result.userEmail,
      userName: result.userName,
    };
  } catch (error: any) {
    console.error('Error approving user:', error);
    throw new Error(error.message || 'Failed to approve user');
  }
};

/**
 * Frontend service: Search staff by display ID
 */
export const searchStaffByDisplayId = async (displayId: string) => {
  const { searchStaffByDisplayIdCF } = await import('./cloudFunctions.service');

  try {
    const result = await searchStaffByDisplayIdCF(displayId);
    return result;
  } catch (error: any) {
    console.error('Error searching staff by display ID:', error);
    throw new Error(error.message || 'Failed to search staff');
  }
};
```

---

## 11. COUNTER DOCUMENT STRUCTURE

### Firestore Document Example

```javascript
// Collection: _counters
// Document ID: EDU-STF-2024

{
  value: 5,  // Next staff will be EDU-STF-0006
  
  // Optional fields (not strictly required):
  createdAt: Timestamp(2024-01-01),
  updatedAt: Timestamp(2024-01-15),
  ministry: "EDU",
  role: "STF",
  year: 2024,
}

// Another example
// Document ID: HEA-APV-2024
{
  value: 2,  // Next approver will be HEA-APV-0003
}

// New year example
// Document ID: EDU-STF-2025
{
  value: 1,  // First staff of 2025
}
```

---

## 12. USER DOCUMENT AFTER APPROVAL

### Firestore User Document Example

```javascript
// Collection: users
// Document ID: abc123xyz (uid)

{
  userId: "abc123xyz",
  email: "john.doe@example.com",
  name: "John Doe",
  
  // Identity
  role: "agency",  // uploader
  status: "verified",
  
  // Display ID (MAIN)
  displayId: "EDU-STF-0001",
  
  // Legacy backward compat field (SAME VALUE)
  uuid: "EDU-STF-0001",
  
  // Ministry
  ministryId: "min-EDU",
  ministryName: "Federal Ministry of Education",
  
  // Timestamps
  createdAt: Timestamp(2024-01-01),
  approvedAt: Timestamp(2024-01-15),
  approvedBy: "ministry-admin-id-123",
}

// BEFORE APPROVAL (Same user):
{
  userId: "abc123xyz",
  email: "jane.smith@example.com",
  name: "Jane Smith",
  role: "agency-approver",
  status: "pending",  // ← NOT YET VERIFIED
  
  displayId: null,  // ← Will be set on approval
  uuid: null,       // ← Will be set on approval
  
  ministryId: "min-HEA",
  ministryName: "Federal Ministry of Health",
  createdAt: Timestamp(2024-01-01),
  // No approvedAt or approvedBy yet
}
```

---

## 13. COMMON ISSUES & SOLUTIONS

### Problem: Uploader shows "USR001" instead of "EDU-STF-0001"

**Root Cause:** User's displayId is missing from database

**Check:**
```javascript
// Check if backfill ran
db.collection('_counters').get()  // Should have documents

// Check if users have displayId
db.collection('users').where('displayId', '==', null).count()
// If count > 0: Backfill incomplete
```

**Solution:**
```javascript
// Call the backfill Cloud Function
const backfill = httpsCallable(functions, 'runBackfillDisplayIds');
backfill({}).then(result => {
  console.log(`Migrated ${result.data.migrated} users`);
});
```

### Problem: "UNKNOWN" appears in Uploader column

**Root Cause:** 
1. User data not loaded yet (race condition)
2. User fetch failed
3. User record missing

**Solution:**
- Wait for async loading to complete
- Check browser console for errors
- Verify user record exists in Firestore

### Problem: Can't find user by display ID

**Root Cause:**
- Display ID format incorrect (case mismatch)
- User not approved yet
- User document doesn't have displayId field

**Check:**
```javascript
// Verify format
const searchId = "EDU-STF-0001";  // Correct format
db.collection('users').where('displayId', '==', searchId).get()
```

---

## 14. FIRESTORE RULES FOR DISPLAYID

```javascript
// Reading user data (approvers can only read their ministry's staff)
match /users/{userId} {
  allow read: if 
    request.auth.uid == userId ||  // Can read own
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role.contains('ministry-admin') &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.ministryId ==
    get(/databases/$(database)/documents/users/$(userId)).data.ministryId;  // Own ministry
}

// Updating display ID (Cloud Function only, via auth)
match /users/{userId} {
  allow update: if request.auth.uid == userId && 
    request.resource.data.displayId == resource.data.displayId;  // Can't change it
}

// Counters are backend-only
match /_counters/{counter} {
  allow read, write: if false;  // Only Cloud Functions can access
}
```
