import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '@/types/user.types';
import { logAction } from './auditLog.service';

const USERS_COLLECTION = 'users';

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const users: User[] = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      userId: doc.id,
    })) as User[];

    return users;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    throw new Error(error.message || 'Failed to fetch users');
  }
};

/**
 * Get users by role
 */
export const getUsersByRole = async (role: 'agency' | 'agency-approver' | 'admin'): Promise<User[]> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('role', '==', role),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const users: User[] = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      userId: doc.id,
    })) as User[];

    return users;
  } catch (error: any) {
    console.error('Error fetching users by role:', error);
    throw new Error(error.message || 'Failed to fetch users');
  }
};

/**
 * Get users by ministry
 */
export const getUsersByMinistry = async (ministryId: string): Promise<User[]> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('ministryId', '==', ministryId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const users: User[] = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      userId: doc.id,
    })) as User[];

    return users;
  } catch (error: any) {
    console.error('Error fetching users by ministry:', error);
    throw new Error(error.message || 'Failed to fetch users');
  }
};

/**
 * Get a single user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));

    if (!userDoc.exists()) {
      return null;
    }

    return { ...userDoc.data(), userId: userDoc.id } as User;
  } catch (error: any) {
    console.error('Error fetching user:', error);
    throw new Error(error.message || 'Failed to fetch user');
  }
};

/**
 * Disable a user account (admin only)
 */
export const disableUser = async (
  userId: string,
  adminUserId: string,
  reason?: string
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const user = userDoc.data() as User;

    // Cannot disable self
    if (userId === adminUserId) {
      throw new Error('You cannot disable your own account');
    }

    await updateDoc(userRef, {
      accountStatus: 'disabled',
      disabledAt: Timestamp.now(),
      disabledBy: adminUserId,
      disableReason: reason || 'Account disabled by administrator',
    });

    // Get admin user for logging
    const adminDoc = await getDoc(doc(db, USERS_COLLECTION, adminUserId));
    const admin = adminDoc.data() as User;

    // Log the action
    await logAction({
      userId: adminUserId,
      userEmail: admin.email,
      agencyName: admin.agencyName,
      userRole: admin.role,
      action: 'user.account.disable',
      resourceType: 'user',
      resourceId: userId,
      details: `Disabled user account: ${user.email}`,
      metadata: {
        targetUser: user.email,
        targetAgency: user.agencyName,
        reason: reason,
      },
    });
  } catch (error: any) {
    console.error('Error disabling user:', error);
    throw new Error(error.message || 'Failed to disable user');
  }
};

/**
 * Enable a user account (admin only)
 */
export const enableUser = async (
  userId: string,
  adminUserId: string
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const user = userDoc.data() as User;

    await updateDoc(userRef, {
      accountStatus: 'active',
      enabledAt: Timestamp.now(),
      enabledBy: adminUserId,
      disabledAt: null,
      disabledBy: null,
      disableReason: null,
    });

    // Get admin user for logging
    const adminDoc = await getDoc(doc(db, USERS_COLLECTION, adminUserId));
    const admin = adminDoc.data() as User;

    // Log the action
    await logAction({
      userId: adminUserId,
      userEmail: admin.email,
      agencyName: admin.agencyName,
      userRole: admin.role,
      action: 'user.account.enable',
      resourceType: 'user',
      resourceId: userId,
      details: `Enabled user account: ${user.email}`,
      metadata: {
        targetUser: user.email,
        targetAgency: user.agencyName,
      },
    });
  } catch (error: any) {
    console.error('Error enabling user:', error);
    throw new Error(error.message || 'Failed to enable user');
  }
};

/**
 * Change user role (admin only)
 */
export const changeUserRole = async (
  userId: string,
  newRole: 'agency' | 'agency-approver',
  adminUserId: string
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const user = userDoc.data() as User;
    const oldRole = user.role;

    // Cannot change admin role
    if (oldRole === 'admin') {
      throw new Error('Cannot change administrator role');
    }

    await updateDoc(userRef, {
      role: newRole,
      roleChangedAt: Timestamp.now(),
      roleChangedBy: adminUserId,
    });

    // Get admin user for logging
    const adminDoc = await getDoc(doc(db, USERS_COLLECTION, adminUserId));
    const admin = adminDoc.data() as User;

    // Log the action
    await logAction({
      userId: adminUserId,
      userEmail: admin.email,
      agencyName: admin.agencyName,
      userRole: admin.role,
      action: 'user.role.change',
      resourceType: 'user',
      resourceId: userId,
      details: `Changed user role from ${oldRole} to ${newRole}: ${user.email}`,
      metadata: {
        targetUser: user.email,
        targetAgency: user.agencyName,
        oldRole,
        newRole,
      },
    });
  } catch (error: any) {
    console.error('Error changing user role:', error);
    throw new Error(error.message || 'Failed to change user role');
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (): Promise<{
  total: number;
  active: number;
  disabled: number;
  byRole: Record<string, number>;
}> => {
  try {
    const users = await getAllUsers();

    const stats = {
      total: users.length,
      active: users.filter((u) => u.accountStatus !== 'disabled').length,
      disabled: users.filter((u) => u.accountStatus === 'disabled').length,
      byRole: {
        admin: users.filter((u) => u.role === 'admin').length,
        'agency-approver': users.filter((u) => u.role === 'agency-approver').length,
        agency: users.filter((u) => u.role === 'agency').length,
      },
    };

    return stats;
  } catch (error: any) {
    console.error('Error getting user stats:', error);
    throw new Error(error.message || 'Failed to get user statistics');
  }
};

/**
 * Get pending users for ministry admin approval
 * Returns users who have verified email but pending ministry admin approval
 */
export const getPendingUsersForMinistry = async (ministryId: string): Promise<User[]> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('ministryId', '==', ministryId),
      where('accountStatus', '==', 'pending_ministry_approval'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const users: User[] = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      userId: doc.id,
    })) as User[];

    return users;
  } catch (error: any) {
    console.error('Error fetching pending users:', error);
    throw new Error(error.message || 'Failed to fetch pending users');
  }
};

/**
 * Approve a user (Ministry Admin)
 * Ministry admin approves staff (uploader/approver) joining their ministry
 * Uses Cloud Function for server-side validation and custom claims
 * Returns UUID assigned to the approved staff member
 */
export const approveUserByMinistryAdmin = async (
  userId: string,
  _ministryAdminId: string // Not needed - Cloud Function gets from auth context
): Promise<{ uuid: string; userEmail: string; userName: string }> => {
  const { approveStaffByMinistryAdminCF, refreshUserToken } = await import('./cloudFunctions.service');

  try {
    const result = await approveStaffByMinistryAdminCF(userId);

    // Refresh token to get updated claims (if the approved user is currently logged in)
    try {
      await refreshUserToken();
    } catch (err) {
      // Token refresh error is not critical - user will get new claims on next login
      console.warn('Token refresh failed (user may not be logged in):', err);
    }

    return {
      uuid: result.uuid || '',
      userEmail: result.userEmail || '',
      userName: result.userName || '',
    };
  } catch (error: any) {
    console.error('Error approving user:', error);
    throw new Error(error.message || 'Failed to approve user');
  }
};

/**
 * Reject a user (Ministry Admin)
 * Ministry admin rejects staff registration request
 * Uses Cloud Function for server-side validation
 */
export const rejectUserByMinistryAdmin = async (
  userId: string,
  _ministryAdminId: string, // Not needed - Cloud Function gets from auth context
  reason: string
): Promise<void> => {
  const { rejectStaffByMinistryAdminCF } = await import('./cloudFunctions.service');

  try {
    await rejectStaffByMinistryAdminCF(userId, reason);
  } catch (error: any) {
    console.error('Error rejecting user:', error);
    throw new Error(error.message || 'Failed to reject user');
  }
};

/**
 * Remove a user from ministry (Ministry Admin)
 * Removes user's association with the ministry (when they leave)
 * Uses Cloud Function for server-side validation and claim revocation
 */
export const removeUserFromMinistry = async (
  userId: string,
  _ministryAdminId: string, // Not needed - Cloud Function gets from auth context
  reason?: string
): Promise<void> => {
  const { removeStaffFromMinistryCF } = await import('./cloudFunctions.service');

  try {
    await removeStaffFromMinistryCF(userId, reason);
  } catch (error: any) {
    console.error('Error removing user:', error);
    throw new Error(error.message || 'Failed to remove user');
  }
};

/**
 * Change staff role (Ministry Admin)
 * Changes staff role between 'agency' (uploader) and 'agency-approver' (approver)
 * Uses Cloud Function for server-side validation and claim update
 */
export const changeStaffRole = async (
  userId: string,
  newRole: 'agency' | 'agency-approver'
): Promise<void> => {
  const { changeStaffRoleCF } = await import('./cloudFunctions.service');

  try {
    await changeStaffRoleCF(userId, newRole);
  } catch (error: any) {
    console.error('Error changing staff role:', error);
    throw new Error(error.message || 'Failed to change staff role');
  }
};

/**
 * Disable staff account (Ministry Admin)
 * Disables a staff account, freeing up a slot for new registrations
 * Uses Cloud Function for server-side validation and claim revocation
 */
export const disableStaff = async (
  userId: string,
  reason?: string
): Promise<void> => {
  const { disableStaffCF } = await import('./cloudFunctions.service');

  try {
    await disableStaffCF(userId, reason);
  } catch (error: any) {
    console.error('Error disabling staff:', error);
    throw new Error(error.message || 'Failed to disable staff');
  }
};

/**
 * Enable staff account (Ministry Admin)
 * Re-enables a previously disabled staff account
 * Uses Cloud Function for server-side validation and claim restoration
 */
export const enableStaff = async (userId: string): Promise<void> => {
  const { enableStaffCF } = await import('./cloudFunctions.service');

  try {
    await enableStaffCF(userId);
  } catch (error: any) {
    console.error('Error enabling staff:', error);
    throw new Error(error.message || 'Failed to enable staff');
  }
};
