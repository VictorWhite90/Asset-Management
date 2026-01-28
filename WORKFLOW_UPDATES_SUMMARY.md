# Asset Management Workflow Updates - Complete Summary

**Date:** January 28, 2026  
**Changes Made:** Complete workflow restructuring from direct federal approval to multi-tier ministry-based approval

---

## 🎯 New Workflow Architecture

### Previous Workflow (❌ DEPRECATED)
```
Uploader → Approver → Federal Admin (DIRECT APPROVAL)
```

### New Workflow (✅ IMPLEMENTED)
```
Uploader → Approver → Ministry Admin → Federal Admin
   |          |           |              |
 pending   approve &    review &      final
 (status)  send to      approve/      approval
           ministry      reject
```

---

## 📊 Asset Status Types

### Updated AssetStatus Type
**File:** `src/types/asset.types.ts`

```typescript
export type AssetStatus = 'pending' | 'pending_ministry_review' | 'approved' | 'rejected';
```

**Status Flow:**
- `pending` → Awaiting approver review (initial upload)
- `pending_ministry_review` → Approver approved, sent to ministry admin for final review
- `approved` → Ministry admin approved, ready for federal submission
- `rejected` → Rejected at either approver or ministry level

---

## 🔄 Asset Approval Workflow Fields

### New Asset Fields Added
**File:** `src/types/asset.types.ts`

```typescript
// Approver action
approvedBy?: string;                  // Agency approver user ID
approvedAt?: Timestamp;               // When approver approved it
sentToMinistryAdminBy?: string;       // Which approver sent it
sentToMinistryAdminAt?: Timestamp;    // When sent to ministry

// Ministry Admin action
approvedByMinistry?: string;          // Ministry admin user ID
approvedByMinistryAt?: Timestamp;     // When ministry admin approved

// Rejection tracking
rejectedBy?: string;                  // Who rejected it
rejectedAt?: Timestamp;               
rejectionReason?: string;
rejectionLevel?: 'approver' | 'ministry-admin' | 'federal-admin'; // Track rejection source
```

**Audit Trail:** All timestamps and user IDs are recorded for complete accountability

---

## 📝 Service Layer Updates

### New Functions in `asset.service.ts`

#### 1. **getAssetsForMinistryReview()**
```typescript
export const getAssetsForMinistryReview = async (ministryId: string): Promise<Asset[]>
```
- Gets assets with status `pending_ministry_review`
- Ministry admins use this to see what needs their approval
- Filters by ministry automatically

#### 2. **getAllMinistryAssets()**
```typescript
export const getAllMinistryAssets = async (ministryId: string): Promise<Asset[]>
```
- Gets ALL assets (all statuses) for a ministry
- Used by ministry admin to see complete asset inventory
- Includes pending, approved, and rejected assets

#### 3. **approveAssetByMinistry()**
```typescript
export const approveAssetByMinistry = async (
  assetId: string,
  ministryAdminId: string,
  ministryAdminEmail?: string,
  agencyName?: string
): Promise<void>
```
- Ministry admin approves an asset
- Sets status to `approved`
- Records approver info and timestamp
- Logs action in audit trail

#### 4. **rejectAssetByMinistry()**
```typescript
export const rejectAssetByMinistry = async (
  assetId: string,
  ministryAdminId: string,
  rejectionReason: string,
  ministryAdminEmail?: string,
  agencyName?: string
): Promise<void>
```
- Ministry admin rejects an asset
- Sets status to `rejected`
- Records rejection reason and level
- Logs action with details

#### 5. **Updated approveAsset()**
- NOW sends to `pending_ministry_review` instead of directly approving
- Records both approver and ministry admin tracking fields
- Audit log notes: "sent to Ministry Admin"

#### 6. **Updated rejectAsset()**
- Added `rejectionLevel` parameter to track who rejected it
- Can be called by approver or ministry admin

---

## 🔐 Security Rules Updates

### Firestore Rules Changes
**File:** `firestore.rules`

#### Asset Read Permissions
```plaintext
- Federal admin: Can read ALL assets
- Uploaders: Can read ONLY their own assets
- Approvers: Can read ALL assets from their ministry
- Ministry Admin: Can read ALL assets from their ministry (read-only)
```

#### Asset Update Permissions

**Uploaders:**
- Can only update their own `pending` or `rejected` assets
- CANNOT edit approved or under-review assets
- Prevents tampering after approver review

**Approvers:**
- Can update assets in their ministry with status `pending` only
- Can modify: status, approvedBy, approvedAt, sentToMinistryAdminBy, sentToMinistryAdminAt, rejectionReason, rejectedBy, rejectedAt, rejectionLevel
- Cannot edit approved assets

**Ministry Admin:**
- Can update assets from their ministry with status `pending_ministry_review` only
- Can modify: status, approvedByMinistry, approvedByMinistryAt, rejectionReason, rejectedBy, rejectedAt, rejectionLevel
- Cannot edit other statuses
- Cannot edit base asset data

**Federal Admin:**
- Can update ANY asset
- No restrictions

---

## 📱 UI Components Implemented

### 1. ViewUploadsPage.tsx (NEW)
**Route:** `/assets/view-uploads`  
**Access:** Uploaders and Approvers

**Features:**
- ✅ Displays user's uploads or ministry assets
- ✅ 3-tab interface: Pending | Approved | Rejected
- ✅ Search functionality (Asset ID, Description, Category, Location)
- ✅ View full asset details in modal dialog
- ✅ Edit button for uploaders on pending/rejected assets
- ✅ Shows audit trail (who uploaded, who approved, when)
- ✅ Displays rejection reasons if rejected

**Status Badges:**
- Pending: Yellow with clock icon
- Ministry Review: Blue with pending icon
- Approved: Green with checkmark
- Rejected: Red with X icon

### 2. Enhanced MinistryAdminDashboardPage.tsx
**Updated Assets Tab with 3 Sub-tabs:**

#### Tab 1: Pending Ministry Review
- Shows assets awaiting ministry admin approval
- Assets sent by approvers appear here
- Shows: Asset ID, Description, Category, Value, Uploaded By, Approved By
- **Actions:**
  - ✅ Approve button (green checkmark) - Sets status to `approved`
  - ❌ Reject button (red X) - Opens rejection dialog
- **Rejection Dialog:** Captures detailed rejection reason

#### Tab 2: Approved Assets
- Shows only `approved` assets
- Summary stats: Count and total value
- **Submit Button:** "Submit All" to send to Federal Admin (coming soon)
- Table shows: Asset ID, Description, Category, Value, Status

#### Tab 3: All Assets
- Complete view of all ministry assets (all statuses)
- Color-coded status chips:
  - Pending: Orange with clock
  - Ministry Review: Blue with pending icon
  - Approved: Green with checkmark
  - Rejected: Red with X icon
- Shows: Asset ID, Description, Category, Value, Status, Uploaded By

---

## 🎯 User Permissions Summary

### Uploader (role: `agency`)
- ✅ Can upload assets (status: `pending`)
- ✅ Can view their own uploads via ViewUploadsPage
- ✅ Can edit their own `pending` or `rejected` assets
- ❌ Cannot edit approved/under-review assets
- ❌ Cannot approve or reject assets
- ❌ Cannot access Ministry or Federal dashboards

### Approver (role: `agency-approver`)
- ✅ Can view all assets from their ministry via ViewUploadsPage
- ✅ Can approve assets (sets status to `pending_ministry_review`)
- ✅ Can reject assets with reason (sets status to `rejected`)
- ✅ Can see rejected assets with rejection reason
- ✅ Can see assets sent to ministry admin
- ❌ Cannot edit asset data
- ❌ Cannot access Ministry or Federal dashboards

### Ministry Admin (role: `ministry-admin`)
- ✅ Can view ALL assets from their ministry
- ✅ Can approve assets (sets status to `approved`)
- ✅ Can reject assets with detailed reason
- ✅ Can see complete workflow (uploaded by → approved by → sent to ministry)
- ✅ Can generate ministry-scoped reports
- ✅ Can manage staff (approve, reject, change roles)
- ✅ Access to: Overview, Staff Management, Assets, Reports tabs
- ❌ Cannot edit asset data
- ❌ Cannot access Federal Admin dashboard

### Federal Admin (role: `admin`)
- ✅ Can view ALL assets across all ministries
- ✅ Can access all dashboards
- ✅ Can generate global reports
- ✅ Can manage ministries
- ✅ Can manage users
- ✅ No restrictions on updates

---

## 📋 Audit Trail Records

### Actions Logged
Each action records:
- `userId`: Who performed the action
- `userEmail`: Their email
- `agencyName`: Their ministry/agency
- `userRole`: Their role
- `action`: Type of action (asset.upload, asset.approve, asset.reject, etc.)
- `timestamp`: When it happened
- `details`: Description of what happened
- `metadata`: Additional context (asset IDs, values, reasons, etc.)

### Example Log Entries
```
1. Uploader uploads asset:
   Action: asset.upload
   Details: "Uploaded asset: Toyota Corolla (Motor Vehicle)"

2. Approver approves and sends to ministry:
   Action: asset.approve
   Details: "Approved asset and sent to Ministry Admin: Toyota Corolla (AE-23-001)"

3. Ministry admin approves final:
   Action: asset.approve_by_ministry
   Details: "Approved asset at Ministry level: Toyota Corolla (AE-23-001)"

4. Ministry admin rejects:
   Action: asset.reject_by_ministry
   Details: "Rejected asset at ministry level: Toyota Corolla - Reason: Missing depreciation details"
```

---

## 🚀 Routes Updated

### New Route Added
- **Route:** `/assets/view-uploads`
- **Component:** `ViewUploadsPage.tsx`
- **Protection:** ProtectedRoute + RoleBasedRoute
- **Allowed Roles:** `agency`, `agency-approver`

### Updated Routes
- `/dashboard` - Shows role-based dashboard (includes stats about pending ministry reviews for admins)
- `/ministry-admin/dashboard` - Now shows 3 asset tabs instead of just approved assets

---

## 🔧 Migration Notes

### Breaking Changes
1. **Asset Status Values Changed**
   - Old: `pending` → `approved` → (Federal Admin sees it)
   - New: `pending` → `pending_ministry_review` → `approved` → (Federal Admin sees it)
   - Migration: Existing `approved` assets should be left as-is or marked as `approved`

2. **Approver Role Changes**
   - Old: Approver could mark assets as fully `approved`
   - New: Approver now sends to `pending_ministry_review` for ministry admin review

### Data Considerations
- Existing assets with status `approved` are valid and don't need changes
- Audit logs will have new action types for ministry-level operations
- No database migration required - new fields are optional and back-compatible

---

## ✅ Testing Checklist

### Uploader Tests
- [ ] Upload asset → appears as `pending`
- [ ] View uploads → shows in Pending tab
- [ ] Edit pending asset → changes saved
- [ ] View rejected asset → shows rejection reason
- [ ] Edit rejected asset → can resubmit
- [ ] Cannot view ministry dashboard
- [ ] Cannot approve/reject assets

### Approver Tests
- [ ] View all ministry assets → ViewUploadsPage shows them
- [ ] Approve asset → status becomes `pending_ministry_review`
- [ ] Reject asset → status becomes `rejected`, reason saved
- [ ] Approved assets appear in approver's list with approval details
- [ ] Cannot edit asset data
- [ ] Cannot access ministry dashboard

### Ministry Admin Tests
- [ ] View all ministry assets → Dashboard tab 3 shows all
- [ ] Pending Ministry Review tab → shows pending_ministry_review assets
- [ ] Approve asset → status becomes `approved`
- [ ] Reject asset → opens dialog, captures reason, status becomes `rejected`
- [ ] Can see full workflow: uploader → approver → ministry
- [ ] Can generate reports scoped to ministry
- [ ] Submit button ready for federal submission

### Federal Admin Tests
- [ ] Access all dashboards
- [ ] View all assets from all ministries
- [ ] Can view complete audit trail
- [ ] Can generate global reports with ministry filtering
- [ ] Can see all approval workflows

### Security Tests
- [ ] Uploader cannot edit approved assets
- [ ] Uploader cannot see other ministry assets
- [ ] Approver cannot edit asset data
- [ ] Approver cannot approve ministry-level
- [ ] Ministry admin cannot access federal dashboard
- [ ] Firestore rules enforce all restrictions

---

## 📚 Related Documentation
- See `MINISTRY_ADMIN_IMPLEMENTATION.md` for staff management details
- See `FIRESTORE_SECURITY_RULES.md` for complete security rule documentation
- See `SYSTEM_ANALYSIS.md` for overall system architecture
- See `PHASE_10_IMPLEMENTATION_SUMMARY.md` for user management updates

---

## 🎯 Next Steps (NOT IMPLEMENTED IN THIS UPDATE)

1. **Report Generation System** (Priority 1)
   - Ministry-scoped reports
   - Federal-scoped reports
   - PDF/Excel exports
   - Charts and visualizations

2. **Cloud Functions Updates** (Priority 1)
   - Update approval workflows in Firebase Functions
   - Add email notifications for approval stages
   - Batch submission to Federal Admin

3. **API Endpoint** (Priority 2)
   - Create submit-to-federal endpoint
   - Handle batch asset transfers
   - Update status tracking

4. **UI Enhancements** (Priority 2)
   - Add export/download functionality
   - Add bulk actions
   - Add workflow visualization
   - Add status timeline view

---

**Status:** ✅ **IMPLEMENTATION COMPLETE - CORE WORKFLOW**  
**Remaining:** Reporting system and Cloud Functions updates needed for full feature completion
