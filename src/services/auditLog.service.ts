import {
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  getDocs,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { AuditLog, AuditAction, ResourceType, AuditLogFilters } from '@/types/auditLog.types';

const AUDIT_LOGS_COLLECTION = 'audit_logs';

/**
 * Log an action to the audit trail
 *
 * NOTE: Client-side audit logging is DISABLED for security reasons.
 * All audit logs are created by Cloud Functions using the Admin SDK.
 * This function is kept for API compatibility but does nothing.
 *
 * Important audit actions (approvals, rejections, role changes) are
 * automatically logged by the corresponding Cloud Functions.
 */
export const logAction = async (_params: {
  userId: string;
  userEmail: string;
  agencyName?: string;
  userRole: 'agency' | 'agency-approver' | 'ministry-admin' | 'admin';
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details: string;
  metadata?: Record<string, any>;
}): Promise<void> => {
  // Client-side audit logging is disabled
  // All audit logging is handled by Cloud Functions for security
  // This prevents unauthorized users from tampering with audit logs
  if (process.env.NODE_ENV === 'development') {
    console.log('[Audit - Server-side only]', _params.action, _params.details);
  }
};

/**
 * Get audit logs for a user
 */
export const getUserAuditLogs = async (
  userId: string,
  filters?: AuditLogFilters
): Promise<AuditLog[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
    ];

    // Apply filters
    if (filters?.action) {
      constraints.push(where('action', '==', filters.action));
    }

    if (filters?.resourceType) {
      constraints.push(where('resourceType', '==', filters.resourceType));
    }

    // Apply limit (default 50)
    const resultLimit = filters?.limit || 50;
    constraints.push(fbLimit(resultLimit));

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const logs: AuditLog[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];

    // Client-side date filtering (Firestore doesn't support range queries with multiple orderBy)
    let filteredLogs = logs;

    if (filters?.dateFrom) {
      const fromTimestamp = Timestamp.fromDate(filters.dateFrom);
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp.toMillis() >= fromTimestamp.toMillis()
      );
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      const toTimestamp = Timestamp.fromDate(toDate);
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp.toMillis() <= toTimestamp.toMillis()
      );
    }

    return filteredLogs;
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    throw new Error(error.message || 'Failed to load activity history');
  }
};

/**
 * Get all audit logs (admin only)
 */
export const getAllAuditLogs = async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
  try {
    const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')];

    // Apply filters
    if (filters?.action) {
      constraints.push(where('action', '==', filters.action));
    }

    if (filters?.resourceType) {
      constraints.push(where('resourceType', '==', filters.resourceType));
    }

    // Apply limit (default 100)
    const resultLimit = filters?.limit || 100;
    constraints.push(fbLimit(resultLimit));

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const logs: AuditLog[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];

    // Client-side date filtering
    let filteredLogs = logs;

    if (filters?.dateFrom) {
      const fromTimestamp = Timestamp.fromDate(filters.dateFrom);
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp.toMillis() >= fromTimestamp.toMillis()
      );
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toTimestamp = Timestamp.fromDate(toDate);
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp.toMillis() <= toTimestamp.toMillis()
      );
    }

    return filteredLogs;
  } catch (error: any) {
    console.error('Error fetching all audit logs:', error);
    throw new Error(error.message || 'Failed to load activity history');
  }
};

/**
 * Get audit log summary for a user
 */
export const getUserAuditSummary = async (userId: string) => {
  try {
    const logs = await getUserAuditLogs(userId, { limit: 1000 });

    const summary = {
      totalActions: logs.length,
      assetUploads: logs.filter((log) => log.action === 'asset.upload').length,
      assetApprovals: logs.filter((log) => log.action === 'asset.approve').length,
      assetRejections: logs.filter((log) => log.action === 'asset.reject').length,
      lastLoginAt: logs.find((log) => log.action === 'user.login')?.timestamp.toDate(),
    };

    return summary;
  } catch (error: any) {
    console.error('Error fetching audit summary:', error);
    throw new Error(error.message || 'Failed to load activity summary');
  }
};

/**
 * Helper function to format action for display
 */
export const formatAction = (action: AuditAction): string => {
  const actionMap: Record<AuditAction, string> = {
    // Asset actions
    'asset.upload': 'Uploaded Asset',
    'asset.approve': 'Approved Asset',
    'asset.reject': 'Rejected Asset',
    'asset.edit': 'Edited Asset',
    'asset.view': 'Viewed Asset',
    'asset.delete': 'Deleted Asset',
    'asset.bulk_upload': 'Bulk Uploaded Assets',
    'asset.status_change': 'Changed Asset Status',
    // User actions
    'user.login': 'Logged In',
    'user.logout': 'Logged Out',
    'user.register': 'Registered Account',
    'user.profile.update': 'Updated Profile',
    'user.password.change': 'Changed Password',
    'user.email.verify': 'Verified Email',
    'user.role.change': 'Changed User Role',
    'user.role.assign': 'Assigned User Role',
    'user.role.remove': 'Removed User Role',
    'user.account.disable': 'Disabled Account',
    'user.account.enable': 'Enabled Account',
    // Ministry actions
    'ministry.create': 'Created Ministry',
    'ministry.register': 'Registered Ministry',
    'ministry.verify': 'Verified Ministry',
    'ministry.reject': 'Rejected Ministry',
    'ministry.suspend': 'Suspended Ministry',
    'ministry.reactivate': 'Reactivated Ministry',
    'ministry.update': 'Updated Ministry',
    'ministry.role.assign': 'Assigned Ministry Role',
    'ministry.role.remove': 'Removed Ministry Role',
    // System actions
    'system.settings.update': 'Updated System Settings',
    'system.backup': 'System Backup',
    'system.restore': 'System Restore',
  };

  return actionMap[action] || action;
};

/**
 * Helper function to get action color
 */
export const getActionColor = (
  action: AuditAction
): 'grey' | 'primary' | 'success' | 'error' | 'warning' | 'info' => {
  // Success actions
  if (
    action === 'asset.approve' ||
    action === 'user.email.verify' ||
    action === 'ministry.verify' ||
    action === 'ministry.reactivate' ||
    action === 'user.role.assign'
  ) return 'success';

  // Error actions
  if (
    action === 'asset.reject' ||
    action === 'asset.delete' ||
    action === 'ministry.reject' ||
    action === 'user.role.remove'
  ) return 'error';

  // Warning actions
  if (action === 'ministry.suspend') return 'warning';

  // Primary actions
  if (
    action === 'asset.upload' ||
    action === 'asset.edit' ||
    action === 'asset.status_change' ||
    action === 'ministry.update'
  ) return 'primary';

  // Info actions
  if (
    action === 'user.login' ||
    action === 'user.register' ||
    action === 'ministry.register'
  ) return 'info';

  return 'grey';
};
