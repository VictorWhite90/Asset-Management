# Ministry-Based Structure Migration Guide

## Overview

This guide explains how to migrate your existing asset management system to the new ministry-based structure.

## What Changed?

### Before (Old Structure)
- Users registered directly with manual ministry/agency input
- No role uniqueness enforcement
- Potential for typos and inconsistent ministry names
- No central ministry management

### After (New Structure)
- **Two-tier registration:**
  1. Ministry registers first → Admin verifies → Becomes active
  2. Users register under verified ministries → Select role
- **Role uniqueness:** Only ONE uploader and ONE approver per ministry
- **Dropdown selection:** No more typos in ministry names
- **Proper relationships:** Users linked to ministries via `ministryId`

## Migration Process

### Prerequisites

1. Ensure you have a backup of your Firestore database
2. Ensure `.env` file is configured with Firebase credentials
3. Node.js is installed

### Step 1: Run the Migration Script

```bash
node scripts/migrateToMinistryStructure.cjs
```

### What the Script Does

1. **Fetches all existing users** from Firestore
2. **Groups users by agency** (agencyName + ministryType + location)
3. **Creates ministry documents** for each unique agency:
   - Auto-generates official email: `info@ministry-name.gov.ng`
   - Sets status to "verified" (existing agencies are trusted)
   - Tracks role assignments (hasUploader, hasApprover)
   - Records which users are assigned to which roles
4. **Updates user documents** with `ministryId` field
5. **Skips admin users** (admins don't belong to ministries)

### Step 2: Verify the Migration

1. **Check Firestore Console:**
   - Go to Firebase Console → Firestore Database
   - Verify `ministries` collection exists
   - Check that each ministry has correct data:
     - name, officialEmail, ministryType, location
     - hasUploader, hasApprover (boolean flags)
     - uploaderUserId, approverUserId (user IDs)

2. **Check User Documents:**
   - Verify users have `ministryId` field
   - Admins should NOT have `ministryId`

### Step 3: Update Official Emails (Optional)

The migration script auto-generates official emails in format:
```
info@ministry-name.gov.ng
```

If these don't match your actual ministry emails, you can update them:

1. Go to **Admin Dashboard** → **Manage Ministries**
2. Find the ministry
3. Contact your database admin to update the email manually via Firestore Console

### Step 4: Test the New Flow

1. **Ministry Registration:**
   - Go to `/register-ministry`
   - Try registering a new ministry
   - Verify it appears as "Pending" in admin panel

2. **Admin Verification:**
   - Login as admin
   - Go to **Manage Ministries**
   - Verify or reject the pending ministry

3. **User Registration:**
   - Go to `/register`
   - Select a verified ministry from dropdown
   - Select a role (Uploader or Approver)
   - Verify role availability checking works
   - Try registering when role is already taken (should be disabled)

4. **Role Uniqueness:**
   - Try to register a second uploader for a ministry that already has one
   - Role should be disabled with "(Taken)" badge

## Features Available After Migration

### For Admins

**Ministry Management (`/admin/ministries`):**
- View all ministry registrations
- Filter by status (All, Pending, Verified, Rejected, Suspended)
- Verify pending ministries
- Reject ministries with reason
- Suspend/reactivate ministries
- See role assignment status (Uploader: Assigned/Available, Approver: Assigned/Available)

### For Users

**Registration Flow:**
1. Ministry must register first at `/register-ministry`
2. Admin verifies the ministry
3. Users can then register at `/register` and select their verified ministry
4. Each ministry can have only ONE uploader and ONE approver

## Troubleshooting

### Issue: User can't find their ministry in dropdown

**Solution:**
- Ministry must be verified by admin first
- Check admin panel → Manage Ministries
- Verify the ministry if it's pending

### Issue: Role shows as "Taken" but shouldn't be

**Solution:**
- Check ministry document in Firestore
- Verify `hasUploader` or `hasApprover` boolean flags
- Check if `uploaderUserId` or `approverUserId` points to an existing user
- If user was deleted, manually update ministry flags

### Issue: Migration script fails

**Solution:**
- Check Firebase credentials in `.env`
- Ensure Firestore security rules allow reads/writes
- Check console for specific error messages
- Ensure you have network connectivity to Firebase

### Issue: Duplicate ministries created

**Solution:**
- The script groups by `agencyName + ministryType + location`
- If these fields vary slightly, duplicates may be created
- Manually merge duplicates in Firestore and update user `ministryId` references

## Database Schema

### Ministries Collection

```typescript
{
  ministryId: string;           // Auto-generated document ID
  name: string;                 // e.g., "Federal Ministry of Finance"
  officialEmail: string;        // e.g., "info@finance.gov.ng"
  ministryType: string;         // e.g., "Federal Ministry"
  location: string;             // e.g., "Abuja"
  status: 'pending_verification' | 'verified' | 'rejected' | 'suspended';
  createdAt: Timestamp;
  verifiedAt?: Timestamp;
  verifiedBy?: string;          // Admin user ID
  rejectedAt?: Timestamp;
  rejectedBy?: string;
  rejectionReason?: string;
  hasUploader: boolean;         // Is uploader role assigned?
  hasApprover: boolean;         // Is approver role assigned?
  uploaderUserId?: string;      // User ID of the uploader
  approverUserId?: string;      // User ID of the approver
}
```

### Users Collection (Updated)

```typescript
{
  userId: string;
  email: string;
  ministryId: string;           // ← NEW: Reference to ministry document
  ministryType: string;
  agencyName: string;
  location: string;
  role: 'agency' | 'agency-approver' | 'admin';
  createdAt: Timestamp;
  emailVerified: boolean;
  accountStatus?: 'pending_verification' | 'verified' | 'rejected';
  // ... other fields
}
```

## Rollback (Emergency Only)

If you need to rollback the migration:

1. **Remove ministryId from users:**
   ```javascript
   // Run in Firebase Console
   db.collection('users').get().then(snapshot => {
     snapshot.forEach(doc => {
       doc.ref.update({ ministryId: firebase.firestore.FieldValue.delete() });
     });
   });
   ```

2. **Delete ministries collection:**
   ```javascript
   // Run in Firebase Console
   db.collection('ministries').get().then(snapshot => {
     snapshot.forEach(doc => doc.ref.delete());
   });
   ```

3. **Restore from backup** if available

## Support

If you encounter issues:
1. Check Firestore security rules
2. Review console error messages
3. Verify Firebase configuration
4. Check the migration script output for warnings

## Next Steps After Migration

1. ✅ Review all migrated ministries in admin panel
2. ✅ Update official emails if needed
3. ✅ Test ministry registration flow
4. ✅ Test user registration flow
5. ✅ Test role uniqueness enforcement
6. ✅ Train admins on ministry verification process
7. ✅ Communicate new registration process to users
