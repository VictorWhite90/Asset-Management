# Vercel Deployment Guide - Nigeria Government Asset Management System

## Prerequisites

Before deploying, ensure you have:

1. A [Vercel account](https://vercel.com/signup) (free tier works)
2. [Node.js 18+](https://nodejs.org/) installed locally
3. Your Firebase project configured and running
4. Git repository pushed to GitHub, GitLab, or Bitbucket

---

## Step 1: Prepare Your Repository

### 1.1 Ensure `.gitignore` includes sensitive files

Your `.gitignore` should already include:

```
node_modules
dist
.env
.env.local
```

### 1.2 Verify the build works locally

Open a terminal in the project root and run:

```bash
npm install
npm run build
```

This runs `tsc && vite build` and outputs to the `dist/` folder. Fix any TypeScript or build errors before proceeding.

### 1.3 Push your code to a Git provider

If you haven't already:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

---

## Step 2: Configure Vercel

### 2.1 Import your project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your repository (e.g., `assest-db` or whatever you named it)
4. Click **Import**

### 2.2 Configure build settings

Vercel usually auto-detects Vite projects. Verify these settings:

| Setting              | Value           |
|----------------------|-----------------|
| **Framework Preset** | Vite            |
| **Build Command**    | `npm run build` |
| **Output Directory** | `dist`          |
| **Install Command**  | `npm install`   |
| **Node.js Version**  | 18.x or 20.x   |

### 2.3 Add Environment Variables

This is the most important step. Go to **Settings > Environment Variables** and add each of these:

| Variable Name                        | Value                              |
|--------------------------------------|------------------------------------|
| `VITE_FIREBASE_API_KEY`              | Your Firebase API key              |
| `VITE_FIREBASE_AUTH_DOMAIN`          | `your-project-id.firebaseapp.com`  |
| `VITE_FIREBASE_PROJECT_ID`          | Your Firebase project ID           |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `your-project-id.appspot.com`      |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your messaging sender ID           |
| `VITE_FIREBASE_APP_ID`              | Your Firebase app ID               |

**Where to find these values:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon > **Project settings**
4. Scroll to **"Your apps"** section
5. Copy each value from the Firebase config object

**Important:** Do NOT add `VITE_USE_EMULATORS` or set it to `false`. Emulators are for local development only.

### 2.4 Click Deploy

Click the **"Deploy"** button. Vercel will:
1. Clone your repository
2. Install dependencies (`npm install`)
3. Run the build (`npm run build`)
4. Deploy the `dist/` folder to their CDN

---

## Step 3: Configure SPA Routing

Since this is a single-page application using React Router, you need to tell Vercel to route all paths to `index.html`. Create a `vercel.json` file in the project root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This prevents 404 errors when users navigate directly to routes like `/dashboard`, `/login`, `/admin/assets`, etc.

After creating this file, commit and push it:

```bash
git add vercel.json
git commit -m "Add Vercel SPA routing config"
git push origin main
```

Vercel will automatically redeploy when you push.

---

## Step 4: Update Firebase Auth Domain

After your first deploy, Vercel gives you a URL like `your-app.vercel.app`. You need to authorize this domain in Firebase.

### 4.1 Add authorized domain for Authentication

1. Go to [Firebase Console](https://console.firebase.google.com) > **Authentication**
2. Click **Settings** tab
3. Under **Authorized domains**, click **Add domain**
4. Add your Vercel domain: `your-app.vercel.app`
5. If you have a custom domain, add that too

### 4.2 Update Firebase Auth Domain (if using custom domain)

If you set up a custom domain (e.g., `assets.gov.ng`), update the `VITE_FIREBASE_AUTH_DOMAIN` environment variable in Vercel to match.

---

## Step 5: Deploy Firestore Rules and Indexes

Firestore security rules and indexes are deployed separately from the frontend. Run these from your local machine:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

---

## Step 6: Deploy Cloud Functions (if applicable)

If you have Cloud Functions in the `functions/` directory:

```bash
# Deploy Cloud Functions
firebase deploy --only functions
```

Note: Cloud Functions run on Firebase infrastructure, not Vercel. Only the frontend is deployed to Vercel.

---

## Step 7: Set Up Custom Domain (Optional)

### 7.1 In Vercel Dashboard

1. Go to your project in Vercel
2. Click **Settings > Domains**
3. Enter your custom domain (e.g., `assets.yourdomain.com`)
4. Follow the DNS configuration instructions:
   - Add a **CNAME** record pointing to `cname.vercel-dns.com`
   - Or for root domains, add an **A** record pointing to `76.76.21.21`

### 7.2 Update Firebase authorized domains

Add your custom domain to Firebase Authentication > Settings > Authorized domains.

---

## Environment-Specific Deployments

### Preview Deployments

Vercel automatically creates preview deployments for every pull request. These use the same environment variables as production by default.

To use different Firebase projects for staging vs production:

1. In Vercel, go to **Settings > Environment Variables**
2. When adding variables, select which environments they apply to:
   - **Production** - your main/live Firebase project
   - **Preview** - a staging Firebase project (optional)
   - **Development** - for local Vercel CLI usage

### Production vs Preview Firebase Projects

If you want separate Firebase projects:

| Environment | Firebase Project           |
|-------------|---------------------------|
| Production  | `ngams-production`         |
| Preview     | `ngams-staging` (optional) |
| Local Dev   | Emulators or dev project   |

Set different `VITE_FIREBASE_*` values for each environment in Vercel's settings.

---

## Troubleshooting

### Build fails with TypeScript errors

Run `npm run build` locally first and fix all errors before pushing.

### 404 errors on page refresh

Make sure `vercel.json` with the rewrite rule exists (see Step 3).

### Firebase Auth errors ("auth/unauthorized-domain")

Add your Vercel domain to Firebase Authentication > Settings > Authorized domains (see Step 4).

### Environment variables not working

- All Firebase env vars must start with `VITE_` for Vite to expose them to the client
- After changing env vars in Vercel, you must **redeploy** (Vercel > Deployments > redeploy latest)
- Double-check for typos in variable names

### Blank page after deploy

1. Check browser console for errors (F12 > Console)
2. Verify all `VITE_FIREBASE_*` env vars are set in Vercel
3. Make sure the build command is `npm run build` (not just `vite build`, since you need `tsc` first)

### "firebase-admin" module errors in build

The `firebase-admin` package in `package.json` is for server-side scripts only. It should not be imported anywhere in your `src/` code. If the build complains about it, ensure no file in `src/` imports from `firebase-admin`.

### Large bundle size warning

The app uses code splitting via `vite.config.ts` (`manualChunks`). If you see warnings about large chunks, this is expected for MUI + Firebase. The chunking is already configured to split vendor code.

---

## Deployment Checklist

Before every deployment:

- [ ] `npm run build` succeeds locally with no errors
- [ ] All environment variables are set in Vercel
- [ ] `vercel.json` exists with SPA rewrite rule
- [ ] Vercel domain is added to Firebase authorized domains
- [ ] Firestore rules are deployed (`firebase deploy --only firestore:rules`)
- [ ] Firestore indexes are deployed (`firebase deploy --only firestore:indexes`)
- [ ] Cloud Functions are deployed (if changed)
- [ ] Test login/registration on the deployed URL
- [ ] Test asset upload and approval workflow
- [ ] Check browser console for errors

---

## Continuous Deployment

Once connected, Vercel automatically deploys:

- **Every push to `main`** triggers a production deployment
- **Every pull request** gets a preview deployment with its own URL
- **Environment variables** are injected at build time

No additional CI/CD setup is needed.

---

## Cost Considerations

### Vercel Free Tier (Hobby)
- Unlimited static site deployments
- 100 GB bandwidth/month
- Automatic HTTPS
- Suitable for development and small-scale use

### Vercel Pro ($20/month)
- Higher bandwidth limits
- Team collaboration features
- Password protection for preview deployments
- Recommended for production government use

### Firebase Costs (separate)
- Firestore: 50K reads/day free, then $0.06 per 100K reads
- Authentication: Free for most auth methods
- Cloud Functions: 2M invocations/month free
- Storage: 5 GB free

---

## Quick Deploy Summary

```bash
# 1. Build locally to verify
npm run build

# 2. Create vercel.json (if not exists)
echo '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' > vercel.json

# 3. Push to Git
git add .
git commit -m "Deploy to Vercel"
git push origin main

# 4. In Vercel Dashboard:
#    - Import repo
#    - Add VITE_FIREBASE_* env vars
#    - Deploy

# 5. Add Vercel domain to Firebase Auth authorized domains

# 6. Deploy Firestore rules
firebase deploy --only firestore:rules,firestore:indexes
```
