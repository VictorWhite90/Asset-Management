# Ministry Admin Implementation - Complete Guide

## Overview

This implementation adds **Ministry Admin** role and hierarchical approval workflow to the Nigeria Government Asset Management System.

---

## ✅ What's Been Implemented

###  **1. Type System Updates**

#### Files Modified:
- `src/types/user.types.ts` - Added `ministry-admin` role and `pending_ministry_approval` status
- `src/types/ministry.types.ts` - Added ministry ownership tracking

**New User Role:**
```typescript
export type UserRole = 'agency' | 'agency-approver' | 'ministry-admin' | 'admin';
```

**New Account Statuses:**
```typescript
export type AccountStatus =
  | 'pending_verification'        // Email not verified yet
  | 'pending_ministry_approval'   // Email verified, waiting for ministry admin approval
  | 'verified'                    // Approved and active
  | 'rejected';                   // Rejected
```

---

### **2. Backend Services**

#### Auth Service (`src/services/auth.service.ts`)
**New Functions:**
- `registerMinistryAdmin()` - Creates ministry admin account
- `getPendingMinistryAdmins()` - Gets pending ministry admins (for federal admin)
- `approveMinistryAdmin()` - Federal admin approves ministry admin
- `rejectMinistryAdmin()` - Federal admin rejects ministry admin
- Updated `syncEmailVerificationStatus()` - Auto-sets staff to `pending_ministry_approval` after email verification

#### Ministry Service (`src/services/ministry.service.ts`)
**New Functions:**
- `createMinistryByAdmin()` - Authenticated ministry creation by ministry admin
  - Validates uniqueness (name, email)
  - Ensures one ministry per admin
  - Links ministry to owner
  - Updates owner's user document

**Deprecated:**
- `createMinistry()` - Old unauthenticated method (kept for backward compatibility)

#### User Service (`src/services/user.service.ts`)
**New Functions:**
- `getPendingUsersForMinistry()` - Gets staff pending ministry admin approval
- `approveUserByMinistryAdmin()` - Ministry admin approves staff
- `rejectUserByMinistryAdmin()` - Ministry admin rejects staff
- `removeUserFromMinistry()` - Ministry admin removes staff

---

### **3. UI Pages**

#### New Pages Created:

1. **RegisterMinistryAdminPage.tsx** (`/register-ministry-admin`)
   - Ministry admin registration form
   - Full name, email, password fields
   - Email verification sent after registration

2. **MinistryAdminDashboardPage.tsx** (`/ministry-admin/dashboard`)
   - View pending staff registrations
   - Approve/reject staff with reasons
   - View all active staff
   - Remove staff from ministry
   - Two tabs: Pending Approvals & All Staff

#### Updated Pages:

3. **MinistryRegistrationPage.tsx** (`/register-ministry`)
   - Now requires authentication
   - Permission checks:
     - Must be ministry-admin role
     - Must have verified email
     - Must be approved by federal admin
     - Cannot already own a ministry
   - Uses `createMinistryByAdmin()` service

---

### **4. New Approval Hierarchy**

```
🏛️ Federal Admin (Super Admin)
    ↓ (verifies ministry admins & ministries)
👔 Ministry Admin (Ministry Owner)
    ↓ (approves staff registrations)
👤 Uploaders & Approvers (Ministry Staff)
```

---

## 🔄 Registration Workflows

### **Ministry Admin Registration:**
```
1. Visit /register-ministry-admin
2. Fill form (name, email, password)
3. Verify email
4. Login
5. Federal admin approves ministry admin account
6. Visit /register-ministry (logged in)
7. Fill ministry details
8. Ministry pending federal admin approval
9. Federal admin approves ministry
10. Ministry admin can now approve staff!
```

### **Staff Registration (Uploader/Approver):**
```
1. Visit /register-staff
2. Select verified ministry
3. Choose role (uploader or approver)
4. Fill form and submit
5. Verify email → Status: pending_ministry_approval
6. Ministry admin approves
7. Status: verified → Staff can now work!
```

---

## 📋 Remaining Tasks

### **Critical (Must Complete):**
1. ⏳ **Update Federal Admin Verification Page** - Add tab for ministry admin approvals
2. ⏳ **Update App.tsx Routes** - Add new routes for ministry admin pages
3. ⏳ **Update RegisterLandingPage** - Add link to ministry admin registration
4. ⏳ **Update Firestore Security Rules** - Add rules for ministry admin permissions

### **Recommended (Should Complete):**
5. ⏳ **Update DashboardPage** - Add ministry admin dashboard link
6. ⏳ **Update Navigation** - Add ministry admin menu items based on role

---

## 🗂️ Files Summary

### **Created (3 files):**
1. `src/pages/RegisterMinistryAdminPage.tsx` - Ministry admin registration
2. `src/pages/MinistryAdminDashboardPage.tsx` - Staff management dashboard
3. `MINISTRY_ADMIN_IMPLEMENTATION.md` - This documentation

### **Modified (6 files):**
1. `src/types/user.types.ts` - Added ministry-admin role
2. `src/types/ministry.types.ts` - Added ownership tracking
3. `src/services/auth.service.ts` - Added ministry admin functions
4. `src/services/ministry.service.ts` - Added createMinistryByAdmin
5. `src/services/user.service.ts` - Added ministry admin approval functions
6. `src/pages/MinistryRegistrationPage.tsx` - Now requires authentication

---

## 🧪 Testing Checklist

### **Ministry Admin Flow:**
- [ ] Register as ministry admin at `/register-ministry-admin`
- [ ] Verify email
- [ ] Login
- [ ] Check dashboard shows "pending approval" message
- [ ] Federal admin approves ministry admin
- [ ] Visit `/register-ministry` (should be accessible)
- [ ] Register ministry
- [ ] Federal admin approves ministry
- [ ] Ministry admin can access `/ministry-admin/dashboard`

### **Staff Flow:**
- [ ] Register as uploader/approver at `/register-staff`
- [ ] Select verified ministry
- [ ] Verify email
- [ ] Check status is `pending_ministry_approval`
- [ ] Ministry admin sees user in pending list
- [ ] Ministry admin approves user
- [ ] User status changes to `verified`
- [ ] User can now access upload/approval features

### **Ministry Admin Dashboard:**
- [ ] Can view pending staff
- [ ] Can approve staff
- [ ] Can reject staff with reason
- [ ] Can view all active staff
- [ ] Can remove staff with optional reason
- [ ] Cannot remove self

---

## 📊 Database Schema Changes

### **Users Collection:**
```typescript
{
  role: 'ministry-admin',           // New role
  accountStatus: 'pending_ministry_approval',  // New status
  isMinistryOwner: true,            // New field
  ownedMinistryId: 'ministry_123',  // New field
}
```

### **Ministries Collection:**
```typescript
{
  ownerId: 'user_123',              // New field (ministry admin user ID)
  ownerEmail: 'admin@example.com',  // New field
  ownerName: 'John Doe',            // New field
}
```

---

## 🔒 Permissions Matrix

| Action | Federal Admin | Ministry Admin | Uploader | Approver |
|--------|---------------|----------------|----------|----------|
| Approve Ministry Admins | ✅ | ❌ | ❌ | ❌ |
| Approve Ministries | ✅ | ❌ | ❌ | ❌ |
| Register Ministry | ❌ | ✅ | ❌ | ❌ |
| Approve Staff | ❌ | ✅ | ❌ | ❌ |
| Remove Staff | ❌ | ✅ | ❌ | ❌ |
| Upload Assets | ❌ | ❌ | ✅ | ❌ |
| Approve Assets | ❌ | ❌ | ❌ | ✅ |
| View All Ministry Assets | ❌ | ✅ (read-only) | ❌ | ❌ |

---

## 🚀 Next Steps to Complete

1. **Add routes to App.tsx:**
   ```typescript
   <Route path="/register-ministry-admin" element={<RegisterMinistryAdminPage />} />
   <Route path="/ministry-admin/dashboard" element={<ProtectedRoute><MinistryAdminDashboardPage /></ProtectedRoute>} />
   ```

2. **Update AdminVerificationsPage.tsx:**
   - Add tab for "Ministry Admin Approvals"
   - Show pending ministry admins
   - Allow federal admin to approve/reject

3. **Update RegisterLandingPage:**
   - Add button/link for "Register as Ministry Admin"

4. **Update Firestore Rules:**
   - Add rules for ministry admin role
   - Secure ministry admin dashboard access

5. **Update DashboardPage:**
   - Show link to ministry admin dashboard for ministry admins
   - Show ministry registration link for verified ministry admins without ministry

---

## 💡 Key Design Decisions

1. **One Admin Per Ministry:** Each ministry can only have one admin (1:1 relationship)
2. **Two-Step Ministry Admin Approval:**
   - Step 1: Federal admin approves ministry admin account
   - Step 2: Federal admin approves ministry registration
3. **Auto Status Change:** When staff verify email, status automatically changes to `pending_ministry_approval`
4. **Hierarchical Approval:** Federal admin → Ministry admin → Staff (clear chain of command)
5. **Audit Logging:** All approvals/rejections logged for compliance

---

## 🐛 Known Issues / Limitations

- Ministry admin cannot transfer ownership
- No bulk approval for pending staff
- No email notifications for approvals yet (infrastructure exists, needs integration)

---

## 📞 Support

For questions or issues during testing:
1. Check this documentation
2. Review audit logs in Firestore
3. Check user `accountStatus` and `role` fields
4. Verify ministry `ownerId` field is set correctly

---

**Status:** 75% Complete - Core functionality implemented, needs routing and security rules
**Last Updated:** January 17, 2026
