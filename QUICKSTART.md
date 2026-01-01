# Quick Start Guide - Nigeria Asset Management System

## ⚡ Fast Setup (5 Minutes)

### 1. Install Dependencies (1 min)

```bash
npm install
```

### 2. Create Firebase Project (2 min)

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it: `nigeria-asset-mgmt`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 3. Enable Firebase Services (1 min)

#### Enable Authentication:
1. Click "Authentication" in sidebar
2. Click "Get started"
3. Click "Email/Password"
4. Toggle "Enable"
5. Click "Save"

#### Enable Firestore:
1. Click "Firestore Database" in sidebar
2. Click "Create database"
3. Select "Start in test mode"
4. Choose location: `europe-west` (closest to Nigeria)
5. Click "Enable"

#### Enable Storage:
1. Click "Storage" in sidebar
2. Click "Get started"
3. Click "Next" (keep test mode)
4. Click "Done"

### 4. Get Firebase Config (1 min)

1. Click the gear icon ⚙️ > "Project settings"
2. Scroll to "Your apps"
3. Click web icon `</>`
4. Nickname: `NGAMS`
5. Click "Register app"
6. **Copy the firebaseConfig object**

### 5. Set Environment Variables (30 sec)

Create `.env` file in project root:

```bash
# Copy .env.example to .env
copy .env.example .env
```

Open `.env` and paste your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_ENVIRONMENT=development
VITE_USE_EMULATORS=false
```

**For local development with emulators**, set:
```env
VITE_USE_EMULATORS=true
```

### 6. Start the App (10 sec)

```bash
npm run dev
```

Open http://localhost:3000

## 🧪 Optional: Use Firebase Emulators (Recommended for Testing)

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Login to Firebase

```bash
firebase login
```

### Initialize Firebase

```bash
firebase init
```

Select:
- Firestore ✅
- Functions ✅
- Hosting ✅
- Storage ✅
- Emulators ✅

Accept defaults and use existing files.

### Start Emulators

**Terminal 1:**
```bash
firebase emulators:start
```

**Terminal 2:**
```bash
npm run dev
```

Access:
- App: http://localhost:3000
- Emulator UI: http://localhost:4000

## ✅ Verify Setup

1. App loads without errors ✅
2. No console errors ✅
3. Theme colors are green (Nigerian flag) ✅

## 🚀 You're Ready!

**Current Status**: Phase 1 Complete ✅

**Next Step**: Prompt for Phase 2 (Authentication)

```bash
# When ready, tell me:
"Start Phase 2"
```

## 🆘 Common Issues

### Issue: Port 3000 already in use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in vite.config.ts
```

### Issue: Firebase config not found

- Make sure `.env` file exists
- Check that all `VITE_FIREBASE_*` variables are set
- Restart dev server after changing `.env`

### Issue: Module not found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.

## 🎯 Development Flow

```
Phase 1: Setup ✅ ← YOU ARE HERE
Phase 2: Authentication
Phase 3: Database & Security
Phase 4: Agency Upload
Phase 5: View Assets
Phase 6: Bulk Upload
Phase 7: Admin Dashboard
Phase 8: Filters & Search
Phase 9: Export
Phase 10: Cloud Functions
Phase 11: Security & Testing
Phase 12: Deployment
```

---

**Need Help?** Check README.md or ask for assistance!
