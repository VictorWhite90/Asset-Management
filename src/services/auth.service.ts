import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, Timestamp, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserRegistrationData, User, MinistryAdminRegistrationData } from '@/types/user.types';
import { COLLECTIONS, ERROR_MESSAGES } from '@/utils/constants';

/**
 * Register a new agency user
 */
export const registerAgency = async (
  registrationData: UserRegistrationData
): Promise<{ user: FirebaseUser; userData: User }> => {
  try {
    // NOTE: Role uniqueness is now enforced at the ministry level
    // The RegisterPage checks role availability before allowing submission
    // Each ministry can have only ONE uploader and ONE approver

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      registrationData.email,
      registrationData.password
    );

    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: registrationData.agencyName,
    });

    // Create user document in Firestore
    const userData: User = {
      userId: user.uid,
      email: registrationData.email,
      ministryId: registrationData.ministryId, // Reference to ministry document
      ministryType: registrationData.ministryType,
      agencyName: registrationData.agencyName,
      location: registrationData.location, // HQ address
      role: registrationData.role, // Use role selected during registration
      createdAt: Timestamp.now(),
      emailVerified: false,
      // After email verification, users need ministry admin approval
      // Note: accountStatus will be updated to 'pending_ministry_approval' after email verification
      accountStatus: 'pending_verification' as const,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), userData);

    // Note: Ministry role assignment is handled by Cloud Functions when ministry admin approves
    // This ensures proper security and prevents permission errors during registration

    // Send email verification with custom action URL to prevent spam
    // This directs to our custom EmailActionPage for better UX
    const actionCodeSettings = {
      url: `${window.location.origin}/auth/action`,
      handleCodeInApp: false,
    };

    await sendEmailVerification(user, actionCodeSettings);

    return { user, userData };
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Register a ministry admin with comprehensive information
 * Includes personal info (name, position, NIN, staff ID) AND ministry info
 * Ministry is created automatically when federal admin approves
 */
export const registerMinistryAdmin = async (
  registrationData: MinistryAdminRegistrationData
): Promise<{ user: FirebaseUser; userData: User }> => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      registrationData.email,
      registrationData.password
    );

    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: registrationData.fullName,
    });

    // Create user document in Firestore with comprehensive data
    const userData: User = {
      userId: user.uid,
      email: registrationData.email,
      name: registrationData.fullName,
      ministryId: '', // Empty until federal admin approves and ministry is created
      ministryType: registrationData.ministryType, // Store for reference
      agencyName: registrationData.ministryName, // Ministry name
      location: registrationData.ministryLocation, // Ministry location
      role: 'ministry-admin',
      createdAt: Timestamp.now(),
      emailVerified: false,
      accountStatus: 'pending_verification', // Pending until federal admin verifies
      isMinistryOwner: false, // Will be true after federal admin approves
      // Identity verification fields
      position: registrationData.position,
      nin: registrationData.nin,
      staffId: registrationData.staffId,
      // Store pending ministry data - will be used when admin approves
      pendingMinistry: {
        name: registrationData.ministryName,
        officialEmail: registrationData.ministryOfficialEmail,
        ministryType: registrationData.ministryType,
        location: registrationData.ministryLocation,
      },
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), userData);

    // Note: Audit logging is handled by Cloud Functions for security
    // Client-side audit logging has been removed to prevent permission errors

    // Send email verification
    const actionCodeSettings = {
      url: `${window.location.origin}/auth/action`,
      handleCodeInApp: false,
    };

    await sendEmailVerification(user, actionCodeSettings);

    return { user, userData };
  } catch (error: any) {
    console.error('Ministry admin registration error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Login user with email and password
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Resend email verification
 */
export const resendVerificationEmail = async (user: FirebaseUser): Promise<void> => {
  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/auth/action`,
      handleCodeInApp: false,
    };
    await sendEmailVerification(user, actionCodeSettings);
  } catch (error: any) {
    console.error('Email verification error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sync email verification status from Firebase Auth to Firestore
 * Call this after user clicks verification link in their email
 */
export const syncEmailVerificationStatus = async (user: FirebaseUser): Promise<boolean> => {
  try {
    // Reload user to get latest emailVerified status from Firebase Auth
    await user.reload();

    const isVerified = user.emailVerified;

    if (isVerified) {
      // Get user data to check role
      const userRef = doc(db, COLLECTIONS.USERS, user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data() as User;
      const updateData: any = {
        emailVerified: true,
      };

      // For regular staff (agency, agency-approver), set status to pending ministry approval
      // For ministry admins, they stay at pending_verification until federal admin approves
      if (userData.role === 'agency' || userData.role === 'agency-approver') {
        if (userData.accountStatus === 'pending_verification') {
          updateData.accountStatus = 'pending_ministry_approval';
        }
      }

      // Update Firestore user document
      await updateDoc(userRef, updateData);

      return true;
    }

    return false;
  } catch (error: any) {
    console.error('Error syncing email verification:', error);
    throw new Error('Failed to sync email verification status');
  }
};

/**
 * Get all pending approver verifications (Admin only)
 */
export const getPendingApprovers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(
      usersRef,
      where('role', '==', 'agency-approver'),
      where('accountStatus', '==', 'pending_verification')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
    })) as User[];
  } catch (error) {
    console.error('Error fetching pending approvers:', error);
    throw new Error('Failed to load pending approvers');
  }
};

/**
 * Get all pending ministry admin verifications (Federal Admin only)
 */
export const getPendingMinistryAdmins = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(
      usersRef,
      where('role', '==', 'ministry-admin'),
      where('accountStatus', '==', 'pending_verification')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
    })) as User[];
  } catch (error) {
    console.error('Error fetching pending ministry admins:', error);
    throw new Error('Failed to load pending ministry admins');
  }
};

/**
 * Approve an approver account (Admin only)
 */
export const approveApprover = async (
  approverId: string,
  adminUserId: string
): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, approverId);
    await updateDoc(userRef, {
      accountStatus: 'verified',
      verifiedBy: adminUserId,
      verifiedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error approving approver:', error);
    throw new Error('Failed to approve approver account');
  }
};

/**
 * Reject an approver account (Admin only)
 */
export const rejectApprover = async (
  approverId: string,
  adminUserId: string,
  reason: string
): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, approverId);
    await updateDoc(userRef, {
      accountStatus: 'rejected',
      verifiedBy: adminUserId,
      verifiedAt: Timestamp.now(),
      rejectionReason: reason,
    });
  } catch (error) {
    console.error('Error rejecting approver:', error);
    throw new Error('Failed to reject approver account');
  }
};

/**
 * Approve a ministry admin account (Federal Admin only)
 * Uses Cloud Function for server-side validation and custom claims
 */
export const approveMinistryAdmin = async (
  ministryAdminId: string,
  _federalAdminUserId: string // Not needed - Cloud Function gets from auth context
): Promise<void> => {
  const { approveMinistryAdminCF, refreshUserToken } = await import('./cloudFunctions.service');

  try {
    await approveMinistryAdminCF(ministryAdminId);

    // Refresh token to get updated claims (if the approved user is currently logged in)
    try {
      await refreshUserToken();
    } catch (err) {
      // Token refresh error is not critical - user will get new claims on next login
      console.warn('Token refresh failed (user may not be logged in):', err);
    }
  } catch (error) {
    console.error('Error approving ministry admin:', error);
    throw new Error('Failed to approve ministry admin account');
  }
};

/**
 * Reject a ministry admin account (Federal Admin only)
 * Uses Cloud Function for server-side validation
 */
export const rejectMinistryAdmin = async (
  ministryAdminId: string,
  _federalAdminUserId: string, // Not needed - Cloud Function gets from auth context
  reason: string
): Promise<void> => {
  const { rejectMinistryAdminCF } = await import('./cloudFunctions.service');

  try {
    await rejectMinistryAdminCF(ministryAdminId, reason);
  } catch (error) {
    console.error('Error rejecting ministry admin:', error);
    throw new Error('Failed to reject ministry admin account');
  }
};

/**
 * Get user-friendly error messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return ERROR_MESSAGES.AUTH.EMAIL_IN_USE;
    case 'auth/invalid-email':
      return ERROR_MESSAGES.AUTH.INVALID_EMAIL;
    case 'auth/weak-password':
      return ERROR_MESSAGES.AUTH.WEAK_PASSWORD;
    case 'auth/user-not-found':
      return ERROR_MESSAGES.AUTH.USER_NOT_FOUND;
    case 'auth/wrong-password':
      return ERROR_MESSAGES.AUTH.WRONG_PASSWORD;
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/too-many-requests':
      return ERROR_MESSAGES.AUTH.TOO_MANY_REQUESTS;
    case 'auth/network-request-failed':
      return ERROR_MESSAGES.AUTH.NETWORK_ERROR;
    default:
      return 'An error occurred. Please try again.';
  }
};
