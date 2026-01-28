# Phase 10: User Management & Audit Trail - Implementation Plan

## 🎯 Objectives

Implement comprehensive user management and activity tracking to provide:
1. Self-service user profile management
2. Complete audit trail of all system actions
3. Admin user management capabilities
4. Enhanced security and accountability

**Target Completeness:** 80% → 90%

---

## 🔍 Gap Analysis

### Current State
- ✅ User registration with role selection
- ✅ Email verification
- ✅ Role-based access control
- ❌ No user profile page
- ❌ No password change functionality
- ❌ No activity audit trail
- ❌ No admin user management
- ❌ No user activity history

### Target State
- ✅ Complete user profile management
- ✅ Self-service password change
- ✅ Activity audit trail (all actions logged)
- ✅ Admin user management dashboard
- ✅ User activity history view
- ✅ Account security features

---

## 📋 Features to Implement

### 1. User Profile Page (`/profile`)
**Priority:** HIGH | **Effort:** 4 hours

**Features:**
- View user information (email, agency, role, region)
- Edit agency name (with approval workflow)
- Change password with verification
- View account creation date
- Email verification status
- Activity summary (total uploads, approvals, etc.)

**Components:**
- `ProfilePage.tsx` - Main profile view
- Profile information cards
- Password change dialog
- Edit profile form

**Security:**
- Current password required for changes
- Email verification for sensitive changes
- Audit log for profile updates

---

### 2. Activity Audit Trail System
**Priority:** HIGH | **Effort:** 6 hours

**Features:**
- Log all user actions:
  - Asset uploads
  - Asset approvals
  - Asset rejections
  - Asset edits/resubmissions
  - Login/logout
  - Profile changes
- Activity history page (`/activity`)
- Filters: date range, action type, status
- Export activity log to Excel
- Admin view of all activities system-wide

**Database Schema:**
```typescript
interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  agencyName: string;
  action: AuditAction; // 'upload', 'approve', 'reject', 'edit', 'login', etc.
  resourceType: 'asset' | 'user' | 'system';
  resourceId?: string; // Asset ID, User ID, etc.
  details: string; // Human-readable description
  metadata?: Record<string, any>; // Additional data
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

type AuditAction =
  | 'asset.upload'
  | 'asset.approve'
  | 'asset.reject'
  | 'asset.edit'
  | 'asset.view'
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.profile.update'
  | 'user.password.change';
```

**Components:**
- `ActivityLogPage.tsx` - View activity history
- `auditLog.service.ts` - Audit logging service
- Activity timeline component
- Activity filters

**Integration Points:**
- Hook into existing actions (upload, approve, reject, edit)
- Add logging calls to all critical operations
- Store in Firestore `audit_logs` collection

---

### 3. Admin User Management (`/admin/users`)
**Priority:** MEDIUM | **Effort:** 5 hours

**Features:**
- View all registered users
- Filter by role, region, verification status
- Search by email or agency name
- View user details (profile, activity)
- Disable/enable user accounts
- View user statistics (uploads, approvals)
- Change user roles (with confirmation)
- Export user list to Excel

**Components:**
- `AdminUsersPage.tsx` - User management dashboard
- User list table with filters
- User details modal/page
- Role change dialog
- Account status toggle

**Security:**
- Admin role only
- Require confirmation for destructive actions
- Audit all admin actions
- Cannot disable self

---

### 4. Change Password Feature
**Priority:** HIGH | **Effort:** 2 hours

**Features:**
- Change password dialog/page
- Current password verification
- New password validation (strength requirements)
- Confirm new password
- Success notification
- Auto-logout other sessions (optional)

**Components:**
- `ChangePasswordDialog.tsx` - Password change form
- Integrated into ProfilePage

**Security:**
- Must verify current password
- Strong password requirements enforced
- Audit password changes
- Rate limiting (prevent brute force)

---

## 🗂️ Files to Create

### New Pages (4 files)
1. `src/pages/ProfilePage.tsx` - User profile management
2. `src/pages/ActivityLogPage.tsx` - Activity history
3. `src/pages/AdminUsersPage.tsx` - Admin user management
4. `src/pages/UserDetailsPage.tsx` - Individual user details (admin)

### New Services (2 files)
1. `src/services/auditLog.service.ts` - Audit logging functions
2. `src/services/user.service.ts` - User management functions

### New Types (1 file)
1. `src/types/auditLog.types.ts` - Audit log type definitions

### New Components (3 files)
1. `src/components/ChangePasswordDialog.tsx` - Password change form
2. `src/components/ActivityTimeline.tsx` - Activity display component
3. `src/components/UserStatsCard.tsx` - User statistics display

### Modified Files (5 files)
1. `src/App.tsx` - Add new routes
2. `src/pages/DashboardPage.tsx` - Add link to profile
3. `src/services/asset.service.ts` - Add audit logging
4. `src/services/auth.service.ts` - Add audit logging
5. `firebase.json` - Update security rules (if needed)

---

## 🔒 Security Considerations

### Authentication & Authorization
- ✅ Profile page - authenticated users only
- ✅ Activity log - users see only their own (admins see all)
- ✅ Admin user management - admin role only
- ✅ Password change - current password required
- ✅ Profile edits - audit logged

### Data Privacy
- ✅ Users cannot see other users' data
- ✅ Activity logs show only relevant information
- ✅ Sensitive data (passwords) never logged
- ✅ IP addresses stored only for security purposes

### Audit Trail Integrity
- ✅ Audit logs are append-only
- ✅ Cannot delete audit logs (admin can archive)
- ✅ Timestamps are server-side (Firestore serverTimestamp)
- ✅ All critical actions logged

---

## 📊 Database Changes

### New Collection: `audit_logs`
```
audit_logs/
  {logId}/
    userId: string
    userEmail: string
    agencyName: string
    action: string
    resourceType: string
    resourceId: string (optional)
    details: string
    metadata: object (optional)
    timestamp: timestamp
    ipAddress: string (optional)
    userAgent: string (optional)
```

### New Collection: `users` (enhance existing)
```
users/
  {userId}/
    accountStatus: 'active' | 'disabled'
    lastLoginAt: timestamp
    activityCount: number
    createdAt: timestamp
```

### Firestore Indexes Required
```
audit_logs:
  - userId + timestamp (DESC)
  - action + timestamp (DESC)
  - userId + action + timestamp (DESC)

users:
  - role + accountStatus
  - region + role
```

---

## 🎨 UI/UX Design

### Profile Page Layout
```
┌─────────────────────────────────────┐
│  Profile                        [Edit]│
│                                       │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ Avatar/Icon │  │ User Info     │  │
│  │             │  │ Email         │  │
│  │             │  │ Agency        │  │
│  │             │  │ Role          │  │
│  └─────────────┘  │ Region        │  │
│                   └──────────────┘  │
│                                       │
│  ┌───────────────────────────────┐  │
│  │ Account Statistics            │  │
│  │ - Total Uploads: 45           │  │
│  │ - Approved: 40                │  │
│  │ - Pending: 3                  │  │
│  │ - Rejected: 2                 │  │
│  └───────────────────────────────┘  │
│                                       │
│  [Change Password]  [View Activity]  │
└─────────────────────────────────────┘
```

### Activity Log Layout
```
┌─────────────────────────────────────┐
│  Activity History                    │
│                                       │
│  Filters: [Date] [Action] [Status]  │
│                                       │
│  Timeline:                            │
│  ● Asset Uploaded - 2 hours ago      │
│    "Toyota Camry 2020"                │
│  ● Asset Approved - 1 day ago        │
│    "HP Laptop"                        │
│  ● Login - 3 days ago                │
│                                       │
│  [Load More]                          │
└─────────────────────────────────────┘
```

### Admin Users Page Layout
```
┌─────────────────────────────────────┐
│  User Management              [Export]│
│                                       │
│  Search: [________]  Role: [All ▼]   │
│                                       │
│  Users (125):                         │
│  ┌─────────────────────────────────┐│
│  │ Email         Agency    Role    ││
│  │ user@gov.ng  Agriculture agency ││
│  │ [View] [Edit Role] [Disable]    ││
│  └─────────────────────────────────┘│
│                                       │
│  Pagination: 1 2 3 ... 10            │
└─────────────────────────────────────┘
```

---

## 🔄 Implementation Order

### Day 1: Audit Trail System (6 hours)
1. Create `auditLog.types.ts` (30 min)
2. Create `auditLog.service.ts` (2 hours)
3. Integrate audit logging into existing services (2 hours)
4. Create `ActivityLogPage.tsx` (1.5 hours)

**Deliverable:** All actions are logged, users can view their activity

### Day 2: User Profile (4 hours)
1. Create `ProfilePage.tsx` (2 hours)
2. Create `ChangePasswordDialog.tsx` (1.5 hours)
3. Add routes and navigation (30 min)

**Deliverable:** Users can view/edit profile and change password

### Day 3: Admin User Management (5 hours)
1. Create `user.service.ts` (1 hour)
2. Create `AdminUsersPage.tsx` (2.5 hours)
3. Create `UserDetailsPage.tsx` (1 hour)
4. Add admin routes and navigation (30 min)

**Deliverable:** Admins can manage all users

---

## ✅ Acceptance Criteria

### User Profile
- [ ] Users can view their complete profile
- [ ] Users can change their password
- [ ] Password change requires current password
- [ ] Profile shows account statistics
- [ ] Email verification status visible
- [ ] Profile edits are audited

### Activity Audit Trail
- [ ] All critical actions are logged
- [ ] Users can view their activity history
- [ ] Activity can be filtered by date/action
- [ ] Activity log shows clear, human-readable descriptions
- [ ] Admins can view all system activity
- [ ] Activity log can be exported

### Admin User Management
- [ ] Admins can view all users
- [ ] Users can be filtered/searched
- [ ] User details accessible
- [ ] User roles can be changed (with audit)
- [ ] User accounts can be disabled
- [ ] Cannot disable self
- [ ] All admin actions audited

---

## 🧪 Testing Strategy

### Unit Tests
- Audit log service functions
- Password validation
- User search/filter logic

### Integration Tests
- Complete audit logging workflow
- Profile update workflow
- Password change workflow
- Admin user management workflow

### E2E Tests
1. User registers → audit log created
2. User uploads asset → audit log created
3. User changes password → audit log created
4. Admin views all users → sees complete list
5. Admin changes user role → audit log created

---

## 📈 Impact Assessment

**Before Phase 10:**
- System Completeness: 80%
- No user self-service
- No activity tracking
- No admin user tools
- Limited accountability

**After Phase 10:**
- System Completeness: 90% ✅
- Complete user self-service ✅
- Full activity audit trail ✅
- Comprehensive admin tools ✅
- Bank-level accountability ✅
- Production-ready for government deployment ✅

---

## 🚀 Deployment Considerations

### Firestore Rules Update
```javascript
match /audit_logs/{logId} {
  // Users can read their own logs
  allow read: if request.auth != null &&
              (resource.data.userId == request.auth.uid ||
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');

  // Only server can write logs (via service)
  allow write: if false; // Use admin SDK
}
```

### Performance
- Audit logs can grow large → implement pagination
- Index on userId + timestamp for fast queries
- Consider archiving old logs (>1 year)
- Cache user statistics for dashboard

### Monitoring
- Track audit log write failures
- Monitor user management actions
- Alert on suspicious activity (multiple failed logins)
- Track password change frequency

---

## 🎯 Success Metrics

1. **Audit Coverage:** 100% of critical actions logged
2. **User Adoption:** >80% users access profile page
3. **Password Changes:** Regular password updates
4. **Admin Efficiency:** <5 min to manage user issues
5. **Accountability:** Full audit trail for compliance

---

**Phase 10 Estimated Time:** 15 hours (~2 days)

**Ready to Start Implementation?** ✅

---

**Document Version:** 1.0.0
**Created:** January 9, 2026
**Phase:** 10 - User Management & Audit Trail
**Status:** Planning Complete
