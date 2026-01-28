# Firestore Composite Index Setup Guide

## What Are Composite Indexes?

Firestore composite indexes are required when querying with multiple conditions. This system uses two queries that need indexes:

1. **Duplicate Approver Check** - Prevents multiple approvers for same agency + region
2. **Review Uploads Filter** - Shows approvers only uploads from their agency + region

## When You'll See Index Errors

You'll encounter index creation prompts in these scenarios:

### Scenario 1: First Approver Registration
**When:** Someone tries to register as an approver for the first time
**Where:** Registration page
**Error Message:**
```
9 FAILED_PRECONDITION: The query requires an index.
You can create it here: https://console.firebase.google.com/...
```

### Scenario 2: First Time Viewing Review Uploads
**When:** An approver clicks "Review Uploads" for the first time
**Where:** Review Uploads page
**Error Message:**
```
9 FAILED_PRECONDITION: The query requires an index.
You can create it here: https://console.firebase.google.com/...
```

## How to Create Indexes (Step-by-Step)

### Method 1: Automatic (Recommended)

1. **Trigger the Error**
   - Perform the action that needs the index (e.g., register approver or view review uploads)

2. **Look for the Error Message**
   - Check browser console (F12 → Console tab)
   - Or check the error displayed on screen

3. **Click the Link**
   - The error message contains a blue clickable link
   - Example: `https://console.firebase.google.com/project/your-project/database/firestore/indexes?create_composite=...`

4. **Firebase Creates the Index**
   - You'll be taken to Firebase Console
   - The index configuration will be pre-filled
   - Click "Create Index" button

5. **Wait for Build**
   - Index status shows "Building..."
   - Usually takes 2-5 minutes
   - Status changes to "Enabled" when ready

6. **Retry the Action**
   - Go back to your app
   - Try the action again
   - It should work now!

### Method 2: Manual (If you want to create them in advance)

Go to Firebase Console and create these two indexes manually:

#### Index 1: Users Collection (For Duplicate Approver Check)
```
Collection: users
Fields:
  - role (Ascending)
  - agencyName (Ascending)
  - region (Ascending)
Query Scope: Collection
```

**How to create:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to: Firestore Database → Indexes tab
4. Click "Create Index"
5. Fill in:
   - Collection ID: `users`
   - Add field: `role` → Ascending
   - Add field: `agencyName` → Ascending
   - Add field: `region` → Ascending
   - Query scope: Collection
6. Click "Create"

#### Index 2: Assets Collection (For Review Uploads)
```
Collection: assets
Fields:
  - agencyName (Ascending)
  - region (Ascending)
  - status (Ascending)
Query Scope: Collection
```

**How to create:**
1. Same steps as above, but use:
   - Collection ID: `assets`
   - Add field: `agencyName` → Ascending
   - Add field: `region` → Ascending
   - Add field: `status` → Ascending
   - Query scope: Collection
2. Click "Create"

## Verification

After creating indexes, verify they're working:

### Test 1: Approver Registration
1. Register as approver for "Ministry of Works" + "Abuja"
2. Try to register another approver for same ministry + region
3. Should see: "An approver account already exists for Ministry of Works (Abuja)"

### Test 2: Review Uploads
1. Login as approver
2. Click "Review Uploads"
3. Should see pending uploads from your agency + region only
4. No error messages

## Troubleshooting

### Error Still Appears After Creating Index
- **Wait longer**: Index building can take up to 10 minutes for large datasets
- **Check status**: Go to Firebase Console → Firestore → Indexes → Verify status is "Enabled"
- **Clear cache**: Hard refresh your browser (Ctrl+Shift+R)

### Wrong Index Configuration
- **Delete it**: Go to Indexes tab → Click three dots → Delete
- **Recreate**: Use the automatic link method or manual steps above

### Index Building Failed
- **Check quotas**: Ensure you haven't exceeded Firestore limits
- **Try again**: Delete failed index and recreate

## Important Notes

✅ **One-time setup**: You only need to create each index ONCE per project
✅ **Automatic links**: Firebase generates the exact index configuration for you
✅ **No code changes**: No need to modify any code
✅ **Free tier**: Composite indexes are included in Firebase free tier
❌ **Don't skip**: Features won't work without these indexes

## Summary

**Quick Steps:**
1. Use the feature that needs an index
2. See error with link
3. Click link → Create index
4. Wait 2-5 minutes
5. Retry the action
6. Done!

**Total time:** ~5-10 minutes for both indexes combined
