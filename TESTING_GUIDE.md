# Testing Guide - Production Improvements

## 🧪 Complete Testing Checklist

### Test 1: SPA Routing & 404 Fix

**Test Case:** Verify no 404 errors on page refresh

**Steps:**
1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/dashboard`
3. Press F5 (refresh page)
4. **Expected:** Page stays on dashboard, no 404 error
5. Try other routes: `/register`, `/assets/upload`, etc.
6. **Expected:** All routes work on direct access/refresh

**Status:** ✅ PASS / ❌ FAIL

---

### Test 2: Email Verification Flow

**Test Case:** Verify complete email verification workflow

**Steps:**
1. Register new account:
   - Email: `test@agriculture.gov.ng`
   - Password: `Test123!`
   - Role: Asset Uploader
   - Agency: Ministry of Agriculture

2. Check email inbox
   - **Expected:** Email received (not in spam)
   - Subject should mention "Verify your email"

3. Click verification link
   - **Expected:** Redirected to `/auth/action`
   - See "Verifying your email..." message
   - See loading spinner

4. Wait for verification
   - **Expected:** Success icon appears
   - Message: "Email Verified!"
   - Alert: "Redirecting to login page..."

5. Auto-redirect occurs (2 seconds)
   - **Expected:** Redirected to `/login`
   - Success alert visible: "Email verified! Please sign in to continue."

6. Login with credentials
   - **Expected:** Successful login → Dashboard

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3: Registration Security

**Test Case:** Verify admin role cannot be self-registered

**Steps:**
1. Go to `/register`
2. Click "Your Role" dropdown
3. **Expected:** Only see:
   - Asset Uploader
   - Agency Approver
   - Note: "Federal Administrator accounts are created by authorized personnel only"
4. **Expected:** NO admin option visible
5. Try to submit form with agency role
6. **Expected:** Registration succeeds

**Status:** ✅ PASS / ❌ FAIL

---

### Test 4: Login Flow with Success Message

**Test Case:** Verify login shows success message after email verification

**Steps:**
1. Complete email verification (Test 2)
2. On login page, check for success alert
   - **Expected:** Green alert box visible
   - Message: "Email verified! Please sign in to continue."
3. Login with credentials
4. **Expected:** Redirect to dashboard

**Status:** ✅ PASS / ❌ FAIL

---

### Test 5: Role-Based Access Control

**Test Case:** Verify users can only access their permitted routes

**Setup:** Create 3 accounts:
- Uploader: `uploader@test.gov.ng`
- Approver: `approver@test.gov.ng`
- Admin: Use seed script

**Test 5A: Uploader Permissions**
1. Login as uploader
2. Try to access:
   - `/assets/upload` → ✅ Should work
   - `/assets/bulk-upload` → ✅ Should work
   - `/assets/my-assets` → ✅ Should work
   - `/approver/review-uploads` → ❌ Should be blocked
   - `/admin/assets` → ❌ Should be blocked

**Test 5B: Approver Permissions**
1. Login as approver
2. Try to access:
   - `/approver/review-uploads` → ✅ Should work
   - `/assets/upload` → ❌ Should be blocked
   - `/admin/assets` → ❌ Should be blocked

**Test 5C: Admin Permissions**
1. Login as admin
2. Try to access:
   - `/admin/assets` → ✅ Should work
   - `/assets/upload` → ❌ Should be blocked
   - `/approver/review-uploads` → ❌ Should be blocked

**Status:** ✅ PASS / ❌ FAIL

---

### Test 6: Security Headers (Production)

**Test Case:** Verify security headers in production build

**Steps:**
1. Build production: `npm run build`
2. Preview: `npm run preview`
3. Open Chrome DevTools → Network tab
4. Load any page
5. Click on document request → Headers tab
6. **Expected Headers:**
   ```
   x-content-type-options: nosniff
   x-frame-options: DENY
   x-xss-protection: 1; mode=block
   referrer-policy: strict-origin-when-cross-origin
   ```

**Status:** ✅ PASS / ❌ FAIL

---

### Test 7: Complete Approval Workflow

**Test Case:** End-to-end asset approval workflow

**Steps:**
1. **Upload (as agency uploader):**
   - Login as uploader
   - Upload an asset
   - Check status: Should be "PENDING"
   - **Expected:** Asset visible in "My Assets" → Pending tab

2. **Review (as agency approver):**
   - Logout, login as approver
   - Go to "Review Pending Uploads"
   - **Expected:** See the uploaded asset
   - Click "Approve"
   - **Expected:** Success message, asset removed from list

3. **View (as admin):**
   - Logout, login as admin
   - Go to "View All Assets"
   - **Expected:** See the approved asset (with status "APPROVED")

4. **Verify uploader sees approval:**
   - Logout, login as uploader
   - Go to "My Assets" → Approved tab
   - **Expected:** Asset now shows "APPROVED" status

**Status:** ✅ PASS / ❌ FAIL

---

### Test 8: Error Handling

**Test Case:** Verify graceful error handling

**Test 8A: Invalid Email Verification Link**
1. Go to `/auth/action?mode=verifyEmail&oobCode=INVALID_CODE`
2. **Expected:**
   - Red error icon
   - Message: "This verification link has expired or already been used."
   - "Go to Login" button

**Test 8B: Login with Wrong Password**
1. Go to `/login`
2. Enter valid email, wrong password
3. **Expected:**
   - Red alert box
   - Message: "Invalid email or password"
   - No system crash

**Test 8C: Register with Existing Email**
1. Try to register with an already-used email
2. **Expected:**
   - Error message: "This email is already in use"
   - Form stays on page

**Status:** ✅ PASS / ❌ FAIL

---

### Test 9: Performance Test

**Test Case:** Verify acceptable performance

**Steps:**
1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open Chrome DevTools → Lighthouse
4. Run audit (Desktop mode)
5. **Expected Scores:**
   - Performance: > 90
   - Accessibility: > 90
   - Best Practices: > 90
   - SEO: > 80

**Status:** ✅ PASS / ❌ FAIL

---

### Test 10: Mobile Responsiveness

**Test Case:** Verify mobile-friendly design

**Steps:**
1. Open DevTools → Toggle device toolbar
2. Test on:
   - iPhone 12/13 (390x844)
   - Samsung Galaxy S21 (360x800)
   - iPad (768x1024)
3. Navigate through:
   - Registration page
   - Login page
   - Dashboard
   - Asset upload form
4. **Expected:**
   - No horizontal scroll
   - All buttons clickable
   - Text readable
   - Forms usable

**Status:** ✅ PASS / ❌ FAIL

---

## 🎯 Quick Smoke Test (5 minutes)

For rapid testing after changes:

```bash
# 1. Start dev server
npm run dev

# 2. Open browser to localhost:3000

# 3. Quick checks:
✅ Register new account
✅ Check email arrives
✅ Click verification link
✅ See success message on login page
✅ Login successfully
✅ Upload an asset
✅ Refresh page (no 404)
✅ Logout

# 4. Build test
npm run build
npm run preview

# 5. Final checks:
✅ All routes work
✅ No console errors
```

---

## 📊 Test Results Template

| Test # | Test Name | Status | Notes | Date |
|--------|-----------|--------|-------|------|
| 1 | SPA Routing | ✅ PASS | | |
| 2 | Email Verification | ✅ PASS | | |
| 3 | Registration Security | ✅ PASS | | |
| 4 | Login Success Message | ✅ PASS | | |
| 5 | RBAC | ✅ PASS | | |
| 6 | Security Headers | ✅ PASS | | |
| 7 | Approval Workflow | ✅ PASS | | |
| 8 | Error Handling | ✅ PASS | | |
| 9 | Performance | ✅ PASS | | |
| 10 | Mobile Responsive | ✅ PASS | | |

---

## 🐛 Bug Reporting Template

If you find issues during testing:

```
**Bug ID:** [Unique ID]
**Test Case:** [Which test revealed this]
**Severity:** Critical / High / Medium / Low
**Description:** [Clear description]
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:** [If applicable]
**Browser:** [Chrome 120, Firefox 121, etc.]
**Environment:** [Dev / Staging / Production]
```

---

## ✅ Sign-Off

**Tested By:** _______________
**Date:** _______________
**Environment:** Dev / Staging / Production
**Overall Status:** ✅ PASS / ❌ FAIL

**Notes:**
_________________________________
_________________________________
_________________________________

---

**Document Version:** 1.0.0
**Last Updated:** January 8, 2026
