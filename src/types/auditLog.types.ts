import { Timestamp } from 'firebase/firestore';

/**
 * Audit Action Types
 * Comprehensive list of all trackable actions in the system
 */
export type AuditAction =
  // Asset actions
  | 'asset.upload'
  | 'asset.approve'
  | 'asset.reject'
  | 'asset.edit'
  | 'asset.view'
  | 'asset.delete'
  | 'asset.bulk_upload'
  | 'asset.status_change'

  // User actions
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.profile.update'
  | 'user.password.change'
  | 'user.email.verify'
  | 'user.role.change'
  | 'user.role.assign'
  | 'user.role.remove'
  | 'user.account.disable'
  | 'user.account.enable'

  // Ministry actions
  | 'ministry.create'
  | 'ministry.register'
  | 'ministry.verify'
  | 'ministry.reject'
  | 'ministry.suspend'
  | 'ministry.reactivate'
  | 'ministry.update'
  | 'ministry.role.assign'
  | 'ministry.role.remove'

  // System actions
  | 'system.settings.update'
  | 'system.backup'
  | 'system.restore';

/**
 * Resource Types
 */
export type ResourceType = 'asset' | 'user' | 'ministry' | 'system';

/**
 * Audit Log Entry
 * Records all significant actions performed in the system
 */
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  agencyName: string;
  userRole: 'agency' | 'agency-approver' | 'ministry-admin' | 'admin';
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string; // Asset ID, User ID, Ministry ID, etc.
  details: string; // Human-readable description
  metadata?: Record<string, any>; // Additional contextual data
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

/**
 * Audit Log Creation Data
 * Used when creating new audit log entries
 */
export interface AuditLogData {
  userId: string;
  userEmail: string;
  agencyName: string;
  userRole: 'agency' | 'agency-approver' | 'ministry-admin' | 'admin';
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Log Filter Options
 */
export interface AuditLogFilters {
  userId?: string; // Filter by specific user
  action?: AuditAction; // Filter by action type
  resourceType?: ResourceType; // Filter by resource type
  resourceId?: string; // Filter by specific resource
  dateFrom?: Date; // Filter by date range start
  dateTo?: Date; // Filter by date range end
  limit?: number; // Limit number of results
}

/**
 * Audit Log Statistics
 * Summary of user activity
 */
export interface AuditLogStats {
  totalActions: number;
  assetUploads: number;
  assetApprovals: number;
  assetRejections: number;
  assetEdits: number;
  loginCount: number;
  lastLoginAt?: Timestamp;
  lastActionAt?: Timestamp;
}

/**
 * Audit Log Summary
 * Simplified summary for user profile display
 */
export interface AuditLogSummary {
  totalActions: number;
  assetUploads: number;
  assetApprovals: number;
  assetRejections: number;
  lastLoginAt?: Date;
}
