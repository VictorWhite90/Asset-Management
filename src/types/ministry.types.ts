import { Timestamp } from 'firebase/firestore';

/**
 * Ministry Status
 * - pending_verification: Ministry registered but not yet verified by admin
 * - verified: Ministry verified and active
 * - suspended: Ministry temporarily suspended
 * - rejected: Ministry registration rejected
 */
export type MinistryStatus = 'pending_verification' | 'verified' | 'suspended' | 'rejected';

/**
 * Ministry Entity
 * Represents a federal ministry/agency/department in the system
 */
export interface Ministry {
  ministryId: string;
  name: string; // e.g., "Federal Ministry of Finance"
  officialEmail: string; // e.g., "info@finance.gov.ng"
  ministryType: string; // Federal Ministry, Agency, Parastatal, etc.
  location: string; // Headquarters location
  status: MinistryStatus;
  createdAt: Timestamp;
  verifiedAt?: Timestamp;
  verifiedBy?: string; // Federal admin userId who verified ministry
  rejectedAt?: Timestamp;
  rejectedBy?: string; // Federal admin userId who rejected
  rejectionReason?: string;

  // Ministry ownership - ONE ministry admin per ministry
  ownerId: string; // Ministry admin user ID who created/owns this ministry
  ownerEmail: string; // Ministry admin's email
  ownerName?: string; // Ministry admin's full name

  // Role tracking - supports multiple uploaders and approvers
  uploaders: string[]; // Array of uploader user IDs (max 6)
  approvers: string[]; // Array of approver user IDs (max 5)
  primaryApprover?: string; // Primary/head approver user ID
  maxUploaders?: number; // Maximum uploaders allowed (default 6)
  maxApprovers?: number; // Maximum approvers allowed (default 5)

  // Legacy fields (kept for backward compatibility during migration)
  hasUploader?: boolean; // DEPRECATED: Use uploaders.length > 0
  hasApprover?: boolean; // DEPRECATED: Use approvers.length > 0
  uploaderUserId?: string; // DEPRECATED: Use uploaders[0]
  approverUserId?: string; // DEPRECATED: Use approvers[0]
}

/**
 * Ministry Form Data (for registration)
 */
export interface MinistryFormData {
  name: string;
  officialEmail: string;
  ministryType: string;
  location: string;
}

/**
 * Ministry with user counts (for admin dashboard)
 */
export interface MinistryWithStats extends Ministry {
  totalAssets: number;
  pendingAssets: number;
  approvedAssets: number;
}
