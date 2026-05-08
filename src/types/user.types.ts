import { Timestamp } from 'firebase/firestore';

export type UserRole = 'agency' | 'agency-approver' | 'ministry-admin' | 'admin';

export type AccountStatus =
  | 'pending_verification'        // Email not verified yet
  | 'pending_ministry_approval'   // Email verified, waiting for ministry admin approval
  | 'verified'                    // Approved and active
  | 'rejected'                    // Rejected by admin
  | 'disabled';                   // Account disabled by admin

export interface User {
  userId: string;
  email: string;
  name?: string; // Full name of the user
  ministryId: string; // Reference to ministry document (empty for ministry-admin until ministry created)
  ministryType: string; // Ministry/Body type they fall under
  agencyName: string; // Staff agency/department/parastatal (ministry name for ministry-admin and older records)
  ministryName?: string; // Parent ministry name for staff accounts
  staffAgencyName?: string; // Explicit staff agency under the parent ministry
  location: string; // HQ physical address
  state?: string; // State workflow lane this staff member uploads/reviews for
  role: UserRole;
  createdAt: Timestamp;
  emailVerified: boolean;
  // Verification fields
  accountStatus?: AccountStatus; // Verification status (for approvers and ministry-admins)
  verifiedBy?: string; // Admin user ID who verified the account (federal admin for ministry-admin, ministry admin for staff)
  verifiedAt?: Timestamp; // When the account was verified
  rejectionReason?: string; // Reason for rejection (if rejected)
  uuid?: string; // Legacy UUID field (for backward compatibility)
  displayId?: string; // Short display ID assigned on approval (e.g., "EDU-STF-001")
  // Ministry admin specific
  isMinistryOwner?: boolean; // True if this user created/owns a ministry
  ownedMinistryId?: string; // Ministry ID they own (for ministry-admin role)
  // Identity verification fields (for ministry admin)
  position?: string; // Position/role in ministry (e.g., "Director", "Permanent Secretary")
  nin?: string; // National Identification Number
  staffId?: string; // Government Staff ID
  // Pending ministry data (stored during registration, used when approved)
  pendingMinistry?: {
    name: string;
    officialEmail: string;
    ministryType: string;
    location: string;
  };
}

export interface UserRegistrationData {
  email: string;
  password: string;
  ministryId: string; // Selected ministry ID
  ministryType: string; // Ministry/Body type (copied from ministry)
  agencyName: string; // Staff agency/department/parastatal selected by the user
  ministryName?: string; // Parent ministry name copied from the selected ministry
  staffAgencyName?: string; // Explicit staff agency under the parent ministry
  location: string; // HQ physical address (copied from ministry)
  state: string; // State workflow lane this staff member uploads/reviews for
  role: UserRole; // User selects their role during registration
}

export interface UserLoginData {
  email: string;
  password: string;
}

/**
 * Ministry Admin Registration Data
 * Comprehensive registration - includes personal info AND ministry info
 * Federal admin approves and ministry is created automatically
 */
export interface MinistryAdminRegistrationData {
  // Personal Information
  email: string;
  password: string;
  fullName: string; // Ministry admin's full name
  position: string; // Position/role in ministry (e.g., "Director", "Permanent Secretary")
  nin: string; // National Identification Number (11 digits)
  staffId: string; // Government Staff ID
  // Ministry Information
  ministryName: string;
  ministryOfficialEmail: string;
  ministryType: string;
  ministryLocation: string;
}
