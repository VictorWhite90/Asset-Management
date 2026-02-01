/**
 * Cloud Functions for Nigeria Government Asset Management System
 *
 * Security-focused implementation using custom claims for role-based access control.
 * All approval workflows are server-side to prevent client tampering.
 */

import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Constants
const USERS_COLLECTION = 'users';
const MINISTRIES_COLLECTION = 'ministries';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

// Types
type UserRole = 'agency' | 'agency-approver' | 'ministry-admin' | 'admin';

type AccountStatus =
  | 'pending_verification'
  | 'pending_ministry_approval'
  | 'verified'
  | 'rejected'
  | 'disabled';

interface PendingMinistry {
  name: string;
  officialEmail: string;
  ministryType: string;
  location: string;
}

interface User {
  userId: string;
  email: string;
  name?: string;
  ministryId: string;
  ministryType: string;
  agencyName: string;
  location: string;
  role: UserRole;
  emailVerified: boolean;
  accountStatus?: AccountStatus;
  verifiedBy?: string;
  verifiedAt?: admin.firestore.Timestamp;
  rejectionReason?: string;
  uuid?: string;
  isMinistryOwner?: boolean;
  ownedMinistryId?: string;
  // Identity verification fields
  position?: string;
  nin?: string;
  staffId?: string;
  // Pending ministry data (used during ministry admin registration)
  pendingMinistry?: PendingMinistry;
}

// Helper Functions

/**
 * Verify user is authenticated
 */
function requireAuth(context: CallableRequest['auth']): NonNullable<CallableRequest['auth']> {
  if (!context) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  return context;
}

/**
 * Verify user has a specific role (via custom claims)
 */
function requireRole(context: CallableRequest['auth'], requiredRole: UserRole): void {
  const auth = requireAuth(context);
  const userRole = auth.token.role as UserRole | undefined;

  if (userRole !== requiredRole) {
    throw new HttpsError(
      'permission-denied',
      `This operation requires ${requiredRole} role`
    );
  }
}

/**
 * Get user document from Firestore
 */
async function getUserDoc(userId: string): Promise<User> {
  const userDoc = await admin
    .firestore()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  return userDoc.data() as User;
}

/**
 * Set custom claims for a user
 */
async function setUserClaims(
  userId: string,
  role: UserRole,
  ministryId?: string
): Promise<void> {
  const claims: { role: UserRole; ministryId?: string } = { role };
  if (ministryId) {
    claims.ministryId = ministryId;
  }

  await admin.auth().setCustomUserClaims(userId, claims);
  logger.info(`Set custom claims for user ${userId}`, { role, ministryId });
}

/**
 * Log action to audit trail
 */
async function logAction(data: {
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await admin
    .firestore()
    .collection(AUDIT_LOGS_COLLECTION)
    .add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

// Callable Functions

/**
 * Approve Ministry Admin (Federal Admin Only)
 *
 * Federal admin approves ministry admin account.
 * Creates the ministry from pendingMinistry data.
 * Sets custom claims: { role: 'ministry-admin', ministryId }
 */
export const approveMinistryAdmin = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string; ministryId?: string }> => {
    const { ministryAdminId } = request.data;

    // Validate input
    if (!ministryAdminId || typeof ministryAdminId !== 'string') {
      throw new HttpsError('invalid-argument', 'ministryAdminId is required');
    }

    // Verify caller is federal admin
    requireRole(request.auth, 'admin');
    const callerAuth = requireAuth(request.auth);

    // Get ministry admin user doc
    const ministryAdmin = await getUserDoc(ministryAdminId);

    // Verify user is ministry-admin role
    if (ministryAdmin.role !== 'ministry-admin') {
      throw new HttpsError('failed-precondition', 'User is not a ministry admin');
    }

    // Verify user is pending verification
    if (ministryAdmin.accountStatus !== 'pending_verification') {
      throw new HttpsError(
        'failed-precondition',
        'User is not pending verification'
      );
    }

    // Check for pending ministry data
    const pendingMinistry = ministryAdmin.pendingMinistry;
    if (!pendingMinistry) {
      throw new HttpsError(
        'failed-precondition',
        'No pending ministry data found for this user'
      );
    }

    // Create the ministry document
    const ministryRef = admin.firestore().collection(MINISTRIES_COLLECTION).doc();
    const ministryId = ministryRef.id;

    await ministryRef.set({
      ministryId: ministryId,
      name: pendingMinistry.name,
      officialEmail: pendingMinistry.officialEmail,
      ministryType: pendingMinistry.ministryType,
      location: pendingMinistry.location,
      status: 'verified',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: callerAuth.uid,
      ownerId: ministryAdminId,
      ownerEmail: ministryAdmin.email,
      ownerName: ministryAdmin.name || ministryAdmin.agencyName,
      uploaders: [],
      approvers: [],
      maxUploaders: 10,
      maxApprovers: 5,
      hasUploader: false,
      hasApprover: false,
    });

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(ministryAdminId)
      .update({
        accountStatus: 'verified',
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        ministryId: ministryId,
        isMinistryOwner: true,
        ownedMinistryId: ministryId,
        pendingMinistry: admin.firestore.FieldValue.delete(),
      });

    // Set custom claims with ministryId
    await setUserClaims(ministryAdminId, 'ministry-admin', ministryId);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerAuth.token.email || 'unknown',
      userRole: 'admin',
      action: 'ministry_admin.approve',
      resourceType: 'user',
      resourceId: ministryAdminId,
      details: `Approved ministry admin: ${ministryAdmin.email} and created ministry: ${pendingMinistry.name}`,
      metadata: {
        targetUser: ministryAdmin.email,
        ministryId: ministryId,
        ministryName: pendingMinistry.name,
      },
    });

    logger.info('Ministry admin approved and ministry created', {
      ministryAdminId,
      ministryId,
      ministryName: pendingMinistry.name,
      approvedBy: callerAuth.uid,
    });

    return {
      success: true,
      message: `Ministry admin approved and ministry "${pendingMinistry.name}" created successfully`,
      ministryId: ministryId,
    };
  }
);

/**
 * Reject Ministry Admin (Federal Admin Only)
 *
 * Federal admin rejects ministry admin account.
 */
export const rejectMinistryAdmin = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { ministryAdminId, reason } = request.data;

    // Validate input
    if (!ministryAdminId || typeof ministryAdminId !== 'string') {
      throw new HttpsError('invalid-argument', 'ministryAdminId is required');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Rejection reason is required');
    }

    // Verify caller is federal admin
    requireRole(request.auth, 'admin');
    const callerAuth = requireAuth(request.auth);

    // Get ministry admin user doc
    const ministryAdmin = await getUserDoc(ministryAdminId);

    // Verify user is ministry-admin role
    if (ministryAdmin.role !== 'ministry-admin') {
      throw new HttpsError('failed-precondition', 'User is not a ministry admin');
    }

    // Verify user is pending verification
    if (ministryAdmin.accountStatus !== 'pending_verification') {
      throw new HttpsError(
        'failed-precondition',
        'User is not pending verification'
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(ministryAdminId)
      .update({
        accountStatus: 'rejected',
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason.trim(),
      });

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerAuth.token.email || 'unknown',
      userRole: 'admin',
      action: 'ministry_admin.reject',
      resourceType: 'user',
      resourceId: ministryAdminId,
      details: `Rejected ministry admin: ${ministryAdmin.email} - Reason: ${reason}`,
      metadata: {
        targetUser: ministryAdmin.email,
        rejectionReason: reason,
      },
    });

    logger.info('Ministry admin rejected', {
      ministryAdminId,
      rejectedBy: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message: 'Ministry admin rejected successfully',
    };
  }
);

/**
 * Approve Staff by Ministry Admin
 *
 * Ministry admin approves staff (uploader/approver) joining their ministry.
 * Generates UUID for staff login and tracking.
 * Sets custom claims: { role: 'agency' | 'agency-approver', ministryId: '...' }
 */
export const approveStaffByMinistryAdmin = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string; uuid?: string; userEmail?: string; userName?: string }> => {
    const { staffUserId } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== 'string') {
      throw new HttpsError('invalid-argument', 'staffUserId is required');
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, 'ministry-admin');
    const callerAuth = requireAuth(request.auth);

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You must own a ministry to approve staff'
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff is pending ministry approval
    if (staffUser.accountStatus !== 'pending_ministry_approval') {
      throw new HttpsError(
        'failed-precondition',
        'User is not pending ministry approval'
      );
    }

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You can only approve users for your own ministry'
      );
    }

    // Verify staff role is agency or agency-approver
    if (staffUser.role !== 'agency' && staffUser.role !== 'agency-approver') {
      throw new HttpsError(
        'failed-precondition',
        'User must be agency or agency-approver role'
      );
    }

    // Generate UUID for the staff member
    const generatedUuid = uuidv4();

    // Update user document with UUID
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: 'verified',
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        uuid: generatedUuid,
      });

    // Set custom claims
    await setUserClaims(staffUserId, staffUser.role, staffUser.ministryId);

    // Update ministry document to add staff to appropriate role array
    const ministryRef = admin.firestore().collection(MINISTRIES_COLLECTION).doc(staffUser.ministryId);
    const ministryDoc = await ministryRef.get();

    if (ministryDoc.exists) {
      const ministryData = ministryDoc.data();
      const updateData: any = {};

      if (staffUser.role === 'agency') {
        // Add to uploaders array if not already present
        const uploaders = ministryData?.uploaders || [];
        if (!uploaders.includes(staffUserId)) {
          updateData.uploaders = admin.firestore.FieldValue.arrayUnion(staffUserId);
          updateData.hasUploader = true;
        }
      } else if (staffUser.role === 'agency-approver') {
        // Add to approvers array if not already present
        const approvers = ministryData?.approvers || [];
        if (!approvers.includes(staffUserId)) {
          updateData.approvers = admin.firestore.FieldValue.arrayUnion(staffUserId);
          updateData.hasApprover = true;
        }
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        await ministryRef.update(updateData);
        logger.info('Ministry document updated with new staff', {
          ministryId: staffUser.ministryId,
          staffUserId,
          role: staffUser.role,
        });
      }
    }

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: 'staff.approve',
      resourceType: 'user',
      resourceId: staffUserId,
      details: `Approved staff: ${staffUser.email} (${staffUser.role}) - UUID: ${generatedUuid}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        uuid: generatedUuid,
      },
    });

    logger.info('Staff approved by ministry admin', {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      ministryId: callerUser.ownedMinistryId,
      uuid: generatedUuid,
    });

    return {
      success: true,
      message: 'Staff member approved successfully',
      uuid: generatedUuid,
      userEmail: staffUser.email,
      userName: staffUser.name || staffUser.agencyName,
    };
  }
);

/**
 * Reject Staff by Ministry Admin
 *
 * Ministry admin rejects staff registration request.
 */
export const rejectStaffByMinistryAdmin = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, reason } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== 'string') {
      throw new HttpsError('invalid-argument', 'staffUserId is required');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Rejection reason is required');
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, 'ministry-admin');
    const callerAuth = requireAuth(request.auth);

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You must own a ministry to reject staff'
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff is pending ministry approval
    if (staffUser.accountStatus !== 'pending_ministry_approval') {
      throw new HttpsError(
        'failed-precondition',
        'User is not pending ministry approval'
      );
    }

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You can only reject users for your own ministry'
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: 'rejected',
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason.trim(),
      });

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: 'staff.reject',
      resourceType: 'user',
      resourceId: staffUserId,
      details: `Rejected staff: ${staffUser.email} - Reason: ${reason}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        rejectionReason: reason,
      },
    });

    logger.info('Staff rejected by ministry admin', {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message: 'Staff member rejected successfully',
    };
  }
);

/**
 * Remove Staff from Ministry
 *
 * Ministry admin removes staff from their ministry (when they leave).
 */
export const removeStaffFromMinistry = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, reason } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== 'string') {
      throw new HttpsError('invalid-argument', 'staffUserId is required');
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, 'ministry-admin');
    const callerAuth = requireAuth(request.auth);

    // Cannot remove self
    if (staffUserId === callerAuth.uid) {
      throw new HttpsError('invalid-argument', 'You cannot remove yourself');
    }

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You must own a ministry to remove staff'
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You can only remove users from your own ministry'
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: 'rejected',
        rejectionReason: reason?.trim() || 'Removed from ministry by admin',
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Remove custom claims (revoke access)
    await admin.auth().setCustomUserClaims(staffUserId, null);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: 'staff.remove',
      resourceType: 'user',
      resourceId: staffUserId,
      details: `Removed staff from ministry: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        reason: reason,
      },
    });

    logger.info('Staff removed from ministry', {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message: 'Staff member removed from ministry successfully',
    };
  }
);

/**
 * Change Staff Role by Ministry Admin
 *
 * Ministry admin changes staff role between 'agency' (uploader) and 'agency-approver' (approver).
 * Updates custom claims with the new role.
 */
export const changeStaffRoleByMinistryAdmin = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, newRole } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== 'string') {
      throw new HttpsError('invalid-argument', 'staffUserId is required');
    }
    if (!newRole || (newRole !== 'agency' && newRole !== 'agency-approver')) {
      throw new HttpsError(
        'invalid-argument',
        'newRole must be either "agency" or "agency-approver"'
      );
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, 'ministry-admin');
    const callerAuth = requireAuth(request.auth);

    // Cannot change self
    if (staffUserId === callerAuth.uid) {
      throw new HttpsError('invalid-argument', 'You cannot change your own role');
    }

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You must own a ministry to change staff roles'
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You can only change roles for users in your own ministry'
      );
    }

    // Verify staff is verified (active)
    if (staffUser.accountStatus !== 'verified') {
      throw new HttpsError(
        'failed-precondition',
        'Can only change role for verified staff members'
      );
    }

    // Verify staff current role is agency or agency-approver
    if (staffUser.role !== 'agency' && staffUser.role !== 'agency-approver') {
      throw new HttpsError(
        'failed-precondition',
        'Can only change role for uploaders or approvers'
      );
    }

    // Check if role is actually changing
    if (staffUser.role === newRole) {
      throw new HttpsError(
        'invalid-argument',
        `User is already an ${newRole === 'agency' ? 'uploader' : 'approver'}`
      );
    }

    const oldRole = staffUser.role;

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        role: newRole,
        roleChangedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleChangedBy: callerAuth.uid,
      });

    // Update custom claims with new role
    await setUserClaims(staffUserId, newRole, staffUser.ministryId);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: 'user.role.change',
      resourceType: 'user',
      resourceId: staffUserId,
      details: `Changed staff role from ${oldRole} to ${newRole}: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        oldRole: oldRole,
        newRole: newRole,
        ministryId: staffUser.ministryId,
      },
    });

    logger.info('Staff role changed by ministry admin', {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      oldRole,
      newRole,
    });

    return {
      success: true,
      message: `Staff role changed from ${oldRole === 'agency' ? 'uploader' : 'approver'} to ${newRole === 'agency' ? 'uploader' : 'approver'} successfully`,
    };
  }
);

/**
 * Disable Staff by Ministry Admin
 *
 * Ministry admin disables a staff account (when they leave or need to be suspended).
 * This frees up a slot for new staff members.
 * Revokes custom claims to prevent access.
 */
export const disableStaffByMinistryAdmin = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, reason } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== 'string') {
      throw new HttpsError('invalid-argument', 'staffUserId is required');
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, 'ministry-admin');
    const callerAuth = requireAuth(request.auth);

    // Cannot disable self
    if (staffUserId === callerAuth.uid) {
      throw new HttpsError('invalid-argument', 'You cannot disable your own account');
    }

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You must own a ministry to disable staff'
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You can only disable users in your own ministry'
      );
    }

    // Verify staff is verified (active) - can only disable active staff
    if (staffUser.accountStatus !== 'verified') {
      throw new HttpsError(
        'failed-precondition',
        'Can only disable verified (active) staff members'
      );
    }

    // Verify staff role is agency or agency-approver
    if (staffUser.role !== 'agency' && staffUser.role !== 'agency-approver') {
      throw new HttpsError(
        'failed-precondition',
        'Can only disable uploaders or approvers'
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: 'disabled',
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
        disabledBy: callerAuth.uid,
        disableReason: reason?.trim() || 'Disabled by ministry admin',
      });

    // Remove custom claims (revoke access)
    await admin.auth().setCustomUserClaims(staffUserId, null);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: 'user.account.disable',
      resourceType: 'user',
      resourceId: staffUserId,
      details: `Disabled staff account: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        reason: reason,
      },
    });

    logger.info('Staff disabled by ministry admin', {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message: 'Staff account disabled successfully. A slot is now available for new registrations.',
    };
  }
);

/**
 * Enable Staff by Ministry Admin
 *
 * Ministry admin re-enables a previously disabled staff account.
 * Restores custom claims to allow access.
 */
export const enableStaffByMinistryAdmin = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== 'string') {
      throw new HttpsError('invalid-argument', 'staffUserId is required');
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, 'ministry-admin');
    const callerAuth = requireAuth(request.auth);

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You must own a ministry to enable staff'
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        'permission-denied',
        'You can only enable users in your own ministry'
      );
    }

    // Verify staff is disabled
    if (staffUser.accountStatus !== 'disabled') {
      throw new HttpsError(
        'failed-precondition',
        'Can only enable disabled staff members'
      );
    }

    // Verify staff role is agency or agency-approver
    if (staffUser.role !== 'agency' && staffUser.role !== 'agency-approver') {
      throw new HttpsError(
        'failed-precondition',
        'Can only enable uploaders or approvers'
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: 'verified',
        enabledAt: admin.firestore.FieldValue.serverTimestamp(),
        enabledBy: callerAuth.uid,
        disabledAt: admin.firestore.FieldValue.delete(),
        disabledBy: admin.firestore.FieldValue.delete(),
        disableReason: admin.firestore.FieldValue.delete(),
      });

    // Restore custom claims
    await setUserClaims(staffUserId, staffUser.role, staffUser.ministryId);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: 'user.account.enable',
      resourceType: 'user',
      resourceId: staffUserId,
      details: `Enabled staff account: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
      },
    });

    logger.info('Staff enabled by ministry admin', {
      staffUserId,
      ministryAdminId: callerAuth.uid,
    });

    return {
      success: true,
      message: 'Staff account enabled successfully',
    };
  }
);
