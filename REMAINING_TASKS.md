# Remaining Tasks to Complete Ministry Admin Implementation

## 🎯 Quick Overview

**Status:** 75% Complete
**Remaining:** 3 critical tasks
**Time:** ~2-3 hours

---

## ✅ Task 1: Add Routes to App.tsx

**File:** `src/App.tsx`

**Add these routes:**

```typescript
// Public route for ministry admin registration
<Route path="/register-ministry-admin" element={<RegisterMinistryAdminPage />} />

// Protected route for ministry admin dashboard
<Route
  path="/ministry-admin/dashboard"
  element={
    <ProtectedRoute requireEmailVerification>
      <RoleBasedRoute allowedRoles={['ministry-admin']}>
        <MinistryAdminDashboardPage />
      </RoleBasedRoute>
    </ProtectedRoute>
  }
/>

// Update ministry registration to be protected
<Route
  path="/register-ministry"
  element={
    <ProtectedRoute requireEmailVerification>
      <RoleBasedRoute allowedRoles={['ministry-admin']}>
        <MinistryRegistrationPage />
      </RoleBasedRoute>
    </ProtectedRoute>
  }
/>
```

**Don't forget to import:**
```typescript
import RegisterMinistryAdminPage from '@/pages/RegisterMinistryAdminPage';
import MinistryAdminDashboardPage from '@/pages/MinistryAdminDashboardPage';
```

---

## ✅ Task 2: Update RegisterLandingPage

**File:** `src/pages/RegisterLandingPage.tsx`

**Add a new card/button for Ministry Admin registration:**

```typescript
<Card>
  <CardContent>
    <Typography variant="h6">Ministry Administrator</Typography>
    <Typography variant="body2">
      Register as a ministry admin to manage your ministry
    </Typography>
    <Button
      variant="contained"
      component={Link}
      to="/register-ministry-admin"
    >
      Register as Ministry Admin
    </Button>
  </CardContent>
</Card>
```

---

## ✅ Task 3: Update DashboardPage

**File:** `src/pages/DashboardPage.tsx`

**Add conditional rendering for ministry admin:**

```typescript
// After email verification check, add this for ministry admins:
{userData?.role === 'ministry-admin' && (
  <>
    {/* If not yet approved by federal admin */}
    {userData.accountStatus === 'pending_verification' && (
      <Alert severity="info">
        Your ministry admin account is pending federal admin approval.
      </Alert>
    )}

    {/* If approved but no ministry yet */}
    {userData.accountStatus === 'verified' && !userData.isMinistryOwner && (
      <Button
        variant="contained"
        component={Link}
        to="/register-ministry"
      >
        Register Your Ministry
      </Button>
    )}

    {/* If has ministry */}
    {userData.isMinistryOwner && (
      <Button
        variant="contained"
        component={Link}
        to="/ministry-admin/dashboard"
      >
        Manage Staff
      </Button>
    )}
  </>
)}
```

---

## ✅ Task 4: Update AdminVerificationsPage (Optional but Recommended)

**File:** `src/pages/AdminVerificationsPage.tsx`

**Add tab for Ministry Admin approvals:**

1. Import `getPendingMinistryAdmins, approveMinistryAdmin, rejectMinistryAdmin`
2. Add state for pending ministry admins
3. Add new tab "Ministry Admins"
4. Display list with approve/reject buttons

**Quick implementation:**
```typescript
// Add to existing tabs
<Tab label={`Ministry Admins (${pendingMinistryAdmins.length})`} />

// Add tab panel
<TabPanel value={tabValue} index={2}>
  {pendingMinistryAdmins.map(admin => (
    <Box key={admin.userId}>
      <Typography>{admin.email} - {admin.agencyName}</Typography>
      <Button onClick={() => approveMinistryAdmin(admin.userId, currentUser.uid)}>
        Approve
      </Button>
      <Button onClick={() => handleRejectMinistryAdmin(admin)}>
        Reject
      </Button>
    </Box>
  ))}
</TabPanel>
```

---

## ✅ Task 5: Test the Complete Flow

### **Test 1: Ministry Admin Registration**
1. Go to `/register-ministry-admin`
2. Fill form and submit
3. Verify email
4. Login
5. Should see "pending approval" message on dashboard

### **Test 2: Federal Admin Approves Ministry Admin**
1. Login as federal admin
2. Go to verifications page
3. See pending ministry admin
4. Approve them

### **Test 3: Ministry Admin Registers Ministry**
1. Login as approved ministry admin
2. Go to `/register-ministry` (or click button on dashboard)
3. Fill ministry form
4. Submit

### **Test 4: Federal Admin Approves Ministry**
1. Login as federal admin
2. Go to ministries page
3. Approve the ministry

### **Test 5: Staff Registers**
1. Go to `/register-staff`
2. Select the verified ministry
3. Choose role (uploader/approver)
4. Register and verify email
5. Status should be `pending_ministry_approval`

### **Test 6: Ministry Admin Approves Staff**
1. Login as ministry admin
2. Go to `/ministry-admin/dashboard`
3. See pending staff
4. Approve them

### **Test 7: Staff Can Work**
1. Login as approved staff
2. Should be able to upload/approve assets

---

## 🔧 Optional Enhancements

1. **Email Notifications:**
   - Hook up notification service when staff approved/rejected
   - Notify ministry admin when new staff registers

2. **Dashboard Statistics:**
   - Show count of pending approvals on ministry admin dashboard

3. **Bulk Actions:**
   - Allow ministry admin to approve multiple staff at once

4. **Transfer Ownership:**
   - Allow transferring ministry ownership to another admin

---

## 📝 Final Checks Before Testing

- [ ] All routes added to App.tsx
- [ ] Register landing page updated
- [ ] Dashboard page updated for ministry admin
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Firebase deployed (if testing in production)

---

## 🐛 Troubleshooting

**Issue:** Can't access `/register-ministry` after login
- **Fix:** Check user role is `ministry-admin` and `accountStatus` is `verified`

**Issue:** Ministry admin dashboard shows no pending users
- **Fix:** Make sure staff verified email (status should be `pending_ministry_approval`)

**Issue:** Staff can't register under ministry
- **Fix:** Ensure ministry status is `verified` by federal admin

---

**Good luck with testing!** 🚀
