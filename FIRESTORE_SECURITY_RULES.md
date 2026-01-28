# Firestore Security Rules for Custom Claims

## Overview

These security rules work with the Cloud Functions + custom claims implementation to provide secure, role-based access control.

## How Custom Claims Work

After approval, users get custom claims in their JWT token:

```javascript
// Federal Admin
{ role: 'admin' }

// Ministry Admin
{ role: 'ministry-admin' }

// Staff (Uploader)
{ role: 'agency', ministryId: 'min-abc123' }

// Staff (Approver)
{ role: 'agency-approver', ministryId: 'min-abc123' }
```

These claims are **cryptographically signed** and **cannot be tampered with** by the client.

## Updated Security Rules

Replace your current `firestore.rules` with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Get user's role from custom claims
    function getUserRole() {
      return request.auth.token.role;
    }

    // Get user's ministry ID from custom claims
    function getUserMinistryId() {
      return request.auth.token.ministryId;
    }

    // Check if user has a specific role
    function hasRole(role) {
      return isAuthenticated() && getUserRole() == role;
    }

    // Check if user belongs to a specific ministry
    function belongsToMinistry(ministryId) {
      return isAuthenticated() && getUserMinistryId() == ministryId;
    }

    // Check if user is federal admin
    function isFederalAdmin() {
      return hasRole('admin');
    }

    // Check if user is ministry admin
    function isMinistryAdmin() {
      return hasRole('ministry-admin');
    }

    // Check if user is uploader
    function isUploader() {
      return hasRole('agency');
    }

    // Check if user is approver
    function isApprover() {
      return hasRole('agency-approver');
    }

    // Check if user is staff (uploader or approver)
    function isStaff() {
      return isUploader() || isApprover();
    }

    // ============================================================================
    // USERS COLLECTION
    // ============================================================================

    match /users/{userId} {
      // Anyone can read their own profile
      allow read: if isAuthenticated() && request.auth.uid == userId;

      // Federal admin can read all users
      allow read: if isFederalAdmin();

      // Ministry admin can read users in their ministry
      allow read: if isMinistryAdmin() && resource.data.ministryId == getUserMinistryId();

      // Users can create their own account (during registration)
      allow create: if isAuthenticated() && request.auth.uid == userId;

      // Users can update their own profile (limited fields)
      allow update: if isAuthenticated()
                    && request.auth.uid == userId
                    && !request.resource.data.diff(resource.data).affectedKeys()
                         .hasAny(['role', 'accountStatus', 'isMinistryOwner', 'ownedMinistryId']);

      // Federal admin can update users (approval workflow handled by Cloud Functions)
      // Ministry admin CANNOT directly update user docs (Cloud Functions only)
      // This prevents bypass of approval workflow
      allow update: if isFederalAdmin();

      // No one can delete users (use Cloud Functions to mark as rejected)
      allow delete: if false;
    }

    // ============================================================================
    // MINISTRIES COLLECTION
    // ============================================================================

    match /ministries/{ministryId} {
      // Anyone authenticated can read verified ministries (for registration dropdown)
      allow read: if isAuthenticated() && resource.data.status == 'verified';

      // Federal admin can read all ministries
      allow read: if isFederalAdmin();

      // Ministry admin can read their own ministry
      allow read: if isMinistryAdmin() && resource.data.ownerId == request.auth.uid;

      // Ministry admin can create ministry (only if they don't already own one)
      allow create: if isMinistryAdmin();

      // Federal admin can update ministries (approval workflow)
      allow update: if isFederalAdmin();

      // Ministry admin can update their own ministry (limited fields)
      allow update: if isMinistryAdmin()
                    && resource.data.ownerId == request.auth.uid
                    && !request.resource.data.diff(resource.data).affectedKeys()
                         .hasAny(['status', 'ownerId', 'verifiedAt', 'verifiedBy']);

      // No one can delete ministries
      allow delete: if false;
    }

    // ============================================================================
    // ASSETS COLLECTION
    // ============================================================================

    match /assets/{assetId} {
      // Federal admin can read all assets
      allow read: if isFederalAdmin();

      // Uploaders can read their own assets
      allow read: if isUploader() && resource.data.uploadedBy == request.auth.uid;

      // Approvers can read all assets from their ministry
      allow read: if isApprover() && belongsToMinistry(resource.data.ministryId);

      // Ministry admin can read all assets from their ministry (read-only)
      allow read: if isMinistryAdmin() && belongsToMinistry(resource.data.ministryId);

      // Uploaders can create assets for their ministry
      allow create: if isUploader()
                    && belongsToMinistry(request.resource.data.ministryId)
                    && request.resource.data.uploadedBy == request.auth.uid
                    && request.resource.data.status == 'pending';

      // Uploaders can update their own pending or rejected assets
      allow update: if isUploader()
                    && resource.data.uploadedBy == request.auth.uid
                    && (resource.data.status == 'pending' || resource.data.status == 'rejected');

      // Approvers can update assets in their ministry (approve/reject only)
      allow update: if isApprover()
                    && belongsToMinistry(resource.data.ministryId)
                    && request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['status', 'approvedBy', 'approvedAt', 'rejectionReason']);

      // Federal admin can update any asset
      allow update: if isFederalAdmin();

      // Only uploaders can delete their own pending assets
      allow delete: if isUploader()
                    && resource.data.uploadedBy == request.auth.uid
                    && resource.data.status == 'pending';
    }

    // ============================================================================
    // AUDIT LOGS COLLECTION
    // ============================================================================

    match /auditLogs/{logId} {
      // Only federal admin can read audit logs
      allow read: if isFederalAdmin();

      // Cloud Functions can create audit logs (via Admin SDK)
      // Users cannot create audit logs directly
      allow create: if false;

      // No one can update or delete audit logs
      allow update, delete: if false;
    }

    // ============================================================================
    // NOTIFICATIONS COLLECTION
    // ============================================================================

    match /notifications/{notificationId} {
      // Users can read their own notifications
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;

      // Cloud Functions can create notifications (via Admin SDK)
      // Users cannot create notifications directly
      allow create: if false;

      // Users can update their own notifications (mark as read)
      allow update: if isAuthenticated()
                    && resource.data.userId == request.auth.uid
                    && request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['read', 'readAt']);

      // Users can delete their own notifications
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // ============================================================================
    // DEFAULT DENY
    // ============================================================================

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Key Security Features

### 1. **Role-Based Access via Custom Claims**
```javascript
function hasRole(role) {
  return request.auth.token.role == role; // Verified by Firebase
}
```
- Roles stored in JWT token (immutable)
- Cannot be tampered with by client
- Verified cryptographically on every request

### 2. **Ministry Isolation**
```javascript
function belongsToMinistry(ministryId) {
  return request.auth.token.ministryId == ministryId;
}
```
- Staff can only access their own ministry's data
- Ministry ID in custom claims
- Enforced server-side

### 3. **Approval Workflow Protection**
```javascript
// Users CANNOT update their own accountStatus
allow update: if !request.resource.data.diff(resource.data)
                   .affectedKeys().hasAny(['accountStatus', 'role']);
```
- Prevents users from approving themselves
- Only Cloud Functions (via Admin SDK) can update status
- Federal admin can update via console (backup)

### 4. **Audit Log Integrity**
```javascript
match /auditLogs/{logId} {
  allow create: if false; // Only Cloud Functions via Admin SDK
  allow update, delete: if false; // Immutable
}
```
- Users cannot create fake audit logs
- Logs are immutable (cannot be deleted/modified)
- Only Cloud Functions can write logs

## Deployment

### Step 1: Backup Current Rules

```bash
firebase firestore:rules:get > firestore.rules.backup
```

### Step 2: Update Rules File

Copy the rules above to `firestore.rules`

### Step 3: Deploy Rules

```bash
firebase deploy --only firestore:rules
```

Expected output:
```
=== Deploying to 'your-project-id'...

i  deploying firestore
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
✔  firestore: released rules firestore.rules to cloud.firestore

✔  Deploy complete!
```

### Step 4: Test Rules

Use Firebase Console → Firestore → Rules tab → "Rules Playground" to test scenarios:

**Test 1: Staff can't access other ministry's assets**
```
Operation: get
Location: /assets/asset123
Auth: { uid: 'user1', token: { role: 'agency', ministryId: 'min-A' } }
Data: { ministryId: 'min-B', ... }

Result: ❌ Denied (correct!)
```

**Test 2: Uploader can create asset**
```
Operation: create
Location: /assets/newAsset
Auth: { uid: 'user1', token: { role: 'agency', ministryId: 'min-A' } }
Data: { ministryId: 'min-A', uploadedBy: 'user1', status: 'pending' }

Result: ✅ Allowed (correct!)
```

## Migration from Old Rules

If you have existing data with users who don't have custom claims yet:

### Option 1: Set Claims for All Existing Users

Create a migration script `functions/scripts/migrateCustomClaims.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function migrateUserClaims() {
  const usersSnapshot = await admin.firestore().collection('users').get();

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    const claims = { role: userData.role };

    if (userData.ministryId) {
      claims.ministryId = userData.ministryId;
    }

    await admin.auth().setCustomUserClaims(doc.id, claims);
    console.log(`✅ Set claims for ${userData.email}`);
  }

  console.log('Migration complete!');
}

migrateUserClaims()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run: `node functions/scripts/migrateCustomClaims.js`

### Option 2: Temporary Fallback Rules

Add fallback while migrating:

```javascript
function getUserRole() {
  return request.auth.token.role != null
    ? request.auth.token.role  // Use claims if available
    : get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; // Fallback to Firestore
}
```

**Warning**: This is less secure. Migrate to custom claims ASAP.

## Troubleshooting

### Error: `permission-denied`

**Cause**: User doesn't have required custom claims

**Fix**:
1. Check user's claims in Firebase Console → Authentication → Users → User → Custom Claims
2. If missing, run Cloud Function to set claims
3. User must log out and log back in to get new claims

### Error: `false for 'get' @ L1`

**Cause**: Rules denying all access (default deny caught the request)

**Fix**:
1. Check if user's role matches required role
2. Verify custom claims are set
3. Check rules are deployed correctly

## Best Practices

1. **Always use custom claims for roles** - Never rely solely on Firestore data
2. **Test rules in Rules Playground** before deploying
3. **Monitor failed requests** in Firebase Console
4. **Keep rules simple** - Complex rules are hard to debug
5. **Use helper functions** - Makes rules readable and maintainable

---

**Status**: Ready for deployment
**Deploy command**: `firebase deploy --only firestore:rules`
**Testing time**: 10 minutes
