# Display ID Format Fix Guide

## Current Status

Your system has **two display ID implementations**:
- ✅ **NEW FORMAT**: EDU-STF-0001, HEA-APV-0002 (properly coded)
- ⚠️ **OLD FORMAT**: USR002, USR801 (fallback, shown in tables when displayId missing)

---

## The Issue

When you login as a **Ministry Admin** and view the **pending approvals table**, the `UPLOADER` column shows:
- ❌ USR002, USR801, etc. (old format)
- ✅ Should show: EDU-STF-0001, EDU-APV-0001, etc.

### Why This Happens

Users approved **before the displayId system was implemented** don't have the `displayId` field set. The table code has a fallback that generates temporary `USRxxx` format when displayId is missing.

### Who Needs DisplayIds

| Role | Format | Example | Needed |
|------|--------|---------|--------|
| **Uploader** (agency) | {Ministry}-STF-{Seq} | EDU-STF-0001 | ✅ Yes |
| **Approver** (agency-approver) | {Ministry}-APV-{Seq} | EDU-APV-0001 | ✅ Yes |
| **Ministry Admin** (ministry-admin) | — | — | ❌ No |
| **Federal Admin** (admin) | — | — | ❌ No |

---

## Implementation Status

### ✅ Already Working Correctly

| Component | File | Status |
|-----------|------|--------|
| **Display ID Generation** | `functions/src/displayId.ts` | ✅ Correct format EDU-STF-0001 |
| **Format Rules** | ROLE_CODE_MAP | ✅ STF for uploaders, APV for approvers |
| **Approval Function** | `approveStaffByMinistryAdmin` | ✅ Sets displayId on new approvals |
| **Backfill Function** | `backfillDisplayIds` | ✅ Updates existing users |
| **Callable Function** | `runBackfillDisplayIds` | ✅ Cloud Function available |

### 📋 What Needs to Be Done

**1. Run the Backfill (One-time)**
- Migrates all existing verified staff to have displayIds
- Affects: All users with role `agency` or `agency-approver` 
- Duration: ~1-2 minutes for typical deployments

**2. Verify in UI**
- After backfill: Table shows `EDU-STF-0001` format
- No more `USRxxx` format

---

## How to Run the Backfill

### Option A: Firebase Console (Recommended for Non-Technical Users)

1. Go to **Firebase Console** → **Functions** → **runBackfillDisplayIds**
2. Click **Test the Function**
3. Click **Call** (no parameters needed)
4. Wait for completion
5. Should return:
   ```json
   {
     "migrated": 156,
     "skipped": 8,
     "errors": []
   }
   ```

### Option B: Browser Console (For Admin Dashboard)

```javascript
// 1. Open browser console (F12) while logged in as Federal Admin
// 2. Paste this code:

const { httpsCallable } = await import('firebase/functions');
const { functions } = await import('./src/services/firebase');

const backfill = httpsCallable(functions, 'runBackfillDisplayIds');
const result = await backfill({});

console.log('Backfill Results:', result.data);
// Shows: { migrated: 156, skipped: 8, errors: [] }
```

### Option C: Node.js Script (For Developers)

```javascript
// Run from repository root
node -e "
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { backfillDisplayIds } = require('./functions/lib/displayId');

admin.initializeApp();

backfillDisplayIds().then(result => {
  console.log('Backfill Complete:', result);
  process.exit(0);
}).catch(err => {
  console.error('Backfill Failed:', err);
  process.exit(1);
});
"
```

---

## Expected Format After Fix

### Uploaders (role: 'agency')
```
Federal Ministry of Education    → EDU-STF-0001, EDU-STF-0002, ...
Federal Ministry of Works        → WOR-STF-0001, WOR-STF-0002, ...
Federal Ministry of Health       → HEA-STF-0001, HEA-STF-0002, ...
Federal Ministry of Finance      → FIN-STF-0001, FIN-STF-0002, ...
```

### Approvers (role: 'agency-approver')
```
Federal Ministry of Education    → EDU-APV-0001, EDU-APV-0002, ...
Federal Ministry of Health       → HEA-APV-0001, HEA-APV-0002, ...
```

---

## Verification Checklist

After running the backfill, verify these steps:

- [ ] **Step 1:** Login as Federal Admin
- [ ] **Step 2:** Open Firebase Console → Firestore → users collection
- [ ] **Step 3:** Pick a user with role='agency' or 'agency-approver'
- [ ] **Step 4:** Verify they have a `displayId` field like "EDU-STF-0001"

Then in UI:
- [ ] **Step 5:** Login as Ministry Admin
- [ ] **Step 6:** Go to **Pending Approvals** page
- [ ] **Step 7:** Check **UPLOADER** column
- [ ] **Step 8:** Should show "EDU-STF-0001" format (not "USR002")

---

## Technical Details

### Display ID Structure
```
{Ministry Code}-{Role Code}-{Sequence}
    ↓              ↓            ↓
    EDU     -      STF     -   0001

Ministry Code: 3 letters (EDU, HEA, WOR, FIN, etc.)
Role Code:     STF (Uploader) or APV (Approver)
Sequence:      4 digits, zero-padded, resets yearly
```

### Data Fields Updated
Both fields are synchronized:
```javascript
displayId: "EDU-STF-0001"  // New primary field
uuid: "EDU-STF-0001"        // Legacy field (kept for backward compat)
```

---

## FAQ

**Q: Which roles need displayIds?**  
A: Only uploaders (STF) and approvers (APV) need displayIds. Ministry admins and federal admins do not.

**Q: Do Ministry Admins need displayIds?**  
A: No. Ministry admins don't interact with the asset system directly and don't need tracking IDs.

**Q: Do Federal Admins need displayIds?**  
A: No. Federal admins don't appear on the asset uploader tables and don't need tracking IDs.

**Q: What happens if I approve new staff before running backfill?**  
A: New staff will get displayIds correctly. Backfill will migrate existing users. Both processes are compatible.

**Q: Can the backfill be run multiple times?**  
A: Yes, it's idempotent. Running it twice is safe - it will skip users who already have displayIds.

**Q: How long does backfill take?**  
A: Typically 1-2 minutes for 100-200 users. Firebase Functions have a 540 second timeout.

**Q: What if backfill times out?**  
A: It's safe to re-run. It will skip already-migrated users and continue with remaining users.

---

## After Backfill Complete

Once verified that all users show correct format:

### Optional: Remove Fallback Code
In [src/pages/ReviewUploadsPage.tsx](src/pages/ReviewUploadsPage.tsx) (lines 624-650), the fallback code that generates `USRxxx` can be simplified since all users will now have displayIds:

```typescript
// Current code has fallback: displayId → uuid → USRxxx
// After backfill, can simplify to just:
if (user?.displayId) {
  uuidMap.set(uploaderId, user.displayId);
} else {
  console.warn(`No displayId for user ${uploaderId}`);
  uuidMap.set(uploaderId, uploaderId); // Use userId as fallback
}
```

---

## Support

If issues occur:
1. Check [Firestore console](https://console.firebase.google.com) for user data
2. Look at Cloud Functions logs for errors
3. Verify user has `accountStatus: 'verified'`
4. Ensure `ministryId` field exists and references valid ministry
