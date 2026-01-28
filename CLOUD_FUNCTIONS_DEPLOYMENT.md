# Cloud Functions Deployment Guide

## Overview

This guide explains how to deploy the secure Cloud Functions implementation for the ministry admin approval workflow.

## What Changed?

### Security Improvements
- **Before**: Client-side approval using direct Firestore updates
- **After**: Server-side approval using Cloud Functions with custom claims

### Benefits
✅ **Server-side validation** - Cannot be bypassed by client
✅ **Custom claims** - Role-based access control verified by Firebase
✅ **Immutable tokens** - Roles stored in JWT claims
✅ **Audit trail** - All actions logged server-side
✅ **Production-ready** - Enterprise security standards

## Architecture

```
Client (Web App)
    ↓ (calls Cloud Function)
Cloud Function (Server-side)
    ↓ (validates permissions via custom claims)
    ↓ (updates Firestore)
    ↓ (sets custom claims via Admin SDK)
    ↓ (logs to audit trail)
Firebase Auth (Custom Claims)
```

## Prerequisites

1. **Firebase Project** - Already set up
2. **Firebase Admin SDK** - Already configured
3. **Node.js 22** - Required for Cloud Functions
4. **Firebase CLI** - Install globally:
   ```bash
   npm install -g firebase-tools
   ```

## Step 1: Build Cloud Functions

Navigate to the functions directory and build:

```bash
cd functions
npm run build
```

Expected output:
```
> tsc
✓ Compiled successfully
```

## Step 2: Deploy Cloud Functions

### Option A: Deploy All Functions (Recommended)

```bash
npm run deploy
```

This will deploy all 5 Cloud Functions:
- `approveMinistryAdmin`
- `rejectMinistryAdmin`
- `approveStaffByMinistryAdmin`
- `rejectStaffByMinistryAdmin`
- `removeStaffFromMinistry`

### Option B: Deploy Specific Functions

```bash
firebase deploy --only functions:approveMinistryAdmin
firebase deploy --only functions:approveStaffByMinistryAdmin
```

### Expected Deployment Output

```
=== Deploying to 'your-project-id'...

i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing codebase default for deployment
i  functions: packaged /path/to/functions (XX KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: updating Node.js 22 function approveMinistryAdmin(us-central1)...
i  functions: updating Node.js 22 function rejectMinistryAdmin(us-central1)...
i  functions: updating Node.js 22 function approveStaffByMinistryAdmin(us-central1)...
i  functions: updating Node.js 22 function rejectStaffByMinistryAdmin(us-central1)...
i  functions: updating Node.js 22 function removeStaffFromMinistry(us-central1)...
✔  functions[approveMinistryAdmin(us-central1)] Successful update operation.
✔  functions[rejectMinistryAdmin(us-central1)] Successful update operation.
✔  functions[approveStaffByMinistryAdmin(us-central1)] Successful update operation.
✔  functions[rejectStaffByMinistryAdmin(us-central1)] Successful update operation.
✔  functions[removeStaffFromMinistry(us-central1)] Successful update operation.

✔  Deploy complete!
```

## Step 3: Set Custom Claims for Existing Admin

The federal admin needs custom claims to approve ministry admins. Run this script:

### Create Admin Claims Script

Create `functions/scripts/setAdminClaims.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaims(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin'
    });
    console.log(`✅ Set admin claims for ${email}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Replace with your admin email
setAdminClaims('your-admin@example.com')
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Run the Script

```bash
node functions/scripts/setAdminClaims.js
```

**Important**: The admin must log out and log back in to get the new claims.

## Step 4: Test Cloud Functions

### Test 1: Ministry Admin Approval

1. **Register as ministry admin** at `/register-ministry-admin`
2. **Verify email**
3. **Login as federal admin**
4. **Go to verifications page**
5. **Click Approve**

**Expected behavior**:
- Cloud Function validates federal admin role
- Sets `accountStatus: 'verified'`
- Sets custom claims: `{ role: 'ministry-admin' }`
- Logs action to audit trail
- Returns success message

**Check in console**:
```
Cloud Function approveMinistryAdmin executed
Ministry admin approved { ministryAdminId: '...', approvedBy: '...' }
Set custom claims for user ... { role: 'ministry-admin' }
```

### Test 2: Staff Approval

1. **Register as staff** (uploader/approver)
2. **Verify email** → Status becomes `pending_ministry_approval`
3. **Login as ministry admin**
4. **Go to ministry admin dashboard**
5. **Click Approve**

**Expected behavior**:
- Cloud Function validates ministry admin role and ownership
- Sets `accountStatus: 'verified'`
- Sets custom claims: `{ role: 'agency', ministryId: '...' }`
- Logs action to audit trail
- Staff can now access upload/approval features

## Step 5: Verify Security

### Test Invalid Approvals (Should Fail)

1. **Try to approve without being logged in** → `unauthenticated` error
2. **Try to approve as wrong role** → `permission-denied` error
3. **Try to approve user from different ministry** → `permission-denied` error
4. **Try to approve already-approved user** → `failed-precondition` error

All these should be **blocked by the Cloud Function**.

## Monitoring & Debugging

### View Function Logs

```bash
npm run logs
```

Or in Firebase Console:
- Go to Functions → Logs
- Filter by function name
- Check execution time and errors

### Common Errors

#### Error: `unauthenticated`
**Cause**: User not logged in
**Fix**: Ensure user is authenticated before calling function

#### Error: `permission-denied`
**Cause**: User doesn't have required role
**Fix**: Check user's custom claims in Firebase Console

#### Error: `failed-precondition`
**Cause**: User's status doesn't match expected state
**Fix**: Check user's `accountStatus` field in Firestore

## Cost Optimization

Cloud Functions pricing:
- **Free tier**: 2 million invocations/month
- **Each approval**: 1 invocation
- **Expected cost**: $0 (well within free tier for gov system)

Set `maxInstances: 10` (already configured) to prevent unexpected scaling costs.

## Rollback Plan

If you need to rollback to client-side approval:

1. **Revert service files**:
   ```bash
   git checkout HEAD^ -- src/services/auth.service.ts
   git checkout HEAD^ -- src/services/user.service.ts
   ```

2. **Remove Cloud Functions** (optional):
   ```bash
   firebase functions:delete approveMinistryAdmin
   firebase functions:delete approveStaffByMinistryAdmin
   # ... etc
   ```

## Next Steps

1. ✅ Deploy Cloud Functions
2. ✅ Set admin custom claims
3. ✅ Test approval workflows
4. ⏭️ Update Firestore security rules (see FIRESTORE_SECURITY_RULES.md)
5. ⏭️ Test complete end-to-end workflow

## Support

If you encounter issues:
1. Check function logs: `npm run logs`
2. Verify custom claims in Firebase Console
3. Check Firestore rules are not blocking requests
4. Ensure admin has correct custom claims set

---

**Status**: Ready for deployment
**Deployment time**: ~5-10 minutes
**Testing time**: ~15 minutes
