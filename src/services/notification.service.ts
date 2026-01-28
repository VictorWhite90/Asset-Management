import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import {
  NotificationEvent,
  NotificationData,
  EmailTemplate,
  NotificationLog,
} from '@/types/notification.types';

const NOTIFICATION_LOGS_COLLECTION = 'notification_logs';

/**
 * Get email template for a notification event
 */
const getEmailTemplate = (notification: NotificationData): EmailTemplate => {
  const { event, recipient, data } = notification;
  const baseUrl = window.location.origin;

  switch (event) {
    case 'asset.uploaded':
      return {
        subject: `New Asset Upload Pending Approval - ${data.assetDescription}`,
        htmlBody: `
          <h2>New Asset Upload for Review</h2>
          <p>Hello ${recipient.name},</p>
          <p>A new asset has been uploaded by <strong>${data.uploaderName}</strong> and is pending your approval.</p>

          <h3>Asset Details:</h3>
          <ul>
            <li><strong>Asset ID:</strong> ${data.assetId}</li>
            <li><strong>Description:</strong> ${data.assetDescription}</li>
            <li><strong>Category:</strong> ${data.assetCategory}</li>
            <li><strong>Ministry:</strong> ${data.ministryName}</li>
          </ul>

          <p>Please review and approve or reject this asset.</p>
          <p><a href="${baseUrl}/review-uploads" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Asset</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
New Asset Upload for Review

Hello ${recipient.name},

A new asset has been uploaded by ${data.uploaderName} and is pending your approval.

Asset Details:
- Asset ID: ${data.assetId}
- Description: ${data.assetDescription}
- Category: ${data.assetCategory}
- Ministry: ${data.ministryName}

Please review and approve or reject this asset.

Visit: ${baseUrl}/review-uploads

Thank you,
Federal Asset Management System
        `,
      };

    case 'asset.approved':
      return {
        subject: `Asset Approved - ${data.assetDescription}`,
        htmlBody: `
          <h2>Asset Approved</h2>
          <p>Hello ${recipient.name},</p>
          <p>Your asset upload has been approved by <strong>${data.approverName}</strong>.</p>

          <h3>Asset Details:</h3>
          <ul>
            <li><strong>Asset ID:</strong> ${data.assetId}</li>
            <li><strong>Description:</strong> ${data.assetDescription}</li>
            <li><strong>Category:</strong> ${data.assetCategory}</li>
          </ul>

          <p>The asset is now visible in the federal asset registry.</p>
          <p><a href="${baseUrl}/agency-assets" style="background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View My Assets</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
Asset Approved

Hello ${recipient.name},

Your asset upload has been approved by ${data.approverName}.

Asset Details:
- Asset ID: ${data.assetId}
- Description: ${data.assetDescription}
- Category: ${data.assetCategory}

The asset is now visible in the federal asset registry.

Visit: ${baseUrl}/agency-assets

Thank you,
Federal Asset Management System
        `,
      };

    case 'asset.rejected':
      return {
        subject: `Asset Rejected - ${data.assetDescription}`,
        htmlBody: `
          <h2>Asset Rejected</h2>
          <p>Hello ${recipient.name},</p>
          <p>Your asset upload has been rejected by <strong>${data.approverName}</strong>.</p>

          <h3>Asset Details:</h3>
          <ul>
            <li><strong>Asset ID:</strong> ${data.assetId}</li>
            <li><strong>Description:</strong> ${data.assetDescription}</li>
            <li><strong>Category:</strong> ${data.assetCategory}</li>
            <li><strong>Rejection Reason:</strong> ${data.rejectionReason}</li>
          </ul>

          <p>You can edit and resubmit this asset.</p>
          <p><a href="${baseUrl}/agency-assets" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Edit & Resubmit</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
Asset Rejected

Hello ${recipient.name},

Your asset upload has been rejected by ${data.approverName}.

Asset Details:
- Asset ID: ${data.assetId}
- Description: ${data.assetDescription}
- Category: ${data.assetCategory}
- Rejection Reason: ${data.rejectionReason}

You can edit and resubmit this asset.

Visit: ${baseUrl}/agency-assets

Thank you,
Federal Asset Management System
        `,
      };

    case 'asset.resubmitted':
      return {
        subject: `Asset Resubmitted for Review - ${data.assetDescription}`,
        htmlBody: `
          <h2>Asset Resubmitted for Review</h2>
          <p>Hello ${recipient.name},</p>
          <p>A previously rejected asset has been edited and resubmitted by <strong>${data.uploaderName}</strong>.</p>

          <h3>Asset Details:</h3>
          <ul>
            <li><strong>Asset ID:</strong> ${data.assetId}</li>
            <li><strong>Description:</strong> ${data.assetDescription}</li>
            <li><strong>Category:</strong> ${data.assetCategory}</li>
            <li><strong>Ministry:</strong> ${data.ministryName}</li>
          </ul>

          <p>Please review the updated submission.</p>
          <p><a href="${baseUrl}/review-uploads" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Asset</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
Asset Resubmitted for Review

Hello ${recipient.name},

A previously rejected asset has been edited and resubmitted by ${data.uploaderName}.

Asset Details:
- Asset ID: ${data.assetId}
- Description: ${data.assetDescription}
- Category: ${data.assetCategory}
- Ministry: ${data.ministryName}

Please review the updated submission.

Visit: ${baseUrl}/review-uploads

Thank you,
Federal Asset Management System
        `,
      };

    case 'user.registered':
      return {
        subject: `New User Registration - ${data.userName}`,
        htmlBody: `
          <h2>New User Registration</h2>
          <p>Hello Admin,</p>
          <p>A new user has registered and requires verification.</p>

          <h3>User Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${data.userName}</li>
            <li><strong>Email:</strong> ${data.userEmail}</li>
            <li><strong>Role:</strong> ${data.data?.role}</li>
            <li><strong>Ministry:</strong> ${data.ministryName}</li>
          </ul>

          <p>Please review and verify this user account.</p>
          <p><a href="${baseUrl}/admin/verify-users" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify User</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
New User Registration

Hello Admin,

A new user has registered and requires verification.

User Details:
- Name: ${data.userName}
- Email: ${data.userEmail}
- Role: ${data.data?.role}
- Ministry: ${data.ministryName}

Please review and verify this user account.

Visit: ${baseUrl}/admin/verify-users

Thank you,
Federal Asset Management System
        `,
      };

    case 'user.verified':
      return {
        subject: 'Your Approver Account Has Been Verified',
        htmlBody: `
          <h2>Account Verified</h2>
          <p>Hello ${recipient.name},</p>
          <p>Your approver account has been verified by your ministry administrator.</p>

          <p>You can now log in and approve asset uploads from your ministry.</p>
          <p><a href="${baseUrl}/login" style="background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Login to Dashboard</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
Account Verified

Hello ${recipient.name},

Your approver account has been verified by your ministry administrator.

You can now log in and approve asset uploads from your ministry.

Visit: ${baseUrl}/login

Thank you,
Federal Asset Management System
        `,
      };

    case 'user.rejected':
      return {
        subject: 'Your Approver Account Registration Was Not Approved',
        htmlBody: `
          <h2>Account Registration Not Approved</h2>
          <p>Hello ${recipient.name},</p>
          <p>Unfortunately, your approver account registration could not be approved.</p>

          <p><strong>Reason:</strong> ${data.verificationReason || 'Not specified'}</p>

          <p>If you believe this is an error, please contact your ministry administrator or the federal administrator.</p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
Account Registration Not Approved

Hello ${recipient.name},

Unfortunately, your approver account registration could not be approved.

Reason: ${data.verificationReason || 'Not specified'}

If you believe this is an error, please contact your ministry administrator or the federal administrator.

Thank you,
Federal Asset Management System
        `,
      };

    case 'ministry.registered':
      return {
        subject: `New Ministry Registration - ${data.ministryName}`,
        htmlBody: `
          <h2>New Ministry Registration</h2>
          <p>Hello Admin,</p>
          <p>A new ministry has registered and requires verification.</p>

          <h3>Ministry Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${data.ministryName}</li>
            <li><strong>Type:</strong> ${data.ministryType}</li>
            <li><strong>Location:</strong> ${data.ministryLocation}</li>
            <li><strong>Official Email:</strong> ${data.data?.officialEmail}</li>
          </ul>

          <p>Please review and verify this ministry registration.</p>
          <p><a href="${baseUrl}/admin/verify-ministries" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Ministry</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
New Ministry Registration

Hello Admin,

A new ministry has registered and requires verification.

Ministry Details:
- Name: ${data.ministryName}
- Type: ${data.ministryType}
- Location: ${data.ministryLocation}
- Official Email: ${data.data?.officialEmail}

Please review and verify this ministry registration.

Visit: ${baseUrl}/admin/verify-ministries

Thank you,
Federal Asset Management System
        `,
      };

    case 'ministry.verified':
      return {
        subject: `Ministry Verified - ${data.ministryName}`,
        htmlBody: `
          <h2>Ministry Verified</h2>
          <p>Hello,</p>
          <p>Your ministry <strong>${data.ministryName}</strong> has been verified by the federal administrator.</p>

          <p>Users from your ministry can now register and upload assets to the federal asset registry.</p>
          <p><a href="${baseUrl}/register" style="background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Register User Account</a></p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
Ministry Verified

Hello,

Your ministry ${data.ministryName} has been verified by the federal administrator.

Users from your ministry can now register and upload assets to the federal asset registry.

Visit: ${baseUrl}/register

Thank you,
Federal Asset Management System
        `,
      };

    case 'ministry.rejected':
      return {
        subject: `Ministry Registration Not Approved - ${data.ministryName}`,
        htmlBody: `
          <h2>Ministry Registration Not Approved</h2>
          <p>Hello,</p>
          <p>Unfortunately, the registration for <strong>${data.ministryName}</strong> could not be approved.</p>

          <p><strong>Reason:</strong> ${data.verificationReason || 'Not specified'}</p>

          <p>If you believe this is an error, please contact the federal administrator.</p>

          <p>Thank you,<br/>Federal Asset Management System</p>
        `,
        textBody: `
Ministry Registration Not Approved

Hello,

Unfortunately, the registration for ${data.ministryName} could not be approved.

Reason: ${data.verificationReason || 'Not specified'}

If you believe this is an error, please contact the federal administrator.

Thank you,
Federal Asset Management System
        `,
      };

    default:
      return {
        subject: 'Notification from Federal Asset Management System',
        htmlBody: '<p>You have a new notification.</p>',
        textBody: 'You have a new notification.',
      };
  }
};

/**
 * Log notification attempt to Firestore
 */
const logNotification = async (
  event: NotificationEvent,
  recipientEmail: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const notificationLog: Omit<NotificationLog, 'id'> = {
      event,
      recipientEmail,
      sentAt: new Date(),
      status,
      errorMessage,
      metadata,
    };

    await addDoc(collection(db, NOTIFICATION_LOGS_COLLECTION), {
      ...notificationLog,
      sentAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log notification:', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
};

/**
 * Send email notification
 *
 * NOTE: This is a placeholder implementation.
 * In production, you would:
 * 1. Use Firebase Cloud Functions to send emails server-side
 * 2. Integrate with email service (SendGrid, AWS SES, Mailgun, etc.)
 * 3. Use Firebase Extensions like "Trigger Email"
 *
 * For now, this function:
 * - Generates the email template
 * - Logs the notification attempt
 * - Simulates sending (logs to console in dev)
 */
export const sendNotification = async (notification: NotificationData): Promise<void> => {
  try {
    const template = getEmailTemplate(notification);

    // Log notification metadata
    const metadata = {
      event: notification.event,
      recipientName: notification.recipient.name,
      assetId: notification.data.assetId,
      ministryName: notification.data.ministryName,
    };

    // PRODUCTION: Replace this with actual email sending
    // Example using Firebase Cloud Functions:
    // await httpsCallable(functions, 'sendEmail')({
    //   to: notification.recipient.email,
    //   subject: template.subject,
    //   html: template.htmlBody,
    //   text: template.textBody,
    // });

    // DEVELOPMENT: Log email to console
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [EMAIL NOTIFICATION]', {
        to: notification.recipient.email,
        subject: template.subject,
        event: notification.event,
        metadata,
      });
      console.log('Email Body (Text):\n', template.textBody);
    }

    // Log successful notification
    await logNotification(
      notification.event,
      notification.recipient.email,
      'sent',
      undefined,
      metadata
    );
  } catch (error: any) {
    console.error('Failed to send notification:', error);

    // Log failed notification
    await logNotification(
      notification.event,
      notification.recipient.email,
      'failed',
      error.message,
      { error: error.toString() }
    );

    // Don't throw - notification failure shouldn't break the main workflow
  }
};

/**
 * Send notification to multiple recipients
 */
export const sendBatchNotifications = async (
  notifications: NotificationData[]
): Promise<void> => {
  try {
    await Promise.all(notifications.map((notification) => sendNotification(notification)));
  } catch (error) {
    console.error('Failed to send batch notifications:', error);
    // Don't throw - notification failure shouldn't break the main workflow
  }
};

/**
 * Helper: Notify approvers when asset is uploaded
 */
export const notifyApproversOfNewAsset = async (
  assetId: string,
  assetDescription: string,
  assetCategory: string,
  uploaderName: string,
  ministryName: string,
  approverEmails: string[]
): Promise<void> => {
  const notifications: NotificationData[] = approverEmails.map((email) => ({
    event: 'asset.uploaded',
    recipient: { email, name: 'Approver', role: 'agency-approver' },
    data: {
      assetId,
      assetDescription,
      assetCategory,
      uploaderName,
      ministryName,
    },
  }));

  await sendBatchNotifications(notifications);
};

/**
 * Helper: Notify uploader when asset is approved
 */
export const notifyUploaderOfApproval = async (
  uploaderEmail: string,
  uploaderName: string,
  assetId: string,
  assetDescription: string,
  assetCategory: string,
  approverName: string
): Promise<void> => {
  await sendNotification({
    event: 'asset.approved',
    recipient: { email: uploaderEmail, name: uploaderName, role: 'agency' },
    data: {
      assetId,
      assetDescription,
      assetCategory,
      approverName,
    },
  });
};

/**
 * Helper: Notify uploader when asset is rejected
 */
export const notifyUploaderOfRejection = async (
  uploaderEmail: string,
  uploaderName: string,
  assetId: string,
  assetDescription: string,
  assetCategory: string,
  approverName: string,
  rejectionReason: string
): Promise<void> => {
  await sendNotification({
    event: 'asset.rejected',
    recipient: { email: uploaderEmail, name: uploaderName, role: 'agency' },
    data: {
      assetId,
      assetDescription,
      assetCategory,
      approverName,
      rejectionReason,
    },
  });
};
