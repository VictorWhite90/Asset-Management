# Manual Database Seeding Guide

Since Firebase security rules are active, we'll seed data manually through Firebase Console.

---

## 🌱 Step 1: Seed Asset Categories

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/nigeria-asset-mgmt/firestore

2. **Click "Start collection"**

3. **Collection ID:** `categories`

4. **Add these 8 documents:**

### Document 1:
- **Document ID:** `office-equipment`
- **Fields:**
  - `id` (string): `office-equipment`
  - `name` (string): `Office Equipment`
  - `description` (string): `Asset category: Office Equipment`
  - `createdAt` (timestamp): [Click "Set to current time"]

### Document 2:
- **Document ID:** `furniture-fittings`
- **Fields:**
  - `id` (string): `furniture-fittings`
  - `name` (string): `Furniture & Fittings`
  - `description` (string): `Asset category: Furniture & Fittings`
  - `createdAt` (timestamp): [Click "Set to current time"]

### Document 3:
- **Document ID:** `motor-vehicle`
- **Fields:**
  - `id` (string): `motor-vehicle`
  - `name` (string): `Motor Vehicle`
  - `description` (string): `Asset category: Motor Vehicle`
  - `createdAt` (timestamp): [Click "Set to current time"]

### Document 4:
- **Document ID:** `plant-generator`
- **Fields:**
  - `id` (string): `plant-generator`
  - `name` (string): `Plant/Generator`
  - `description` (string): `Asset category: Plant/Generator`
  - `createdAt` (timestamp): [Click "Set to current time"]

### Document 5:
- **Document ID:** `building`
- **Fields:**
  - `id` (string): `building`
  - `name` (string): `Building`
  - `description` (string): `Asset category: Building`
  - `createdAt` (timestamp): [Click "Set to current time"]

### Document 6:
- **Document ID:** `land`
- **Fields:**
  - `id` (string): `land`
  - `name` (string): `Land`
  - `description` (string): `Asset category: Land`
  - `createdAt` (timestamp): [Click "Set to current time"]

### Document 7:
- **Document ID:** `stocks`
- **Fields:**
  - `id` (string): `stocks`
  - `name` (string): `Stocks`
  - `description` (string): `Asset category: Stocks`
  - `createdAt` (timestamp): [Click "Set to current time"]

### Document 8:
- **Document ID:** `others`
- **Fields:**
  - `id` (string): `others`
  - `name` (string): `Others`
  - `description` (string): `Asset category: Others`
  - `createdAt` (timestamp): [Click "Set to current time"]

---

## 🔐 Step 2: Create Admin User

### Method A: Register via the app and manually update

1. **Go to your app:** http://localhost:3000/register

2. **Register with:**
   - Agency Name: `Central Admin - Federal Republic of Nigeria`
   - Email: `admin@nigeria-asset-mgmt.gov.ng`
   - Password: `AdminSecure123!`
   - Region: `FCT (Abuja)`
   - Ministry Type: `Federal Ministry`

3. **Go to Firebase Console - Authentication:**
   https://console.firebase.google.com/project/nigeria-asset-mgmt/authentication/users

4. **Find the user you just created, copy the UID**

5. **Go to Firestore:**
   https://console.firebase.google.com/project/nigeria-asset-mgmt/firestore

6. **Navigate to: `users` collection → [your UID]**

7. **Edit the document and change:**
   - `role` (string): Change from `agency` to `admin`

8. **Save the document**

### Method B: Create directly in Firebase Console

1. **Go to Firebase Console - Authentication:**
   https://console.firebase.google.com/project/nigeria-asset-mgmt/authentication/users

2. **Click "Add user"**
   - Email: `admin@nigeria-asset-mgmt.gov.ng`
   - Password: `AdminSecure123!`
   - Click "Add user"

3. **Copy the generated User UID**

4. **Go to Firestore:**
   https://console.firebase.google.com/project/nigeria-asset-mgmt/firestore

5. **Click "Start collection"** (if no `users` collection exists)
   - Collection ID: `users`

6. **Click "Add document"**
   - **Document ID:** [Paste the UID you copied]
   - **Fields:**
     - `userId` (string): [Same UID]
     - `email` (string): `admin@nigeria-asset-mgmt.gov.ng`
     - `agencyName` (string): `Central Admin - Federal Republic of Nigeria`
     - `role` (string): `admin`
     - `region` (string): `FCT (Abuja)`
     - `ministryType` (string): `Federal Ministry`
     - `createdAt` (timestamp): [Click "Set to current time"]
     - `emailVerified` (boolean): `true`

---

## ✅ Verify Seeding

### Check Categories:
1. Go to Firestore console
2. Click `categories` collection
3. You should see 8 documents

### Check Admin User:
1. Go to Authentication console
2. You should see the admin user
3. Go to Firestore > `users` collection
4. Find admin user document
5. Verify `role` field is `admin`

---

## 🧪 Test Admin Login

1. Go to http://localhost:3000/login
2. Login with:
   - Email: `admin@nigeria-asset-mgmt.gov.ng`
   - Password: `AdminSecure123!`
3. You should see the dashboard
4. Role should show as "admin"

---

## ⚠️ Security Note

**IMPORTANT:** Change the admin password after first login!

The default password `AdminSecure123!` should only be used for initial setup.

---

## 📝 Quick Reference

### Admin Credentials (Default):
```
Email: admin@nigeria-asset-mgmt.gov.ng
Password: AdminSecure123!
Role: admin
```

### Categories (8 total):
1. Office Equipment
2. Furniture & Fittings
3. Motor Vehicle
4. Plant/Generator
5. Building
6. Land
7. Stocks
8. Others

---

**After seeding, you're ready for Phase 4!** 🚀
