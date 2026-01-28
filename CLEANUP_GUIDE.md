# Database Cleanup Guide

## Understanding the "Permission Denied" Error

The error **"You do not have permission to perform this action"** appears because:

1. **Email Not Verified**: Your Firebase account's email is not verified (`emailVerified: false`)
2. **Firestore Security Rules**: The database requires verified emails for certain operations
3. **First Login Issue**: Sometimes user data doesn't load properly on the first login

### Solution Options:

**Option 1: Verify Your Email**
- Check your email inbox for verification link from Firebase
- Click the verification link
- Refresh the dashboard
- If you didn't receive it, resend verification from Firebase Console

**Option 2: Manual Verification (Firebase Console)**
1. Go to Firebase Console → Authentication
2. Find your user account
3. Click the 3-dot menu → Edit user
4. Toggle "Email verified" to ON
5. Refresh your dashboard

**Option 3: Start Fresh** (Recommended - see below)

---

## How to Delete All Users and Start Fresh

### Prerequisites

1. **Download Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project: "nigeria-asset-mgmt"
   - Go to Project Settings (gear icon) → Service Accounts
   - Click "Generate New Private Key"
   - Save the file as `serviceAccountKey.json` in your project root
   - **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore`

2. **Add to .gitignore:**
   ```
   serviceAccountKey.json
   ```

### Running the Cleanup Script

**Step 1: View Current Users**
```bash
node scripts/cleanupDatabase.cjs
```

This will show you:
- List of all registered users
- Their emails, agencies, roles, verification status
- Total count of users, assets, and audit logs

**Step 2: Confirm Deletion**
- The script will ask: `Are you sure? (yes/no):`
- Type `yes` and press Enter to proceed
- Type `no` to cancel

**Step 3: What Gets Deleted**
- ✓ All user documents from Firestore (`users` collection)
- ✓ All asset documents from Firestore (`assets` collection)
- ✓ All audit logs from Firestore (`auditLogs` collection)
- ✓ All user accounts from Firebase Authentication

**Step 4: After Cleanup**
- You'll see "Cleanup completed successfully!"
- All statistics will show 0
- You can now register fresh accounts

---

## Quick Fix Without Cleanup

If you just want to fix the current account:

### Method 1: Via Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to Authentication → Users
3. Find `kingzvictorfx@gmail.com`
4. Click the 3-dot menu → Edit user
5. Enable "Email verified"
6. Save and refresh your app

### Method 2: Update Firestore Directly
1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to Firestore Database
3. Navigate to: `users` → (your user document)
4. Click Edit (pencil icon)
5. Change `emailVerified` from `false` to `true`
6. Save and refresh your app

---

## Why Two Different Dashboards?

You saw two different screens because:

1. **First Screen** (Permission Error):
   - Email wasn't verified yet
   - Firebase security rules blocked access
   - User data might not have loaded completely

2. **Second Screen** (Working Dashboard):
   - After going back and signing in again
   - The app re-checked your credentials
   - User data loaded properly this time
   - BUT you still have `emailVerified: false` in Firestore

The app is working, but some features require email verification.

---

## Recommended Steps

1. **Option A - Quick Fix (5 minutes)**
   - Go to Firebase Console
   - Set `emailVerified: true` for your account
   - Refresh the dashboard
   - Continue using the app

2. **Option B - Fresh Start (10 minutes)**
   - Place `serviceAccountKey.json` in project root
   - Run `node scripts/cleanupDatabase.cjs`
   - Type `yes` to confirm deletion
   - Register a new account
   - Verify email immediately
   - Start fresh with clean data

---

## Troubleshooting

**If cleanup script fails:**
```bash
# Make sure you're in the project directory
cd "c:\Users\Victor\assest db"

# Check if firebase-admin is installed
npm list firebase-admin

# If not installed, run:
npm install firebase-admin

# Run the script again
node scripts/cleanupDatabase.cjs
```

**If you get "service account not found" error:**
- You need to download `serviceAccountKey.json` from Firebase Console
- Place it in the project root directory (same folder as package.json)

**If you want to keep categories but delete users:**
- Edit the script and comment out the categories deletion line
- The categories collection will be preserved

---

## Security Note

⚠️ **NEVER commit `serviceAccountKey.json` to Git!**

This file has admin access to your Firebase project. Always keep it:
- In `.gitignore`
- Never share it
- Never commit it to version control
- Keep it secure on your local machine only

---

## Need Help?

If you encounter any issues:
1. Check the error message in the console
2. Verify `serviceAccountKey.json` exists in project root
3. Check Firebase Console for permissions
4. Try the manual verification method first (easiest)
