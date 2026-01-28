# Testing Mode Setup Guide

## Changes Made for Testing

### 1. Email Validation Disabled ✅

**Removed .gov.ng email requirement** to allow personal emails during testing.

#### Files Modified:
- **[src/pages/MinistryRegistrationPage.tsx](src/pages/MinistryRegistrationPage.tsx:29-37)**
  - Commented out `.gov.ng` email validation
  - Updated placeholder: `your.email@gmail.com (testing mode)`
  - Updated helper text: `Testing mode: Any valid email accepted`

- **[src/pages/RegisterLandingPage.tsx](src/pages/RegisterLandingPage.tsx:120)**
  - Changed "Official .gov.ng email" → "Any valid email address (testing mode)"
  - Updated help section text

#### Before:
```typescript
officialEmail: yup
  .string()
  .required('Official email is required')
  .email('Must be a valid email address')
  .matches(
    /\.gov\.ng$/,
    'Must be an official government email ending with .gov.ng'
  ),
```

#### After (Testing Mode):
```typescript
officialEmail: yup
  .string()
  .required('Official email is required')
  .email('Must be a valid email address'),
  // TESTING: .gov.ng validation temporarily disabled
```

---

### 2. Cleanup Script Created ✅

**Script:** [scripts/cleanupTestAccounts.cjs](scripts/cleanupTestAccounts.cjs)

Safely deletes all user accounts **EXCEPT admin accounts** for testing.

#### What It Does:
1. ✅ Finds all users in Firestore
2. ✅ Identifies admin users (keeps them safe)
3. ✅ Deletes non-admin users from:
   - Firebase Auth
   - Firestore users collection
   - Ministry role arrays (uploaders/approvers)
4. ✅ Provides detailed progress and summary

#### Safety Features:
- **Admin accounts are NEVER deleted**
- 3-second countdown before starting
- 2-second countdown before deletion
- Detailed logging of all actions
- Error handling for each user
- Press Ctrl+C to cancel anytime

---

## How to Use

### **Step 1: Delete Test Accounts**

```bash
# Navigate to project directory
cd "c:\Users\Victor\assest db"

# Run the cleanup script
node scripts/cleanupTestAccounts.cjs
```

**Expected Output:**
```
🚀 Starting Test Accounts Cleanup...

================================================
This will DELETE all user accounts EXCEPT admin
⚠️  WARNING: This action is IRREVERSIBLE!
================================================

Starting in 3 seconds... Press Ctrl+C to cancel

📥 Fetching users from Firestore...
Found 5 users

👤 Admin users (will be KEPT): 1
   - admin@test.com (admin)

👥 Non-admin users (will be DELETED): 4
   - user1@gmail.com (agency)
   - user2@gmail.com (agency)
   - approver1@gmail.com (agency-approver)
   - approver2@gmail.com (agency-approver)

⚠️  About to delete 4 users...
Waiting 2 seconds... Press Ctrl+C to cancel

🗑️  Deleting user: user1@gmail.com (agency)
   ✓ Removed from ministry uploaders
   ✓ Deleted from Firestore
   ✓ Deleted from Firebase Auth
   ✅ User deleted successfully

[... continues for each user ...]

================================================
📊 CLEANUP SUMMARY
================================================
Total users before: 5
Admin users (kept): 1
✅ Successfully deleted: 4
❌ Failed to delete: 0
Remaining users: 1

✅ Deleted users:
   - user1@gmail.com
   - user2@gmail.com
   - approver1@gmail.com
   - approver2@gmail.com

✅ Cleanup completed!
✅ All done! Admin accounts preserved.
```

### **Step 2: Register Ministry with Personal Email**

1. Go to `http://localhost:3000/register`
2. Click **"Register Ministry/Agency"**
3. Fill in the form:
   - **Ministry Name:** "Test Ministry"
   - **Official Email:** `your.personal.email@gmail.com` ✅ (now accepted!)
   - **Ministry Type:** "Federal Ministry"
   - **Location:** "Abuja"
4. Submit registration
5. Login as admin and verify the ministry

### **Step 3: Register Staff with Personal Email**

1. Go to `http://localhost:3000/register`
2. Click **"Register as Ministry Staff"**
3. Fill in the form:
   - **Ministry:** Select "Test Ministry" (must be verified first)
   - **Role:** "Asset Uploader" or "Ministry Approver"
   - **Email:** `your.email@gmail.com` ✅
   - **Password:** Enter strong password
4. Submit registration
5. Verify email and login

---

## Reverting to Production Mode

When ready for production, **re-enable .gov.ng validation**:

### **1. Restore Email Validation**

Edit [src/pages/MinistryRegistrationPage.tsx](src/pages/MinistryRegistrationPage.tsx:29-37):

```typescript
// Change this:
officialEmail: yup
  .string()
  .required('Official email is required')
  .email('Must be a valid email address'),
  // TESTING: .gov.ng validation temporarily disabled

// Back to this:
officialEmail: yup
  .string()
  .required('Official email is required')
  .email('Must be a valid email address')
  .matches(
    /\.gov\.ng$/,
    'Must be an official government email ending with .gov.ng'
  ),
```

### **2. Restore UI Text**

- Change placeholder back to: `e.g., info@finance.gov.ng`
- Change helper text back to: `Must end with .gov.ng`
- Update RegisterLandingPage text back to `.gov.ng` requirements

---

## Important Notes

### ⚠️ **Admin Account Protection**
- The cleanup script will **NEVER** delete admin accounts
- Your central admin account is safe
- Script checks `role === 'admin'` before deletion

### ⚠️ **Data Deletion is Permanent**
- Deleted users cannot be recovered
- Use only in development/testing
- Always backup production data before cleanup

### ⚠️ **Ministry Role Arrays**
- Script automatically removes users from ministry role arrays
- Keeps ministry capacity accurate
- No orphaned user references

---

## Troubleshooting

### **Issue: "User not found in Firebase Auth"**
**Cause:** User was already deleted from Auth but still in Firestore
**Solution:** Script handles this automatically with a warning

### **Issue: "Permission denied"**
**Cause:** serviceAccountKey.json missing or invalid
**Solution:** Ensure serviceAccountKey.json is in the project root

### **Issue: "Ministry not found"**
**Cause:** User's ministry was already deleted
**Solution:** Script handles gracefully, continues deletion

---

## Testing Workflow

1. **Clean slate:**
   ```bash
   node scripts/cleanupTestAccounts.cjs
   ```

2. **Register test ministry:**
   - Use personal email (Gmail, Outlook, etc.)
   - Fill in test data

3. **Admin verifies ministry:**
   - Login as admin
   - Verify the test ministry

4. **Register test staff:**
   - Use personal emails
   - Join verified ministry

5. **Test the system:**
   - Upload assets
   - Approve/reject assets
   - Test workflows

6. **Repeat testing:**
   - Run cleanup script again
   - Register new test data
   - Continue testing

---

## Summary

✅ **Email validation disabled** - Use any email for testing
✅ **Cleanup script ready** - Delete test accounts safely
✅ **Admin accounts protected** - Never accidentally deleted
✅ **Easy to revert** - Uncomment validation for production

You can now test the system with your personal email addresses! 🎉

---

## Quick Commands

```bash
# Delete all test accounts (keeps admin)
node scripts/cleanupTestAccounts.cjs

# Run other migration scripts if needed
node scripts/migrateMinistryRoles.cjs
node scripts/migrateAssetMinistryId.cjs

# Seed admin account if needed
node scripts/seedFirestoreAdmin.cjs
```
