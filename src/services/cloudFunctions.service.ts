/**
 * Cloud Functions Client Service
 *
 * Wrappers for calling Cloud Functions with proper error handling.
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from './firebase';

// Response types
interface CloudFunctionResponse {
  success: boolean;
  message: string;
}

interface ApproveStaffResponse extends CloudFunctionResponse {
  uuid?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Call a Cloud Function with error handling
 */
async function callFunction<T = CloudFunctionResponse>(
  functionName: string,
  data?: unknown
): Promise<T> {
  try {
    const callable = httpsCallable<unknown, T>(functions, functionName);
    const result: HttpsCallableResult<T> = await callable(data);
    return result.data;
  } catch (error: any) {
    console.error(`Cloud Function error [${functionName}]:`, error);

    // Extract error message from Firebase HttpsError
    const errorMessage =
      error.message ||
      error.details?.message ||
      `Failed to execute ${functionName}`;

    throw new Error(errorMessage);
  }
}

/**
 * Federal Admin: Approve Ministry Admin
 */
export const approveMinistryAdminCF = async (
  ministryAdminId: string
): Promise<void> => {
  await callFunction('approveMinistryAdmin', { ministryAdminId });
};

/**
 * Federal Admin: Reject Ministry Admin
 */
export const rejectMinistryAdminCF = async (
  ministryAdminId: string,
  reason: string
): Promise<void> => {
  await callFunction('rejectMinistryAdmin', { ministryAdminId, reason });
};

/**
 * Ministry Admin: Approve Staff
 * Returns UUID assigned to the approved staff member
 */
export const approveStaffByMinistryAdminCF = async (
  staffUserId: string
): Promise<ApproveStaffResponse> => {
  return await callFunction<ApproveStaffResponse>('approveStaffByMinistryAdmin', { staffUserId });
};

/**
 * Ministry Admin: Reject Staff
 */
export const rejectStaffByMinistryAdminCF = async (
  staffUserId: string,
  reason: string
): Promise<void> => {
  await callFunction('rejectStaffByMinistryAdmin', { staffUserId, reason });
};

/**
 * Ministry Admin: Remove Staff from Ministry
 */
export const removeStaffFromMinistryCF = async (
  staffUserId: string,
  reason?: string
): Promise<void> => {
  await callFunction('removeStaffFromMinistry', { staffUserId, reason });
};

/**
 * Ministry Admin: Change Staff Role
 * Changes staff role between 'agency' (uploader) and 'agency-approver' (approver)
 */
export const changeStaffRoleCF = async (
  staffUserId: string,
  newRole: 'agency' | 'agency-approver'
): Promise<void> => {
  await callFunction('changeStaffRoleByMinistryAdmin', { staffUserId, newRole });
};

/**
 * Ministry Admin: Disable Staff
 * Disables a staff account (frees up slot for new registrations)
 */
export const disableStaffCF = async (
  staffUserId: string,
  reason?: string
): Promise<void> => {
  await callFunction('disableStaffByMinistryAdmin', { staffUserId, reason });
};

/**
 * Ministry Admin: Enable Staff
 * Re-enables a previously disabled staff account
 */
export const enableStaffCF = async (staffUserId: string): Promise<void> => {
  await callFunction('enableStaffByMinistryAdmin', { staffUserId });
};

/**
 * Force refresh user's ID token to get updated custom claims
 */
export const refreshUserToken = async (): Promise<void> => {
  const { auth } = await import('./firebase');
  const user = auth.currentUser;

  if (user) {
    try {
      await user.getIdToken(true); // Force refresh
      console.log('User token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh authentication token');
    }
  } else {
    throw new Error('No user logged in');
  }
};
