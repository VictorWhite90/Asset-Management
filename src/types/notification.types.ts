/**
 * Notification Types for Email Notifications
 *
 * Email notifications are sent for key workflow events:
 * - Asset status changes (uploaded, approved, rejected)
 * - User registration and verification
 * - Ministry registration and verification
 */

export type NotificationEvent =
  // Asset workflow notifications
  | 'asset.uploaded' // Notify approvers when new asset is uploaded
  | 'asset.approved' // Notify uploader when asset is approved
  | 'asset.rejected' // Notify uploader when asset is rejected
  | 'asset.resubmitted' // Notify approvers when rejected asset is resubmitted
  // User workflow notifications
  | 'user.registered' // Notify admin when new user registers
  | 'user.verified' // Notify user when approver account is verified by admin
  | 'user.rejected' // Notify user when approver account is rejected by admin
  // Ministry workflow notifications
  | 'ministry.registered' // Notify admin when new ministry registers
  | 'ministry.verified' // Notify ministry when verified
  | 'ministry.rejected'; // Notify ministry when rejected

export interface NotificationRecipient {
  email: string;
  name: string;
  role?: 'agency' | 'agency-approver' | 'admin';
}

export interface NotificationData {
  event: NotificationEvent;
  recipient: NotificationRecipient;
  data: {
    // Asset-related data
    assetId?: string;
    assetDescription?: string;
    assetCategory?: string;
    uploaderName?: string;
    approverName?: string;
    rejectionReason?: string;

    // User-related data
    userId?: string;
    userName?: string;
    userEmail?: string;
    ministryName?: string;
    ministryId?: string;

    // Ministry-related data
    ministryType?: string;
    ministryLocation?: string;
    verificationReason?: string;

    // Additional context
    actionUrl?: string; // Deep link to the resource
    [key: string]: any; // Allow additional custom fields
  };
}

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface NotificationLog {
  id?: string;
  event: NotificationEvent;
  recipientEmail: string;
  sentAt: Date;
  status: 'sent' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, any>;
}
