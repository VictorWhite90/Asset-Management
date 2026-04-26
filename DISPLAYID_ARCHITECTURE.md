# DisplayId Architecture & Data Flow

## 1. DISPLAY ID GENERATION & STORAGE FLOW

```
Staff Registration
        ↓
        ├─→ User submits staff application (email, role, ministry)
        ├─→ Saved with role: 'agency' (uploader) or 'agency-approver'
        ├─→ Status: 'pending' (awaiting ministry admin approval)
        │
        ↓
Ministry Admin Approves
        ├─→ Clicks "Approve" on pending staff
        ├─→ Calls: approveUserByMinistryAdmin(userId, ministryAdminId)
        │
        ↓
Cloud Function: approveUserByMinistryAdmin()
[functions/src/index.ts - Line 353]
        ├─→ Validates ministry admin permissions
        ├─→ Calls: generateStaffDisplayId(ministryName, role)
        │
        ↓
Cloud Function: generateStaffDisplayId()
[functions/src/displayId.ts - Line 103]
        ├─→ Input: ministryName="Federal Ministry of Education", role="agency"
        ├─→ Step 1: Get ministry code: "EDU"
        ├─→ Step 2: Get role code: "STF" (for 'agency' uploader)
        ├─→ Step 3: Get current year: 2024/2025
        ├─→ Step 4: Query counter: _counters/EDU-STF-2024
        ├─→ Step 5: Increment counter (1→2→3...)
        ├─→ Step 6: Pad with zeros: "0001"
        ├─→ Output: "EDU-STF-0001"
        │
        ↓
Firestore Update: users/{userId}
        ├─→ displayId: "EDU-STF-0001"    ✅ NEW PRIMARY FIELD
        ├─→ uuid: "EDU-STF-0001"         ✅ BACKWARD COMPAT
        ├─→ status: "verified"
        ├─→ approvedAt: timestamp
        └─→ ministryId: "min-EDU"
        │
        ↓
Response to Frontend
        ├─→ displayId: "EDU-STF-0001"
        └─→ Shown in dialog with copy button
```

---

## 2. UPLOADER DISPLAY IN ASSET APPROVAL TABLE

```
User Opens ReviewUploadsPage (Ministry Approver View)
        ↓
        ├─→ Query: Fetch all pending assets
        │   SELECT * FROM assets WHERE status='pending' AND ministryId=X
        │
        ├─→ Query: Fetch all approved assets
        │   SELECT * FROM assets WHERE status='approved' AND ministryId=X
        │
        ↓
Extract Uploader IDs
        ├─→ Get unique uploadedBy values from assets
        │   [userId1, userId2, userId3, ...]
        │
        ↓
Load Uploader Display IDs (ASYNC)
        ├─→ For each uploaderId:
        │   ├─→ Call: getUserById(uploaderId)
        │   │   Query: db.collection('users').doc(uploaderId)
        │   │
        │   ├─→ Check 1: user?.displayId exists?
        │   │   YES → Use it (e.g., "EDU-STF-0001") ✅
        │   │
        │   ├─→ Check 2: user?.uuid exists && length ≤ 10?
        │   │   YES → Use it (e.g., "EDU-STF-0001") ✅
        │   │
        │   └─→ Check 3: Neither exists?
        │       NO → Generate fallback:
        │       └─→ role='agency-approver' ? "APV001" : "USR001" ❌
        │
        ↓
Populate Map
        ├─→ uploaderUuids: Map<userId, displayId>
        │   {
        │     "uid_abc123": "EDU-STF-0001",
        │     "uid_xyz789": "HEA-APV-0005",
        │     "uid_unknown": "USR001"  // Fallback
        │   }
        │
        ↓
Render Table
        ├─→ For each asset:
        │   <TableRow>
        │     Asset ID: AST-2024-001
        │     Uploader: uploaderUuids.get(asset.uploadedBy)
        │               → Shows: "EDU-STF-0001" in green badge
        │     Description: ...
        │   </TableRow>
```

---

## 3. KEY FILES & THEIR ROLES

```
BACKEND (Cloud Functions)
├── functions/src/displayId.ts
│   ├─→ generateStaffDisplayId(ministryName, role)
│   │   └─→ Returns: "EDU-STF-0001"
│   ├─→ getMinistryCode(name)
│   │   └─→ "Federal Ministry of Education" → "EDU"
│   ├─→ getRoleCode(role)
│   │   └─→ "agency" → "STF", "agency-approver" → "APV"
│   ├─→ findUserByDisplayId(displayId)
│   │   └─→ Search users by their displayId
│   └─→ backfillDisplayIds()
│       └─→ Batch generate IDs for existing users
│
└── functions/src/index.ts
    ├─→ approveUserByMinistryAdmin() [Line 353]
    │   └─→ Calls generateStaffDisplayId(), updates Firestore
    ├─→ searchStaffByDisplayId() [Line 1024]
    │   └─→ Searches for user by displayId
    └─→ runBackfillDisplayIds() [Line 1093]
        └─→ Triggers backfill for all untagged users

FRONTEND (React)
├── src/pages/ReviewUploadsPage.tsx
│   ├─→ Displays assets pending approval
│   ├─→ "Uploader" column shows displayId
│   ├─→ Lines 624-650: Loads uploaderUuids Map
│   │   ⚠️ Still generates USRxxx fallback
│   └─→ Data Source: asset.uploadedBy → getUserById()
│
├── src/pages/MinistryAdminDashboardPage.tsx
│   ├─→ Ministry admin dashboard
│   ├─→ Line 1090: Shows newly approved staff's displayId
│   ├─→ Line 211: Copy displayId to clipboard
│   └─→ Dialog shows: "Display ID: EDU-STF-0001"
│
├── src/services/user.service.ts
│   ├─→ approveUserByMinistryAdmin() [Line 336]
│   │   └─→ Calls Cloud Function, gets displayId back
│   ├─→ searchStaffByDisplayId() [Line 425]
│   │   └─→ Search by displayId
│   └─→ Handles both displayId and uuid fields (backward compat)
│
└── src/services/cloudFunctions.service.ts
    └─→ searchStaffByDisplayIdCF() [Line 160]
        └─→ Calls backend search function

DATA STORAGE (Firestore)
├── users/{userId}
│   ├─→ userId: "uid_abc123"
│   ├─→ email: "staff@example.com"
│   ├─→ role: "agency" | "agency-approver"
│   ├─→ displayId: "EDU-STF-0001" ✅ PRIMARY
│   ├─→ uuid: "EDU-STF-0001" ✅ BACKWARD COMPAT
│   ├─→ status: "verified" | "pending"
│   └─→ ministryId: "min-EDU"
│
└── _counters/{ministryCode}-{roleCode}-{year}
    ├─→ Key: "EDU-STF-2024"
    ├─→ value: 5 (next ID will be EDU-STF-0006)
    └─→ Resets yearly (2024 → 2025)

MIGRATION SCRIPTS
├── migration-solution.ts
│   └─→ backfillDisplayIds() [Line 10]
│       └─→ One-time migration to generate IDs for existing users
│
└── functions/src/scripts/runBackfill.ts
    └─→ CLI script for manual backfill execution
```

---

## 4. DATA FORMAT MAPPING

```
USER DOCUMENT (Firestore):

AFTER APPROVAL:
{
  userId: "abc123xyz",
  email: "john@example.com",
  role: "agency",
  
  ✅ displayId: "EDU-STF-0001"      ← NEW PRIMARY FORMAT
  ✅ uuid: "EDU-STF-0001"           ← BACKWARD COMPAT (same value)
  
  status: "verified",
  ministryId: "min-EDU",
  ministryName: "Federal Ministry of Education"
}

BEFORE APPROVAL:
{
  userId: "xyz789abc",
  email: "jane@example.com",
  role: "agency-approver",
  
  ❌ displayId: (missing)           ← Will be generated on approval
  ❌ uuid: (missing or old format)  ← Will be generated on approval
  
  status: "pending",
  ministryId: "min-HEA"
}


MINISTRY CODE MAP:
Federal Ministry of Education      → EDU
Federal Ministry of Health         → HEA
Federal Ministry of Finance        → FIN
Federal Ministry of Works          → WOR
Federal Ministry of Defence        → DEF
...and 20+ more

ROLE CODE MAP:
agency                → STF  (Staff/Uploader)
agency-approver       → APV  (Approver)
ministry-admin        → ADM  (Ministry Admin)
admin                 → SUP  (Super Admin)
```

---

## 5. PROBLEM AREAS & FALLBACK CHAINS

```
NORMAL FLOW (IDEAL):
Asset Uploader → Has displayId → Show "EDU-STF-0001" ✅

FALLBACK CHAIN (ReviewUploadsPage.tsx Lines 624-650):

Priority 1: user?.displayId exists?
├─→ YES: Show displayId
│        Example: "EDU-STF-0001" ✅
└─→ NO: Continue to Priority 2

Priority 2: user?.uuid exists && length ≤ 10?
├─→ YES: Show uuid
│        Example: "EDU-STF-0001" ✅
│        (This field has same value as displayId after approval)
└─→ NO: Continue to Priority 3

Priority 3: Generate fallback
├─→ role === 'agency-approver'?
│   ├─→ YES: Generate "APV" + padded index
│   │        Example: "APV001" ❌ (OLD FORMAT)
│   └─→ NO: Continue
└─→ Generate "USR" + padded index
    Example: "USR001" ❌ (OLD FORMAT)

WHEN FALLBACK HAPPENS:
• User fetch fails (network error)
• User exists but displayId & uuid both missing
• Indicates: User not approved yet OR backfill incomplete


EDGE CASE: Async load race
• Assets render before uploaderUuids Map is populated
• Result: Brief "UNKNOWN" display
• Fix: Await user data before rendering table
```

---

## 6. CRITICAL DECISION POINTS

```
Question 1: Does this user have a displayId?
├─→ YES (field exists) → Use it directly ✅
└─→ NO (field missing) → 
    ├─→ Is backfill complete? 
    │   ├─→ YES: This is an error, investigate
    │   └─→ NO: Expected, generate fallback
    └─→ Generate USRxxx for now (temporary)


Question 2: Which field to read - displayId or uuid?
├─→ Preference: Read displayId first
├─→ Fallback: Read uuid if displayId empty
└─→ After approval: Both have same value


Question 3: What format should display IDs have?
├─→ Correct: "EDU-STF-0001" (5-11 chars, includes ministry+role)
├─→ Fallback: "USR001" (6 chars, generic)
└─→ Old: Various formats from legacy system
```

---

## 7. QUERY PATTERNS

```
Find user by displayId:
└─→ db.collection('users')
     .where('displayId', '==', 'EDU-STF-0001')
     .limit(1)
     .get()

Find all users without displayId:
└─→ db.collection('users')
     .where('displayId', '==', null)
     .get()
     // Result count tells us if backfill is complete

Find current counter value:
└─→ db.collection('_counters')
     .doc('EDU-STF-2024')
     .get()
     // value: 5 means next staff gets EDU-STF-0006

Find staff for a ministry:
└─→ db.collection('users')
     .where('ministryId', '==', 'min-EDU')
     .where('displayId', '!=', null)
     .get()
```

---

## 8. SUMMARY OF ISSUES

```
Issue 1: Incomplete Backfill
├─→ Location: Some users may lack displayId
├─→ Symptom: Uploader column shows "USR001"
├─→ Impact: Not displaying official format
└─→ Fix: Run runBackfillDisplayIds Cloud Function

Issue 2: Async Race Condition
├─→ Location: ReviewUploadsPage.tsx lines 624-650
├─→ Symptom: Brief "UNKNOWN" on page load
├─→ Impact: Slow UX, confusing display
└─→ Fix: Batch load user data, or fetch in parallel

Issue 3: Fallback Code Hidden
├─→ Location: USRxxx generation code
├─→ Symptom: Hard to detect missing displayIds in prod
├─→ Impact: Masks real problems
└─→ Fix: Remove fallback once backfill confirmed complete

Issue 4: Dual Field Storage
├─→ Location: Both displayId and uuid stored
├─→ Symptom: Redundant, potential for inconsistency
├─→ Impact: Confusion about which to use
└─→ Fix: Deprecate uuid field after transition period
```

---

## 9. TEST SCENARIOS

```
Scenario 1: Normal Approval
1. Ministry admin clicks "Approve" on pending staff
2. Cloud Function generates displayId: "EDU-STF-0001"
3. Firestore updated with displayId
4. Dialog shows "Display ID: EDU-STF-0001"
5. Copy button works
Expected: New format displayed ✅

Scenario 2: Asset Review Table
1. Approver opens ReviewUploadsPage
2. Assets load with uploadedBy userIds
3. For each uploader, fetch displayId
4. Map populated: { userId → "EDU-STF-0001", ... }
5. Table renders with displayId in Uploader column
Expected: New format shown ✅

Scenario 3: Search by Display ID
1. User enters "EDU-STF-0001" in search box
2. searchStaffByDisplayId("EDU-STF-0001") called
3. Cloud Function queries: .where('displayId', '==', 'EDU-STF-0001')
4. Returns matching user
Expected: User found ✅

Scenario 4: Missing DisplayId (Incomplete Backfill)
1. User was created before displayId system
2. displayId field empty in database
3. ReviewUploadsPage tries to fetch
4. Falls back to generating "USR001"
5. Table shows "USR001" instead of official format
Expected: Should only happen if backfill incomplete ⚠️

Scenario 5: User Lookup Fails
1. Network error during getUserById()
2. Catch block generates fallback
3. Shows "USR001" or "UNKNOWN"
Expected: Graceful degradation, but should be rare ⚠️
```
