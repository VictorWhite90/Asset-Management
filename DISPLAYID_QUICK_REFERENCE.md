# Quick Reference: DisplayId Code Locations

## KEY CODE LOCATIONS

### 🔴 PROBLEM AREAS - OLD USR FORMAT GENERATION

| Issue | File | Lines | Problem | Fix |
|-------|------|-------|---------|-----|
| USRxxx fallback | `src/pages/ReviewUploadsPage.tsx` | 624-650 | Still generates `USR001` when displayId missing | Remove after backfill verified |
| Fallback on error | `src/pages/ReviewUploadsPage.tsx` | 642-646 | Generates `USR001` if user fetch fails | Add error logging |
| Async race | `src/pages/ReviewUploadsPage.tsx` | 624-650 | Table shows "UNKNOWN" briefly during load | Batch/parallel load users |

---

### 🟢 CORRECT IMPLEMENTATIONS - NEW FORMAT

| Function | File | Lines | What It Does | Output Format |
|----------|------|-------|--------------|----------------|
| `generateStaffDisplayId()` | `functions/src/displayId.ts` | 103-150 | Generates new display ID | `EDU-STF-0001` |
| `getMinistryCode()` | `functions/src/displayId.ts` | 74-92 | Maps ministry name to code | `EDU`, `HEA`, `FIN` |
| `getRoleCode()` | `functions/src/displayId.ts` | 97-100 | Maps role to code | `STF`, `APV`, `ADM`, `SUP` |
| `findUserByDisplayId()` | `functions/src/displayId.ts` | 152-180 | Searches user by displayId | User object |
| `backfillDisplayIds()` | `functions/src/displayId.ts` | 190-250 | Batch generates IDs for existing users | Count of migrated users |
| `approveUserByMinistryAdmin()` | `functions/src/index.ts` | 353-500 | Approves staff, generates displayId | `{ displayId, uuid, email, ... }` |
| `searchStaffByDisplayId()` | `functions/src/index.ts` | 1024-1088 | Cloud Function search | User with displayId |
| `approveUserByMinistryAdmin()` | `src/services/user.service.ts` | 336-360 | Frontend service wrapper | `{ uuid, displayId, email, ... }` |

---

### 📍 UI DISPLAY LOCATIONS

| Page/Component | File | Lines | What's Displayed | Shows What |
|---|---|---|---|---|
| Ministry Dashboard Dialog | `src/pages/MinistryAdminDashboardPage.tsx` | 1090 | Newly approved staff's ID | `EDU-STF-0001` ✅ |
| Copy ID Button | `src/pages/MinistryAdminDashboardPage.tsx` | 210-211 | Copies displayId to clipboard | Calls displayId field |
| Uploader Column Header | `src/pages/ReviewUploadsPage.tsx` | 180 | "Uploader" column label | Text label |
| Uploader Column Data | `src/pages/ReviewUploadsPage.tsx` | 175, 460 | ID badge for each asset | `uploaderUuids.get(asset.uploadedBy)` |
| Uploader Badge Styling | `src/pages/ReviewUploadsPage.tsx` | 165-178 | Green monospace box styling | CSS styles |
| Table Header Row | `src/pages/ReviewUploadsPage.tsx` | 110-150 | Full table header definition | All columns |

---

### 🔍 DATA FETCHING & MAPPING

| Operation | File | Lines | Details |
|-----------|------|-------|---------|
| Fetch all assets | `src/pages/ReviewUploadsPage.tsx` | 605-620 | Queries pending & approved assets |
| Extract uploader IDs | `src/pages/ReviewUploadsPage.tsx` | 624 | `[...new Set(allAssetsList.map(asset => asset.uploadedBy))]` |
| Load user displayIds | `src/pages/ReviewUploadsPage.tsx` | 625-650 | `Promise.all(uniqueUploaderIds.map(...))` |
| Get user by ID | `src/services/user.service.ts` | N/A | `getUserById(userId)` - fetches from Firestore |
| Store in map | `src/pages/ReviewUploadsPage.tsx` | 633 | `uuidMap.set(uploaderId, user.displayId)` |
| Render from map | `src/pages/ReviewUploadsPage.tsx` | 175, 460 | `{uploaderUuids.get(asset.uploadedBy) \|\| 'UNKNOWN'}` |

---

### 💾 DATA STORAGE LOCATIONS

| Data | Collection | Document | Field | Format |
|------|-----------|----------|-------|--------|
| User Profile | `users` | `{userId}` | `displayId` | `EDU-STF-0001` ✅ |
| User Profile | `users` | `{userId}` | `uuid` | `EDU-STF-0001` (compat) |
| Counter | `_counters` | `EDU-STF-2024` | `value` | `5` (next: 0006) |
| Ministry Info | `ministries` | `min-EDU` | `uploaders[]` | `[uid1, uid2, ...]` |

---

### 🎯 FIELD DEPENDENCY CHAIN

```
asset.uploadedBy (userId)
    ↓
getUserById(userId)
    ↓
user document { displayId, uuid, role, ... }
    ↓
Check 1: user?.displayId?
    ├─→ YES → Return displayId ✅
    └─→ NO ↓
Check 2: user?.uuid && length ≤ 10?
    ├─→ YES → Return uuid ✅
    └─→ NO ↓
Generate fallback
    ├─→ role === 'agency-approver' ? APVxxx : USRxxx ❌
    ↓
Return to ReviewUploadsPage
    ↓
uuidMap.set(uploaderId, value)
    ↓
Render: {uploaderUuids.get(asset.uploadedBy) || 'UNKNOWN'}
```

---

## FUNCTION SIGNATURES

### generateStaffDisplayId()

**Location:** `functions/src/displayId.ts:103-150`

```typescript
export async function generateStaffDisplayId(
  ministryName: string,
  role: string
): Promise<string>

// Input:
// - ministryName: "Federal Ministry of Education"
// - role: "agency" | "agency-approver" | "ministry-admin" | "admin"

// Output:
// - displayId: "EDU-STF-0001"

// Process:
// 1. ministryName → "EDU" (via getMinistryCode)
// 2. role → "STF" (via getRoleCode)
// 3. Get year: 2024
// 4. Counter key: "EDU-STF-2024"
// 5. Increment counter in _counters collection
// 6. Pad with zeros: "0001"
// 7. Return: "EDU-STF-0001"
```

### findUserByDisplayId()

**Location:** `functions/src/displayId.ts:152-180`

```typescript
export async function findUserByDisplayId(
  displayId: string
): Promise<(admin.firestore.DocumentData & { internalId: string }) | null>

// Input:
// - displayId: "EDU-STF-0001" (user input, case-insensitive)

// Output:
// - User object: { userId, email, role, displayId, uuid, ... }
// - null if not found

// Process:
// 1. Normalize: trim, uppercase
// 2. Query: users collection where displayId == cleaned
// 3. Return first match or null
```

### approveUserByMinistryAdmin()

**Location (CF):** `functions/src/index.ts:353-500`
**Location (Service):** `src/services/user.service.ts:336-360`

```typescript
// Cloud Function
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
    // ... validation ...
    const displayId = await generateStaffDisplayId(ministryName, staffUser.role);
    // ... update Firestore ...
    return { displayId, uuid: displayId, ... };
  }
);

// Frontend Service
export const approveUserByMinistryAdmin = async (
  userId: string,
  ministryAdminId: string
): Promise<{ uuid: string; displayId: string; ... }> => {
  const result = await approveUserByMinistryAdminCF(userId, ministryAdminId);
  return {
    uuid: result.displayId || result.uuid || '',
    displayId: result.displayId || '',
    ...
  };
};
```

### searchStaffByDisplayId()

**Location (CF):** `functions/src/index.ts:1024-1088`
**Location (Service):** `src/services/user.service.ts:425-430`

```typescript
// Cloud Function
export const searchStaffByDisplayId = onCall(
  async (request): Promise<SearchStaffResponse> => {
    const { displayId } = request.data;
    const user = await findUserByDisplayId(displayId);
    return { /* user details */ };
  }
);

// Frontend Service
export const searchStaffByDisplayId = async (displayId: string) => {
  const result = await searchStaffByDisplayIdCF(displayId);
  return result;
};
```

---

## CRITICAL QUERIES

### Find users WITHOUT displayId

```javascript
// Check if backfill is needed
db.collection('users')
  .where('displayId', '==', null)
  .count()
  .get()
  
// If count > 0: Run backfill!
// If count = 0: All users have displayId ✅
```

### Find current counter value

```javascript
// What's the next ID number?
db.collection('_counters')
  .doc('EDU-STF-2024')
  .get()
  
// Returns: { value: 5 }
// Next staff approval: EDU-STF-0006
```

### Find staff by ministry

```javascript
// All Education staff with displayIds
db.collection('users')
  .where('ministryId', '==', 'min-EDU')
  .where('displayId', '!=', null)
  .get()
```

### Find by displayId

```javascript
// Search for specific staff
db.collection('users')
  .where('displayId', '==', 'EDU-STF-0001')
  .limit(1)
  .get()
```

---

## ENVIRONMENT & COUNTERS

### Ministry Code Examples

```
Federal Ministry of Education     → EDU
Federal Ministry of Health        → HEA
Federal Ministry of Finance       → FIN
Federal Ministry of Works         → WOR
Federal Ministry of Defence       → DEF
Federal Ministry of Justice       → JUS
Federal Ministry of Agriculture   → AGR
Federal Ministry of Transport     → TRN
Federal Ministry of Power         → PWR
Federal Ministry of Communication → COM
Federal Ministry of Interior      → INT
Federal Ministry of Foreign Aff.  → FOR
Federal Ministry of Labour        → LAB
Federal Ministry of Trade         → TRD
Federal Ministry of Environment   → ENV
Federal Ministry of Petroleum     → PET
Federal Ministry of Science       → SCI
Federal Ministry of Housing       → HOU
Federal Ministry of Youth         → YTH
Federal Ministry of Women Affairs → WOM
Federal Ministry of Sports        → SPT
Federal Ministry of Water Resour. → WAT
Federal Ministry of Mines         → MIN
Federal Ministry of Aviation      → AVI
Federal Ministry of Information   → INF
Federal Ministry of Police Aff.   → POL
Federal Ministry of Humanitarian  → HUM
```

### Role Code Examples

```
agency           → STF  (Staff/Uploader)
agency-approver  → APV  (Approver)
ministry-admin   → ADM  (Ministry Admin)
admin            → SUP  (Super Admin)
```

### Counter Document Examples

```
_counters/EDU-STF-2024     → { value: 5 }  (next: EDU-STF-0006)
_counters/HEA-APV-2024     → { value: 2 }  (next: HEA-APV-0003)
_counters/EDU-STF-2025     → { value: 1 }  (new year: resets)
_counters/FIN-ADM-2024     → { value: 0 }  (none created yet)
```

---

## ERROR SCENARIOS

| Scenario | Error Message | Root Cause | Fix |
|----------|---------------|-----------|-----|
| User not found | "No staff found with ID" | displayId doesn't exist | Verify user was approved |
| Missing ministry | "ministryName is required" | Staff record missing ministry | Update user record |
| Invalid role | Falls back to 'STF' | Unknown role value | Check role field |
| Counter locked | Retry on conflict | Concurrent approvals | DB handles automatically |
| No users to fetch | Empty array | No uploaders for assets | Expected if no assets |
| Backfill incomplete | Shows "USR001" | displayId not generated | Run `runBackfillDisplayIds` |

---

## DEPENDENCIES

### Backend Dependencies

```
functions/src/displayId.ts
  ├─ Requires: firebase-admin
  ├─ Uses: Firestore collection('_counters')
  └─ Reads: Firestore collection('users')

functions/src/index.ts
  ├─ Imports: ./displayId
  ├─ Uses: Cloud Functions SDK
  └─ Calls: generateStaffDisplayId()
```

### Frontend Dependencies

```
src/services/user.service.ts
  ├─ Imports: ./cloudFunctions.service
  └─ Calls: searchStaffByDisplayIdCF()

src/pages/ReviewUploadsPage.tsx
  ├─ Imports: user.service
  ├─ Calls: getUserById()
  └─ Builds: uploaderUuids Map

src/pages/MinistryAdminDashboardPage.tsx
  ├─ Imports: user.service
  ├─ Calls: approveUserByMinistryAdmin()
  └─ Displays: result.displayId
```

---

## DEBUGGING CHECKLIST

- [ ] **Is displayId format correct?**
  - Expected: `EDU-STF-0001` (ministry-role-4digits)
  - Wrong: `USR001`, random strings, empty

- [ ] **Are users missing displayId?**
  - Query: `db.collection('users').where('displayId', '==', null).count()`
  - If count > 0: Run backfill

- [ ] **Is the Uploader column showing correct values?**
  - Should show: `EDU-STF-0001`, `HEA-APV-0005`, etc.
  - Fallback shows: `USR001`, `UNKNOWN`
  - If seeing fallback: Check backfill status

- [ ] **Can you search by displayId?**
  - Try: searchStaffByDisplayId('EDU-STF-0001')
  - Should find user or return "not found"
  - Test searches in dashboard

- [ ] **Are counters working?**
  - Check: `db.collection('_counters').doc('EDU-STF-2024').get()`
  - Should have `value` field
  - If missing: First approval for that ministry will create it

- [ ] **Is UUID backward compat field synced?**
  - Both `displayId` and `uuid` should be equal after approval
  - Check user document: compare fields
