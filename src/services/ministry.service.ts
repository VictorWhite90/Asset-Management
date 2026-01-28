import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Ministry, MinistryFormData, MinistryStatus } from '@/types/ministry.types';
import { User } from '@/types/user.types';
import { logAction } from './auditLog.service';
import { COLLECTIONS, MINISTRY_ROLE_LIMITS } from '@/utils/constants';

const MINISTRIES_COLLECTION = 'ministries';

/**
 * Helper function to get user data for audit logging
 */
const getUserForAudit = async (userId: string): Promise<{ email: string; agencyName: string; role: 'agency' | 'agency-approver' | 'ministry-admin' | 'admin' }> => {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      return { email: 'unknown@system', agencyName: 'System', role: 'admin' };
    }
    const user = userDoc.data() as User;
    return {
      email: user.email,
      agencyName: user.agencyName || 'Admin',
      role: user.role,
    };
  } catch (error) {
    console.error('Error fetching user for audit:', error);
    return { email: 'unknown@system', agencyName: 'System', role: 'admin' };
  }
};

/**
 * Check if a VERIFIED ministry with the given name already exists
 * Allows multiple pending registrations with same name - federal admin decides which is legitimate
 */
export const checkMinistryExists = async (name: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, MINISTRIES_COLLECTION),
      where('name', '==', name),
      where('status', '==', 'verified')
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error: any) {
    console.error('Error checking ministry existence:', error);
    throw new Error('Failed to check ministry existence');
  }
};

/**
 * Check if a VERIFIED ministry with the given official email already exists
 * Allows multiple pending registrations with same email - federal admin decides which is legitimate
 */
export const checkMinistryEmailExists = async (email: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, MINISTRIES_COLLECTION),
      where('officialEmail', '==', email),
      where('status', '==', 'verified')
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error: any) {
    console.error('Error checking ministry email:', error);
    throw new Error('Failed to check ministry email');
  }
};

/**
 * Check if a role capacity is full for a ministry
 * Returns true if NO MORE slots available, false if slots available
 */
export const checkRoleExists = async (
  ministryId: string,
  role: 'agency' | 'agency-approver'
): Promise<boolean> => {
  try {
    const ministryDoc = await getDoc(doc(db, MINISTRIES_COLLECTION, ministryId));

    if (!ministryDoc.exists()) {
      throw new Error('Ministry not found');
    }

    const ministry = ministryDoc.data() as Ministry;

    if (role === 'agency') {
      // Check if uploader capacity is full
      const uploaders = ministry.uploaders || [];
      const maxUploaders = ministry.maxUploaders || MINISTRY_ROLE_LIMITS.DEFAULT_MAX_UPLOADERS;
      return uploaders.length >= maxUploaders;
    } else if (role === 'agency-approver') {
      // Check if approver capacity is full
      const approvers = ministry.approvers || [];
      const maxApprovers = ministry.maxApprovers || MINISTRY_ROLE_LIMITS.DEFAULT_MAX_APPROVERS;
      return approvers.length >= maxApprovers;
    }

    return false;
  } catch (error: any) {
    console.error('Error checking role capacity:', error);
    throw new Error('Failed to check role availability');
  }
};

/**
 * Get role capacity information for a ministry
 * Returns available slots and total capacity
 */
export const getRoleCapacity = async (
  ministryId: string,
  role: 'agency' | 'agency-approver'
): Promise<{ available: number; total: number; filled: number }> => {
  try {
    const ministryDoc = await getDoc(doc(db, MINISTRIES_COLLECTION, ministryId));

    if (!ministryDoc.exists()) {
      throw new Error('Ministry not found');
    }

    const ministry = ministryDoc.data() as Ministry;

    if (role === 'agency') {
      const uploaders = ministry.uploaders || [];
      const maxUploaders = ministry.maxUploaders || MINISTRY_ROLE_LIMITS.DEFAULT_MAX_UPLOADERS;
      return {
        filled: uploaders.length,
        total: maxUploaders,
        available: maxUploaders - uploaders.length,
      };
    } else {
      const approvers = ministry.approvers || [];
      const maxApprovers = ministry.maxApprovers || MINISTRY_ROLE_LIMITS.DEFAULT_MAX_APPROVERS;
      return {
        filled: approvers.length,
        total: maxApprovers,
        available: maxApprovers - approvers.length,
      };
    }
  } catch (error: any) {
    console.error('Error getting role capacity:', error);
    throw new Error('Failed to get role capacity');
  }
};

/**
 * Create a new ministry (LEGACY - unauthenticated)
 * DEPRECATED: Use createMinistryByAdmin instead
 */
export const createMinistry = async (
  ministryData: MinistryFormData
): Promise<string> => {
  try {
    // TESTING MODE: Duplicate checks disabled
    // Check if ministry name already exists
    // const nameExists = await checkMinistryExists(ministryData.name);
    // if (nameExists) {
    //   throw new Error('A ministry with this name already exists');
    // }

    // Check if official email already exists
    // const emailExists = await checkMinistryEmailExists(ministryData.officialEmail);
    // if (emailExists) {
    //   throw new Error('This official email is already registered');
    // }

    // PRODUCTION: Uncomment above checks or move to Cloud Functions

    // Create ministry document
    const ministryRef = await addDoc(collection(db, MINISTRIES_COLLECTION), {
      name: ministryData.name,
      officialEmail: ministryData.officialEmail,
      ministryType: ministryData.ministryType,
      location: ministryData.location,
      status: 'pending_verification' as MinistryStatus,
      createdAt: Timestamp.now(),
      ministryId: '', // Will be set via updateDoc after creation
      // Initialize with empty arrays for multiple uploaders/approvers
      uploaders: [],
      approvers: [],
      maxUploaders: MINISTRY_ROLE_LIMITS.DEFAULT_MAX_UPLOADERS,
      maxApprovers: MINISTRY_ROLE_LIMITS.DEFAULT_MAX_APPROVERS,
      // Legacy fields for backward compatibility
      hasUploader: false,
      hasApprover: false,
      // No owner for legacy ministries
      ownerId: '',
      ownerEmail: '',
    });

    // Note: Cannot updateDoc here because user is not authenticated
    // The ministryId field will be empty, but the document ID (ministryRef.id) is the actual ministry ID
    // All queries should use the document ID, not the ministryId field

    return ministryRef.id;
  } catch (error: any) {
    console.error('Error creating ministry:', error);
    throw error;
  }
};

/**
 * Create a new ministry by authenticated ministry admin
 */
export const createMinistryByAdmin = async (
  ministryData: MinistryFormData,
  ownerId: string,
  ownerEmail: string,
  ownerName: string
): Promise<string> => {
  try {
    // Check if ministry name already exists
    const nameExists = await checkMinistryExists(ministryData.name);
    if (nameExists) {
      throw new Error('A ministry with this name already exists');
    }

    // Check if official email already exists
    const emailExists = await checkMinistryEmailExists(ministryData.officialEmail);
    if (emailExists) {
      throw new Error('This official email is already registered');
    }

    // Check if owner already has a ministry
    const q = query(
      collection(db, MINISTRIES_COLLECTION),
      where('ownerId', '==', ownerId)
    );
    const existingMinistry = await getDocs(q);
    if (!existingMinistry.empty) {
      throw new Error('You have already registered a ministry');
    }

    // Create ministry document
    const ministryRef = await addDoc(collection(db, MINISTRIES_COLLECTION), {
      name: ministryData.name,
      officialEmail: ministryData.officialEmail,
      ministryType: ministryData.ministryType,
      location: ministryData.location,
      status: 'pending_verification' as MinistryStatus,
      createdAt: Timestamp.now(),
      ministryId: '', // Will be set below
      // Ministry ownership
      ownerId: ownerId,
      ownerEmail: ownerEmail,
      ownerName: ownerName,
      // Initialize with empty arrays for multiple uploaders/approvers
      uploaders: [],
      approvers: [],
      maxUploaders: MINISTRY_ROLE_LIMITS.DEFAULT_MAX_UPLOADERS,
      maxApprovers: MINISTRY_ROLE_LIMITS.DEFAULT_MAX_APPROVERS,
      // Legacy fields for backward compatibility
      hasUploader: false,
      hasApprover: false,
    });

    // Update with ministryId
    await updateDoc(ministryRef, {
      ministryId: ministryRef.id,
    });

    // Update owner's user document
    const userRef = doc(db, COLLECTIONS.USERS, ownerId);
    await updateDoc(userRef, {
      ministryId: ministryRef.id,
      ministryType: ministryData.ministryType,
      agencyName: ministryData.name,
      location: ministryData.location,
      isMinistryOwner: true,
      ownedMinistryId: ministryRef.id,
    });

    // Log to audit trail
    await logAction({
      userId: ownerId,
      userEmail: ownerEmail,
      agencyName: ministryData.name,
      userRole: 'ministry-admin',
      action: 'ministry.register',
      resourceType: 'ministry',
      resourceId: ministryRef.id,
      details: `Registered ministry: ${ministryData.name}`,
      metadata: {
        ministryName: ministryData.name,
        ministryType: ministryData.ministryType,
        location: ministryData.location,
      },
    });

    return ministryRef.id;
  } catch (error: any) {
    console.error('Error creating ministry by admin:', error);
    throw error;
  }
};

/**
 * Get ministry by ID
 */
export const getMinistryById = async (ministryId: string): Promise<Ministry | null> => {
  try {
    const ministryDoc = await getDoc(doc(db, MINISTRIES_COLLECTION, ministryId));

    if (!ministryDoc.exists()) {
      return null;
    }

    return { ...ministryDoc.data(), ministryId: ministryDoc.id } as Ministry;
  } catch (error: any) {
    console.error('Error fetching ministry:', error);
    throw new Error('Failed to fetch ministry');
  }
};

/**
 * Get ministry by name
 */
export const getMinistryByName = async (name: string): Promise<Ministry | null> => {
  try {
    const q = query(
      collection(db, MINISTRIES_COLLECTION),
      where('name', '==', name)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { ...doc.data(), ministryId: doc.id } as Ministry;
  } catch (error: any) {
    console.error('Error fetching ministry by name:', error);
    throw new Error('Failed to fetch ministry');
  }
};

/**
 * Get all verified ministries
 */
export const getVerifiedMinistries = async (): Promise<Ministry[]> => {
  try {
    const q = query(
      collection(db, MINISTRIES_COLLECTION),
      where('status', '==', 'verified'),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({ ...doc.data(), ministryId: doc.id } as Ministry));
  } catch (error: any) {
    console.error('Error fetching verified ministries:', error);
    throw new Error('Failed to fetch ministries');
  }
};

/**
 * Get all ministries (admin only)
 */
export const getAllMinistries = async (): Promise<Ministry[]> => {
  try {
    const q = query(
      collection(db, MINISTRIES_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({ ...doc.data(), ministryId: doc.id } as Ministry));
  } catch (error: any) {
    console.error('Error fetching all ministries:', error);
    throw new Error('Failed to fetch ministries');
  }
};

/**
 * Get pending ministries (for admin verification)
 */
export const getPendingMinistries = async (): Promise<Ministry[]> => {
  try {
    const q = query(
      collection(db, MINISTRIES_COLLECTION),
      where('status', '==', 'pending_verification'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({ ...doc.data(), ministryId: doc.id } as Ministry));
  } catch (error: any) {
    console.error('Error fetching pending ministries:', error);
    throw new Error('Failed to fetch pending ministries');
  }
};

/**
 * Verify a ministry (admin only)
 */
export const verifyMinistry = async (
  ministryId: string,
  adminUserId: string
): Promise<void> => {
  try {
    // Get ministry details for logging
    const ministryDoc = await getDoc(doc(db, MINISTRIES_COLLECTION, ministryId));
    const ministry = ministryDoc.data() as Ministry;

    const ministryRef = doc(db, MINISTRIES_COLLECTION, ministryId);
    await updateDoc(ministryRef, {
      ministryId: ministryId, // Set ministryId field (wasn't set during unauthenticated creation)
      status: 'verified' as MinistryStatus,
      verifiedAt: Timestamp.now(),
      verifiedBy: adminUserId,
    });

    // Log to audit trail
    const adminUser = await getUserForAudit(adminUserId);
    await logAction({
      userId: adminUserId,
      userEmail: adminUser.email,
      agencyName: adminUser.agencyName,
      userRole: adminUser.role,
      action: 'ministry.verify',
      resourceType: 'ministry',
      resourceId: ministryId,
      details: `Verified ministry: ${ministry.name}`,
      metadata: {
        ministryName: ministry.name,
        ministryType: ministry.ministryType,
        location: ministry.location,
      },
    });
  } catch (error: any) {
    console.error('Error verifying ministry:', error);
    throw new Error('Failed to verify ministry');
  }
};

/**
 * Reject a ministry (admin only)
 */
export const rejectMinistry = async (
  ministryId: string,
  adminUserId: string,
  reason: string
): Promise<void> => {
  try {
    // Get ministry details for logging
    const ministryDoc = await getDoc(doc(db, MINISTRIES_COLLECTION, ministryId));
    const ministry = ministryDoc.data() as Ministry;

    const ministryRef = doc(db, MINISTRIES_COLLECTION, ministryId);
    await updateDoc(ministryRef, {
      status: 'rejected' as MinistryStatus,
      rejectedAt: Timestamp.now(),
      rejectedBy: adminUserId,
      rejectionReason: reason,
    });

    // Log to audit trail
    const adminUser = await getUserForAudit(adminUserId);
    await logAction({
      userId: adminUserId,
      userEmail: adminUser.email,
      agencyName: adminUser.agencyName,
      userRole: adminUser.role,
      action: 'ministry.reject',
      resourceType: 'ministry',
      resourceId: ministryId,
      details: `Rejected ministry: ${ministry.name} - Reason: ${reason}`,
      metadata: {
        ministryName: ministry.name,
        ministryType: ministry.ministryType,
        location: ministry.location,
        rejectionReason: reason,
      },
    });
  } catch (error: any) {
    console.error('Error rejecting ministry:', error);
    throw new Error('Failed to reject ministry');
  }
};

/**
 * Update ministry role assignments
 */
export const updateMinistryRole = async (
  ministryId: string,
  role: 'agency' | 'agency-approver',
  userId: string,
  action: 'assign' | 'remove'
): Promise<void> => {
  try {
    const ministryRef = doc(db, MINISTRIES_COLLECTION, ministryId);

    if (role === 'agency') {
      // Update uploaders array
      const updateData: any = {
        uploaders: action === 'assign' ? arrayUnion(userId) : arrayRemove(userId),
      };

      // Update legacy fields for backward compatibility
      if (action === 'assign') {
        // Get current ministry to check if first uploader
        const ministryDoc = await getDoc(ministryRef);
        const ministry = ministryDoc.data() as Ministry;
        const uploaders = ministry.uploaders || [];

        if (uploaders.length === 0) {
          updateData.hasUploader = true;
          updateData.uploaderUserId = userId;
        }
      }

      await updateDoc(ministryRef, updateData);

      // Log role assignment/removal
      const adminUser = await getUserForAudit(userId);
      await logAction({
        userId: userId,
        userEmail: adminUser.email,
        agencyName: adminUser.agencyName,
        userRole: adminUser.role,
        action: action === 'assign' ? 'user.role.assign' : 'user.role.remove',
        resourceType: 'user',
        resourceId: userId,
        details: `${action === 'assign' ? 'Assigned' : 'Removed'} uploader role ${action === 'assign' ? 'to' : 'from'} user`,
        metadata: { ministryId, role: 'agency' },
      });
    } else if (role === 'agency-approver') {
      // Update approvers array
      const updateData: any = {
        approvers: action === 'assign' ? arrayUnion(userId) : arrayRemove(userId),
      };

      // Update legacy fields for backward compatibility
      if (action === 'assign') {
        // Get current ministry to check if first approver
        const ministryDoc = await getDoc(ministryRef);
        const ministry = ministryDoc.data() as Ministry;
        const approvers = ministry.approvers || [];

        if (approvers.length === 0) {
          updateData.hasApprover = true;
          updateData.approverUserId = userId;
          updateData.primaryApprover = userId; // First approver is primary
        }
      }

      await updateDoc(ministryRef, updateData);

      // Log role assignment/removal
      const adminUser = await getUserForAudit(userId);
      await logAction({
        userId: userId,
        userEmail: adminUser.email,
        agencyName: adminUser.agencyName,
        userRole: adminUser.role,
        action: action === 'assign' ? 'user.role.assign' : 'user.role.remove',
        resourceType: 'user',
        resourceId: userId,
        details: `${action === 'assign' ? 'Assigned' : 'Removed'} approver role ${action === 'assign' ? 'to' : 'from'} user`,
        metadata: { ministryId, role: 'agency-approver' },
      });
    }
  } catch (error: any) {
    console.error('Error updating ministry role:', error);
    throw new Error('Failed to update ministry role');
  }
};

/**
 * Suspend a ministry (admin only)
 */
export const suspendMinistry = async (
  ministryId: string,
  adminUserId: string
): Promise<void> => {
  try {
    // Get ministry details for logging
    const ministryDoc = await getDoc(doc(db, MINISTRIES_COLLECTION, ministryId));
    const ministry = ministryDoc.data() as Ministry;

    const ministryRef = doc(db, MINISTRIES_COLLECTION, ministryId);
    await updateDoc(ministryRef, {
      status: 'suspended' as MinistryStatus,
    });

    // Log to audit trail
    const adminUser = await getUserForAudit(adminUserId);
    await logAction({
      userId: adminUserId,
      userEmail: adminUser.email,
      agencyName: adminUser.agencyName,
      userRole: adminUser.role,
      action: 'ministry.suspend',
      resourceType: 'ministry',
      resourceId: ministryId,
      details: `Suspended ministry: ${ministry.name}`,
      metadata: {
        ministryName: ministry.name,
        ministryType: ministry.ministryType,
        location: ministry.location,
        previousStatus: ministry.status,
      },
    });
  } catch (error: any) {
    console.error('Error suspending ministry:', error);
    throw new Error('Failed to suspend ministry');
  }
};

/**
 * Reactivate a suspended ministry (admin only)
 */
export const reactivateMinistry = async (
  ministryId: string,
  adminUserId: string
): Promise<void> => {
  try {
    // Get ministry details for logging
    const ministryDoc = await getDoc(doc(db, MINISTRIES_COLLECTION, ministryId));
    const ministry = ministryDoc.data() as Ministry;

    const ministryRef = doc(db, MINISTRIES_COLLECTION, ministryId);
    await updateDoc(ministryRef, {
      status: 'verified' as MinistryStatus,
    });

    // Log to audit trail
    const adminUser = await getUserForAudit(adminUserId);
    await logAction({
      userId: adminUserId,
      userEmail: adminUser.email,
      agencyName: adminUser.agencyName,
      userRole: adminUser.role,
      action: 'ministry.reactivate',
      resourceType: 'ministry',
      resourceId: ministryId,
      details: `Reactivated ministry: ${ministry.name}`,
      metadata: {
        ministryName: ministry.name,
        ministryType: ministry.ministryType,
        location: ministry.location,
        previousStatus: ministry.status,
      },
    });
  } catch (error: any) {
    console.error('Error reactivating ministry:', error);
    throw new Error('Failed to reactivate ministry');
  }
};
