/**
 * Cloud Functions for Nigeria Government Asset Management System
 *
 * Security-focused implementation using custom claims for role-based access control.
 * All approval workflows are server-side to prevent client tampering.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import nodemailer from "nodemailer";
import {
  generateStaffDisplayId,
  findUserByDisplayId,
  backfillDisplayIds,
} from "./displayId";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Callable functions must be publicly invokable at the Cloud Run layer so browser
// preflight requests can reach Firebase's callable auth wrapper. Role checks below
// still enforce application security.
setGlobalOptions({ maxInstances: 10, invoker: "public" });

// Constants
const USERS_COLLECTION = "users";
const MINISTRIES_COLLECTION = "ministries";
const AUDIT_LOGS_COLLECTION = "auditLogs";
const DEFAULT_MAX_UPLOADERS = 6;
const DEFAULT_MAX_APPROVERS = 5;
const MAX_UPLOADERS_PER_STATE = 4;
const MAX_APPROVERS_PER_STATE = 4;
const callableOptions = { cors: true, invoker: "public" as const };
const DEFAULT_APP_URL = "https://asset-management-rivers-state.vercel.app";
const appUrlParam = defineString("APP_URL", { default: DEFAULT_APP_URL });
const fromEmailParam = defineString("FROM_EMAIL", {
  default: "Rivers State Asset Management System",
});
const gmailUser = defineSecret("GMAIL_SMTP_USER");
const gmailAppPassword = defineSecret("GMAIL_SMTP_APP_PASSWORD");
const VERIFICATION_EMAIL_COOLDOWN_MS = 60 * 1000;

// Types
type UserRole = "agency" | "agency-approver" | "ministry-admin" | "admin";
type StaffRole = "agency" | "agency-approver";

type AccountStatus =
  | "pending_verification"
  | "pending_ministry_approval"
  | "verified"
  | "rejected"
  | "disabled";

interface PendingMinistry {
  name: string;
  officialEmail: string;
  ministryType: string;
  location: string;
}

interface User {
  userId: string;
  email: string;
  name?: string;
  ministryId: string;
  ministryType: string;
  agencyName: string;
  ministryName?: string;
  staffAgencyName?: string;
  location: string;
  state?: string;
  role: UserRole;
  emailVerified: boolean;
  accountStatus?: AccountStatus;
  verifiedBy?: string;
  verifiedAt?: admin.firestore.Timestamp;
  rejectionReason?: string;
  uuid?: string;
  isMinistryOwner?: boolean;
  ownedMinistryId?: string;
  // Identity verification fields
  position?: string;
  nin?: string;
  staffId?: string;
  // Pending ministry data (used during ministry admin registration)
  pendingMinistry?: PendingMinistry;
}

// Helper Functions

/**
 * Verify user is authenticated
 */
function requireAuth(
  context: CallableRequest["auth"],
): NonNullable<CallableRequest["auth"]> {
  if (!context) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return context;
}

/**
 * Verify user has a specific role (via custom claims)
 */
function requireRole(
  context: CallableRequest["auth"],
  requiredRole: UserRole,
): void {
  const auth = requireAuth(context);
  const userRole = auth.token.role as UserRole | undefined;

  if (userRole !== requiredRole) {
    throw new HttpsError(
      "permission-denied",
      `This operation requires ${requiredRole} role`,
    );
  }
}

/**
 * Get user document from Firestore
 */
async function getUserDoc(userId: string): Promise<User> {
  const userDoc = await admin
    .firestore()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  return userDoc.data() as User;
}

function getStateRoleLimit(role: StaffRole): number {
  return role === "agency" ? MAX_UPLOADERS_PER_STATE : MAX_APPROVERS_PER_STATE;
}

function getStateRoleLabel(role: StaffRole, count: number): string {
  const singular = role === "agency" ? "uploader" : "approver";
  return count === 1 ? singular : `${singular}s`;
}

async function assertStateRoleCapacity(
  ministryId: string,
  state: string,
  role: StaffRole,
): Promise<void> {
  const maxActiveStaff = getStateRoleLimit(role);
  const existingSameStateRole = await admin
    .firestore()
    .collection(USERS_COLLECTION)
    .where("ministryId", "==", ministryId)
    .where("state", "==", state)
    .where("role", "==", role)
    .where("accountStatus", "==", "verified")
    .limit(maxActiveStaff)
    .get();

  if (existingSameStateRole.size >= maxActiveStaff) {
    throw new HttpsError(
      "already-exists",
      `This ministry already has ${maxActiveStaff} active ${getStateRoleLabel(role, maxActiveStaff)} for ${state}`,
    );
  }
}

/**
 * Set custom claims for a user
 */
async function setUserClaims(
  userId: string,
  role: UserRole,
  ministryId?: string,
  state?: string,
): Promise<void> {
  const claims: { role: UserRole; ministryId?: string; state?: string } = { role };
  if (ministryId) {
    claims.ministryId = ministryId;
  }
  if (state) {
    claims.state = state;
  }

  await admin.auth().setCustomUserClaims(userId, claims);
  logger.info(`Set custom claims for user ${userId}`, { role, ministryId, state });
}

/**
 * Log action to audit trail
 */
async function logAction(data: {
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await admin
    .firestore()
    .collection(AUDIT_LOGS_COLLECTION)
    .add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

function buildVerificationActionUrl(firebaseLink: string): string {
  const url = new URL(firebaseLink);
  const mode = url.searchParams.get("mode") || "verifyEmail";
  const oobCode = url.searchParams.get("oobCode");
  const apiKey = url.searchParams.get("apiKey");
  const lang = url.searchParams.get("lang");

  if (!oobCode) {
    throw new HttpsError(
      "internal",
      "Firebase did not return a verification code",
    );
  }

  const appLink = new URL("/auth/action", getAppUrl());
  appLink.searchParams.set("mode", mode);
  appLink.searchParams.set("oobCode", oobCode);
  if (apiKey) appLink.searchParams.set("apiKey", apiKey);
  if (lang) appLink.searchParams.set("lang", lang);
  return appLink.toString();
}

function buildPasswordResetActionUrl(firebaseLink: string): string {
  const url = new URL(firebaseLink);
  const oobCode = url.searchParams.get("oobCode");
  const apiKey = url.searchParams.get("apiKey");
  const lang = url.searchParams.get("lang");

  if (!oobCode) {
    throw new HttpsError(
      "internal",
      "Firebase did not return a password reset code",
    );
  }

  const appLink = new URL("/reset-password", getAppUrl());
  appLink.searchParams.set("oobCode", oobCode);
  if (apiKey) appLink.searchParams.set("apiKey", apiKey);
  if (lang) appLink.searchParams.set("lang", lang);
  return appLink.toString();
}

function getAppUrl(): string {
  return appUrlParam.value().replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendSmtpEmail(data: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const user = gmailUser.value();
  const pass = gmailAppPassword.value();
  if (!user || !pass) {
    throw new HttpsError(
      "failed-precondition",
      "Email provider is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD secrets.",
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${fromEmailParam.value()}" <${user}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
    });
  } catch (error) {
    logger.error("Gmail SMTP email request failed", { error });
    throw new HttpsError(
      "internal",
      "Failed to send verification email",
    );
  }
}

function verificationEmailHtml(displayName: string, verificationUrl: string): string {
  const safeDisplayName = escapeHtml(displayName);
  const safeVerificationUrl = escapeHtml(verificationUrl);

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102018;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#008751;margin:0 0 16px;">Verify your email address</h2>
      <p>Hello ${safeDisplayName},</p>
      <p>Please verify your email address to activate your Rivers State Asset Management account.</p>
      <p style="margin:28px 0;">
        <a href="${safeVerificationUrl}" style="background:#008751;color:#ffffff;padding:13px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:700;">
          Verify Email
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;color:#008751;">${safeVerificationUrl}</p>
      <p style="color:#66706a;font-size:13px;margin-top:28px;">If you did not create this account, you can ignore this email.</p>
    </div>
  `;
}

function passwordResetEmailHtml(resetUrl: string): string {
  const safeResetUrl = escapeHtml(resetUrl);

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102018;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#008751;margin:0 0 16px;">Reset your password</h2>
      <p>We received a request to reset the password for your Rivers State Asset Management account.</p>
      <p style="margin:28px 0;">
        <a href="${safeResetUrl}" style="background:#008751;color:#ffffff;padding:13px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:700;">
          Reset Password
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;color:#008751;">${safeResetUrl}</p>
      <p style="color:#66706a;font-size:13px;margin-top:28px;">If you did not request this password reset, you can ignore this email.</p>
    </div>
  `;
}

// Callable Functions

/**
 * Send a custom HTML email verification message for the currently signed-in user.
 */
export const sendCustomVerificationEmail = onCall(
  { ...callableOptions, secrets: [gmailUser, gmailAppPassword] },
  async (request): Promise<{ success: boolean; message: string }> => {
    const callerAuth = requireAuth(request.auth);
    const userRecord = await admin.auth().getUser(callerAuth.uid);
    const userRef = admin.firestore().collection(USERS_COLLECTION).doc(callerAuth.uid);
    const userDoc = await userRef.get();
    const lastSentAt = userDoc.data()?.lastVerificationEmailSentAt as
      | admin.firestore.Timestamp
      | undefined;

    if (lastSentAt && Date.now() - lastSentAt.toMillis() < VERIFICATION_EMAIL_COOLDOWN_MS) {
      throw new HttpsError(
        "resource-exhausted",
        "Please wait a minute before requesting another verification email.",
      );
    }

    if (!userRecord.email) {
      throw new HttpsError("failed-precondition", "User has no email address");
    }

    if (userRecord.emailVerified) {
      return {
        success: true,
        message: "Email address is already verified",
      };
    }

    const firebaseLink = await admin.auth().generateEmailVerificationLink(
      userRecord.email,
      {
        url: `${getAppUrl()}/dashboard`,
        handleCodeInApp: false,
      },
    );
    const verificationUrl = buildVerificationActionUrl(firebaseLink);
    const displayName = userRecord.displayName || "there";
    const subject = "Verify your Rivers State Asset Management account";

    await sendSmtpEmail({
      to: userRecord.email,
      subject,
      html: verificationEmailHtml(displayName, verificationUrl),
      text: [
        `Hello ${displayName},`,
        "",
        "Please verify your email address to activate your Rivers State Asset Management account.",
        "",
        verificationUrl,
        "",
        "If you did not create this account, you can ignore this email.",
      ].join("\n"),
    });

    await userRef.set(
      {
        lastVerificationEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    logger.info("Custom verification email sent", {
      userId: callerAuth.uid,
      email: userRecord.email,
    });

    return {
      success: true,
      message: "Verification email sent",
    };
  },
);

/**
 * Send a custom HTML password reset email. Always returns success to avoid
 * revealing whether an email address is registered.
 */
export const sendCustomPasswordResetEmail = onCall(
  { ...callableOptions, secrets: [gmailUser, gmailAppPassword] },
  async (request): Promise<{ success: boolean; message: string }> => {
    const email = typeof request.data?.email === "string"
      ? request.data.email.trim().toLowerCase()
      : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "A valid email address is required");
    }

    try {
      await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        throw new HttpsError(
          "not-found",
          "No login account was found for this email. Please use the owner/account email used during registration, not the ministry official email.",
        );
      }
      logger.error("Unable to check password reset email", { email, error });
      throw new HttpsError("internal", "Unable to check this email address");
    }

    try {
      const firebaseLink = await admin.auth().generatePasswordResetLink(
        email,
        {
          url: `${getAppUrl()}/login`,
          handleCodeInApp: false,
        },
      );
      const resetUrl = buildPasswordResetActionUrl(firebaseLink);
      const subject = "Reset your Rivers State Asset Management password";

      await sendSmtpEmail({
        to: email,
        subject,
        html: passwordResetEmailHtml(resetUrl),
        text: [
          "We received a request to reset the password for your Rivers State Asset Management account.",
          "",
          resetUrl,
          "",
          "If you did not request this password reset, you can ignore this email.",
        ].join("\n"),
      });

      logger.info("Custom password reset email sent", { email });
    } catch (error: any) {
      logger.error("Custom password reset email failed", { email, error });
      throw new HttpsError("internal", "Failed to send password reset email");
    }

    return {
      success: true,
      message: "If an account exists for this email, password reset instructions have been sent.",
    };
  },
);

/**
 * Approve Ministry Admin (Federal Admin Only)
 *
 * Federal admin approves ministry admin account.
 * Creates the ministry from pendingMinistry data.
 * Sets custom claims: { role: 'ministry-admin', ministryId }
 */
export const approveMinistryAdmin = onCall(
  callableOptions,
  async (
    request,
  ): Promise<{ success: boolean; message: string; ministryId?: string }> => {
    const { ministryAdminId } = request.data;

    // Validate input
    if (!ministryAdminId || typeof ministryAdminId !== "string") {
      throw new HttpsError("invalid-argument", "ministryAdminId is required");
    }

    // Verify caller is federal admin
    requireRole(request.auth, "admin");
    const callerAuth = requireAuth(request.auth);

    // Get ministry admin user doc
    const ministryAdmin = await getUserDoc(ministryAdminId);

    // Verify user is ministry-admin role
    if (ministryAdmin.role !== "ministry-admin") {
      throw new HttpsError(
        "failed-precondition",
        "User is not a ministry admin",
      );
    }

    // Verify user is pending verification
    if (ministryAdmin.accountStatus !== "pending_verification") {
      throw new HttpsError(
        "failed-precondition",
        "User is not pending verification",
      );
    }

    if (!ministryAdmin.emailVerified) {
      throw new HttpsError(
        "failed-precondition",
        "Ministry admin must verify their email before approval",
      );
    }

    // Check for pending ministry data
    const pendingMinistry = ministryAdmin.pendingMinistry;
    if (!pendingMinistry) {
      throw new HttpsError(
        "failed-precondition",
        "No pending ministry data found for this user",
      );
    }

    // Create the ministry document
    const ministryRef = admin
      .firestore()
      .collection(MINISTRIES_COLLECTION)
      .doc();
    const ministryId = ministryRef.id;

    await ministryRef.set({
      ministryId: ministryId,
      name: pendingMinistry.name,
      officialEmail: pendingMinistry.officialEmail,
      ministryType: pendingMinistry.ministryType,
      location: pendingMinistry.location,
      status: "verified",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: callerAuth.uid,
      ownerId: ministryAdminId,
      ownerEmail: ministryAdmin.email,
      ownerName: ministryAdmin.name || ministryAdmin.agencyName,
      uploaders: [],
      approvers: [],
      maxUploaders: DEFAULT_MAX_UPLOADERS,
      maxApprovers: DEFAULT_MAX_APPROVERS,
      hasUploader: false,
      hasApprover: false,
    });

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(ministryAdminId)
      .update({
        accountStatus: "verified",
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        ministryId: ministryId,
        isMinistryOwner: true,
        ownedMinistryId: ministryId,
        pendingMinistry: admin.firestore.FieldValue.delete(),
      });

    // Set custom claims with ministryId
    await setUserClaims(ministryAdminId, "ministry-admin", ministryId);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerAuth.token.email || "unknown",
      userRole: "admin",
      action: "ministry_admin.approve",
      resourceType: "user",
      resourceId: ministryAdminId,
      details: `Approved ministry admin: ${ministryAdmin.email} and created ministry: ${pendingMinistry.name}`,
      metadata: {
        targetUser: ministryAdmin.email,
        ministryId: ministryId,
        ministryName: pendingMinistry.name,
      },
    });

    logger.info("Ministry admin approved and ministry created", {
      ministryAdminId,
      ministryId,
      ministryName: pendingMinistry.name,
      approvedBy: callerAuth.uid,
    });

    return {
      success: true,
      message: `Ministry admin approved and ministry "${pendingMinistry.name}" created successfully`,
      ministryId: ministryId,
    };
  },
);

/**
 * Reject Ministry Admin (Federal Admin Only)
 *
 * Federal admin rejects ministry admin account.
 */
export const rejectMinistryAdmin = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { ministryAdminId, reason } = request.data;

    // Validate input
    if (!ministryAdminId || typeof ministryAdminId !== "string") {
      throw new HttpsError("invalid-argument", "ministryAdminId is required");
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Rejection reason is required");
    }

    // Verify caller is federal admin
    requireRole(request.auth, "admin");
    const callerAuth = requireAuth(request.auth);

    // Get ministry admin user doc
    const ministryAdmin = await getUserDoc(ministryAdminId);

    // Verify user is ministry-admin role
    if (ministryAdmin.role !== "ministry-admin") {
      throw new HttpsError(
        "failed-precondition",
        "User is not a ministry admin",
      );
    }

    // Verify user is pending verification
    if (ministryAdmin.accountStatus !== "pending_verification") {
      throw new HttpsError(
        "failed-precondition",
        "User is not pending verification",
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(ministryAdminId)
      .update({
        accountStatus: "rejected",
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason.trim(),
      });

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerAuth.token.email || "unknown",
      userRole: "admin",
      action: "ministry_admin.reject",
      resourceType: "user",
      resourceId: ministryAdminId,
      details: `Rejected ministry admin: ${ministryAdmin.email} - Reason: ${reason}`,
      metadata: {
        targetUser: ministryAdmin.email,
        rejectionReason: reason,
      },
    });

    logger.info("Ministry admin rejected", {
      ministryAdminId,
      rejectedBy: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message: "Ministry admin rejected successfully",
    };
  },
);

/**
 * Disable Ministry Admin (Federal Admin Only)
 *
 * Disables an active ministry admin and revokes custom claims immediately.
 */
export const disableMinistryAdminByFederalAdmin = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { ministryAdminId, reason } = request.data;

    if (!ministryAdminId || typeof ministryAdminId !== "string") {
      throw new HttpsError("invalid-argument", "ministryAdminId is required");
    }

    requireRole(request.auth, "admin");
    const callerAuth = requireAuth(request.auth);

    if (ministryAdminId === callerAuth.uid) {
      throw new HttpsError("invalid-argument", "You cannot disable yourself");
    }

    const ministryAdmin = await getUserDoc(ministryAdminId);

    if (ministryAdmin.role !== "ministry-admin") {
      throw new HttpsError(
        "failed-precondition",
        "User is not a ministry admin",
      );
    }

    if (ministryAdmin.accountStatus !== "verified") {
      throw new HttpsError(
        "failed-precondition",
        "Only active ministry admins can be disabled",
      );
    }

    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(ministryAdminId)
      .update({
        accountStatus: "disabled",
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
        disabledBy: callerAuth.uid,
        disableReason:
          typeof reason === "string" && reason.trim()
            ? reason.trim()
            : "Disabled by Federal Administrator",
      });

    await admin.auth().setCustomUserClaims(ministryAdminId, null);

    await logAction({
      userId: callerAuth.uid,
      userEmail: callerAuth.token.email || "unknown",
      userRole: "admin",
      action: "user.account.disable",
      resourceType: "user",
      resourceId: ministryAdminId,
      details: `Disabled ministry admin: ${ministryAdmin.email}`,
      metadata: {
        targetUser: ministryAdmin.email,
        ministryId: ministryAdmin.ministryId,
        reason,
      },
    });

    return {
      success: true,
      message: "Ministry admin disabled successfully",
    };
  },
);

/**
 * Enable Ministry Admin (Federal Admin Only)
 *
 * Re-enables a disabled ministry admin and restores custom claims.
 */
export const enableMinistryAdminByFederalAdmin = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { ministryAdminId } = request.data;

    if (!ministryAdminId || typeof ministryAdminId !== "string") {
      throw new HttpsError("invalid-argument", "ministryAdminId is required");
    }

    requireRole(request.auth, "admin");
    const callerAuth = requireAuth(request.auth);
    const ministryAdmin = await getUserDoc(ministryAdminId);

    if (ministryAdmin.role !== "ministry-admin") {
      throw new HttpsError(
        "failed-precondition",
        "User is not a ministry admin",
      );
    }

    if (ministryAdmin.accountStatus !== "disabled") {
      throw new HttpsError(
        "failed-precondition",
        "Only disabled ministry admins can be enabled",
      );
    }

    if (!ministryAdmin.ministryId) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot restore claims because this ministry admin has no ministryId",
      );
    }

    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(ministryAdminId)
      .update({
        accountStatus: "verified",
        enabledAt: admin.firestore.FieldValue.serverTimestamp(),
        enabledBy: callerAuth.uid,
        disabledAt: admin.firestore.FieldValue.delete(),
        disabledBy: admin.firestore.FieldValue.delete(),
        disableReason: admin.firestore.FieldValue.delete(),
      });

    await setUserClaims(
      ministryAdminId,
      "ministry-admin",
      ministryAdmin.ministryId,
    );

    await logAction({
      userId: callerAuth.uid,
      userEmail: callerAuth.token.email || "unknown",
      userRole: "admin",
      action: "user.account.enable",
      resourceType: "user",
      resourceId: ministryAdminId,
      details: `Enabled ministry admin: ${ministryAdmin.email}`,
      metadata: {
        targetUser: ministryAdmin.email,
        ministryId: ministryAdmin.ministryId,
      },
    });

    return {
      success: true,
      message: "Ministry admin enabled successfully",
    };
  },
);

/**
 * Approve Staff by Ministry Admin
 *
 * Ministry admin approves staff (uploader/approver) joining their ministry.
 * Generates UUID for staff login and tracking.
 * Sets custom claims: { role: 'agency' | 'agency-approver', ministryId: '...' }
 */
export const approveStaffByMinistryAdmin = onCall(
  callableOptions,
  async (
    request,
  ): Promise<{
    success: boolean;
    message: string;
    uuid?: string;
    displayId?: string;
    userEmail?: string;
    userName?: string;
  }> => {
    const { staffUserId } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== "string") {
      throw new HttpsError("invalid-argument", "staffUserId is required");
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, "ministry-admin");
    const callerAuth = requireAuth(request.auth);

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You must own a ministry to approve staff",
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff is pending ministry approval
    if (staffUser.accountStatus !== "pending_ministry_approval") {
      throw new HttpsError(
        "failed-precondition",
        "User is not pending ministry approval",
      );
    }

    if (!staffUser.emailVerified) {
      throw new HttpsError(
        "failed-precondition",
        "User must verify their email before ministry approval",
      );
    }

    if (!staffUser.state) {
      throw new HttpsError(
        "failed-precondition",
        "User must have a state assignment before ministry approval",
      );
    }

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You can only approve users for your own ministry",
      );
    }

    // Verify staff role is agency or agency-approver
    if (staffUser.role !== "agency" && staffUser.role !== "agency-approver") {
      throw new HttpsError(
        "failed-precondition",
        "User must be agency or agency-approver role",
      );
    }

    // Fetch ministry name for display ID generation
    const ministryRef = admin
      .firestore()
      .collection(MINISTRIES_COLLECTION)
      .doc(staffUser.ministryId);
    const ministryDoc = await ministryRef.get();

    if (!ministryDoc.exists) {
      throw new HttpsError("not-found", "Ministry not found");
    }

    const ministryName = ministryDoc.data()!.name as string;

    // Generate short display ID: e.g. "EDU-STF-0001"
    const displayId = await generateStaffDisplayId(
      ministryName,
      staffUser.role,
    );

    // Update ministry document to add staff to appropriate role array
    const ministryData = ministryDoc.data();
    const staffAgencyName = staffUser.staffAgencyName || staffUser.agencyName;
    await assertStateRoleCapacity(
      staffUser.ministryId,
      staffUser.state,
      staffUser.role,
    );

    const uploaders = (ministryData?.uploaders || []) as string[];
    const approvers = (ministryData?.approvers || []) as string[];
    const updateData: any = {};

    if (staffUser.role === "agency") {
      if (!uploaders.includes(staffUserId)) {
        updateData.uploaders =
          admin.firestore.FieldValue.arrayUnion(staffUserId);
        updateData.hasUploader = true;
      }
    } else if (staffUser.role === "agency-approver") {
      if (!approvers.includes(staffUserId)) {
        updateData.approvers =
          admin.firestore.FieldValue.arrayUnion(staffUserId);
        updateData.hasApprover = true;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await ministryRef.update(updateData);
      logger.info("Ministry document updated with new staff", {
        ministryId: staffUser.ministryId,
        staffUserId,
        role: staffUser.role,
      });
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: "verified",
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        staffAgencyName,
        displayId, // short human-readable ID
        uuid: displayId, // keep uuid field in sync for backward compatibility
      });

    // Set custom claims
    await setUserClaims(staffUserId, staffUser.role, staffUser.ministryId, staffUser.state);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: "staff.approve",
      resourceType: "user",
      resourceId: staffUserId,
      details: `Approved staff: ${staffUser.email} (${staffUser.role}) - Display ID: ${displayId}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        displayId,
      },
    });

    logger.info("Staff approved by ministry admin", {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      ministryId: callerUser.ownedMinistryId,
      displayId,
    });

    return {
      success: true,
      message: "Staff member approved successfully",
      displayId,
      uuid: displayId, // keep for backward compat with FE that reads uuid field
      userEmail: staffUser.email,
      userName: staffUser.name || staffUser.agencyName,
    };
  },
);

/**
 * Reject Staff by Ministry Admin
 *
 * Ministry admin rejects staff registration request.
 */
export const rejectStaffByMinistryAdmin = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, reason } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== "string") {
      throw new HttpsError("invalid-argument", "staffUserId is required");
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Rejection reason is required");
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, "ministry-admin");
    const callerAuth = requireAuth(request.auth);

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You must own a ministry to reject staff",
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff is pending ministry approval
    if (staffUser.accountStatus !== "pending_ministry_approval") {
      throw new HttpsError(
        "failed-precondition",
        "User is not pending ministry approval",
      );
    }

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You can only reject users for your own ministry",
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: "rejected",
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason.trim(),
      });

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: "staff.reject",
      resourceType: "user",
      resourceId: staffUserId,
      details: `Rejected staff: ${staffUser.email} - Reason: ${reason}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        rejectionReason: reason,
      },
    });

    logger.info("Staff rejected by ministry admin", {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message: "Staff member rejected successfully",
    };
  },
);

/**
 * Remove Staff from Ministry
 *
 * Ministry admin removes staff from their ministry (when they leave).
 */
export const removeStaffFromMinistry = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, reason } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== "string") {
      throw new HttpsError("invalid-argument", "staffUserId is required");
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, "ministry-admin");
    const callerAuth = requireAuth(request.auth);

    // Cannot remove self
    if (staffUserId === callerAuth.uid) {
      throw new HttpsError("invalid-argument", "You cannot remove yourself");
    }

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You must own a ministry to remove staff",
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You can only remove users from your own ministry",
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: "rejected",
        rejectionReason: reason?.trim() || "Removed from ministry by admin",
        verifiedBy: callerAuth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Remove custom claims (revoke access)
    await admin.auth().setCustomUserClaims(staffUserId, null);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: "staff.remove",
      resourceType: "user",
      resourceId: staffUserId,
      details: `Removed staff from ministry: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        reason: reason,
      },
    });

    logger.info("Staff removed from ministry", {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message: "Staff member removed from ministry successfully",
    };
  },
);

/**
 * Change Staff Role by Ministry Admin
 *
 * Ministry admin changes staff role between 'agency' (uploader) and 'agency-approver' (approver).
 * Updates custom claims with the new role.
 */
export const changeStaffRoleByMinistryAdmin = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, newRole } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== "string") {
      throw new HttpsError("invalid-argument", "staffUserId is required");
    }
    if (!newRole || (newRole !== "agency" && newRole !== "agency-approver")) {
      throw new HttpsError(
        "invalid-argument",
        'newRole must be either "agency" or "agency-approver"',
      );
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, "ministry-admin");
    const callerAuth = requireAuth(request.auth);

    // Cannot change self
    if (staffUserId === callerAuth.uid) {
      throw new HttpsError(
        "invalid-argument",
        "You cannot change your own role",
      );
    }

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You must own a ministry to change staff roles",
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You can only change roles for users in your own ministry",
      );
    }

    // Verify staff is verified (active)
    if (staffUser.accountStatus !== "verified") {
      throw new HttpsError(
        "failed-precondition",
        "Can only change role for verified staff members",
      );
    }

    // Verify staff current role is agency or agency-approver
    if (staffUser.role !== "agency" && staffUser.role !== "agency-approver") {
      throw new HttpsError(
        "failed-precondition",
        "Can only change role for uploaders or approvers",
      );
    }

    if (!staffUser.state) {
      throw new HttpsError(
        "failed-precondition",
        "Staff member must have a state assignment before role changes",
      );
    }

    // Check if role is actually changing
    if (staffUser.role === newRole) {
      throw new HttpsError(
        "invalid-argument",
        `User is already an ${newRole === "agency" ? "uploader" : "approver"}`,
      );
    }

    const oldRole = staffUser.role;

    await assertStateRoleCapacity(
      staffUser.ministryId,
      staffUser.state,
      newRole,
    );

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        role: newRole,
        roleChangedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleChangedBy: callerAuth.uid,
      });

    // Update custom claims with new role
    await setUserClaims(staffUserId, newRole, staffUser.ministryId, staffUser.state);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: "user.role.change",
      resourceType: "user",
      resourceId: staffUserId,
      details: `Changed staff role from ${oldRole} to ${newRole}: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        oldRole: oldRole,
        newRole: newRole,
        ministryId: staffUser.ministryId,
      },
    });

    logger.info("Staff role changed by ministry admin", {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      oldRole,
      newRole,
    });

    return {
      success: true,
      message: `Staff role changed from ${oldRole === "agency" ? "uploader" : "approver"} to ${newRole === "agency" ? "uploader" : "approver"} successfully`,
    };
  },
);

/**
 * Disable Staff by Ministry Admin
 *
 * Ministry admin disables a staff account (when they leave or need to be suspended).
 * This frees up a slot for new staff members.
 * Revokes custom claims to prevent access.
 */
export const disableStaffByMinistryAdmin = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId, reason } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== "string") {
      throw new HttpsError("invalid-argument", "staffUserId is required");
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, "ministry-admin");
    const callerAuth = requireAuth(request.auth);

    // Cannot disable self
    if (staffUserId === callerAuth.uid) {
      throw new HttpsError(
        "invalid-argument",
        "You cannot disable your own account",
      );
    }

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You must own a ministry to disable staff",
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You can only disable users in your own ministry",
      );
    }

    // Verify staff is verified (active) - can only disable active staff
    if (staffUser.accountStatus !== "verified") {
      throw new HttpsError(
        "failed-precondition",
        "Can only disable verified (active) staff members",
      );
    }

    // Verify staff role is agency or agency-approver
    if (staffUser.role !== "agency" && staffUser.role !== "agency-approver") {
      throw new HttpsError(
        "failed-precondition",
        "Can only disable uploaders or approvers",
      );
    }

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: "disabled",
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
        disabledBy: callerAuth.uid,
        disableReason: reason?.trim() || "Disabled by ministry admin",
      });

    // Remove custom claims (revoke access)
    await admin.auth().setCustomUserClaims(staffUserId, null);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: "user.account.disable",
      resourceType: "user",
      resourceId: staffUserId,
      details: `Disabled staff account: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
        reason: reason,
      },
    });

    logger.info("Staff disabled by ministry admin", {
      staffUserId,
      ministryAdminId: callerAuth.uid,
      reason,
    });

    return {
      success: true,
      message:
        "Staff account disabled successfully. A slot is now available for new registrations.",
    };
  },
);

/**
 * Enable Staff by Ministry Admin
 *
 * Ministry admin re-enables a previously disabled staff account.
 * Restores custom claims to allow access.
 */
export const enableStaffByMinistryAdmin = onCall(
  callableOptions,
  async (request): Promise<{ success: boolean; message: string }> => {
    const { staffUserId } = request.data;

    // Validate input
    if (!staffUserId || typeof staffUserId !== "string") {
      throw new HttpsError("invalid-argument", "staffUserId is required");
    }

    // Verify caller is ministry-admin
    requireRole(request.auth, "ministry-admin");
    const callerAuth = requireAuth(request.auth);

    // Get caller's user doc
    const callerUser = await getUserDoc(callerAuth.uid);

    // Verify caller owns a ministry
    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You must own a ministry to enable staff",
      );
    }

    // Get staff user doc
    const staffUser = await getUserDoc(staffUserId);

    // Verify staff belongs to caller's ministry
    if (staffUser.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You can only enable users in your own ministry",
      );
    }

    // Verify staff is disabled
    if (staffUser.accountStatus !== "disabled") {
      throw new HttpsError(
        "failed-precondition",
        "Can only enable disabled staff members",
      );
    }

    // Verify staff role is agency or agency-approver
    if (staffUser.role !== "agency" && staffUser.role !== "agency-approver") {
      throw new HttpsError(
        "failed-precondition",
        "Can only enable uploaders or approvers",
      );
    }

    if (!staffUser.state) {
      throw new HttpsError(
        "failed-precondition",
        "Staff member must have a state assignment before being enabled",
      );
    }

    await assertStateRoleCapacity(
      staffUser.ministryId,
      staffUser.state,
      staffUser.role,
    );

    // Update user document
    await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(staffUserId)
      .update({
        accountStatus: "verified",
        enabledAt: admin.firestore.FieldValue.serverTimestamp(),
        enabledBy: callerAuth.uid,
        disabledAt: admin.firestore.FieldValue.delete(),
        disabledBy: admin.firestore.FieldValue.delete(),
        disableReason: admin.firestore.FieldValue.delete(),
      });

    // Restore custom claims
    await setUserClaims(staffUserId, staffUser.role, staffUser.ministryId, staffUser.state);

    // Log action
    await logAction({
      userId: callerAuth.uid,
      userEmail: callerUser.email,
      userRole: callerUser.role,
      action: "user.account.enable",
      resourceType: "user",
      resourceId: staffUserId,
      details: `Enabled staff account: ${staffUser.email}`,
      metadata: {
        targetUser: staffUser.email,
        targetRole: staffUser.role,
        ministryId: staffUser.ministryId,
      },
    });

    logger.info("Staff enabled by ministry admin", {
      staffUserId,
      ministryAdminId: callerAuth.uid,
    });

    return {
      success: true,
      message: "Staff account enabled successfully",
    };
  },
);

/**
 * Search staff by display ID (ministry admin, own ministry only).
 */
export const searchStaffByDisplayId = onCall(
  callableOptions,
  async (
    request,
  ): Promise<{
    displayId: string;
    name?: string;
    email: string;
    role: string;
    ministry: string;
    status: string;
    approvedAt?: admin.firestore.Timestamp;
  }> => {
    const { displayId } = request.data;

    if (!displayId || typeof displayId !== "string") {
      throw new HttpsError("invalid-argument", "displayId is required");
    }

    requireRole(request.auth, "ministry-admin");
    const callerAuth = requireAuth(request.auth);
    const callerUser = await getUserDoc(callerAuth.uid);

    if (!callerUser.isMinistryOwner || !callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You must own a ministry to search staff",
      );
    }

    const user = await findUserByDisplayId(displayId);

    if (!user) {
      throw new HttpsError(
        "not-found",
        `No staff found with ID: ${displayId.trim().toUpperCase()}`,
      );
    }

    if (user.ministryId !== callerUser.ownedMinistryId) {
      throw new HttpsError(
        "permission-denied",
        "You can only search staff from your own ministry",
      );
    }

    const ministryDoc = await admin
      .firestore()
      .collection(MINISTRIES_COLLECTION)
      .doc(user.ministryId as string)
      .get();

    const ministryName = ministryDoc.exists
      ? (ministryDoc.data()!.name as string)
      : "Unknown Ministry";

    return {
      displayId: user.displayId as string,
      name: user.name as string | undefined,
      email: user.email as string,
      role: user.role as string,
      ministry: ministryName,
      status: (user.accountStatus as string) ?? "unknown",
      approvedAt: user.verifiedAt as admin.firestore.Timestamp | undefined,
    };
  },
);

/**
 * Backfill Display IDs (run once)
 *
 * Generates display IDs for verified uploaders/approvers who lack one.
 * Callable only by federal admin (`role: 'admin'` in custom claims).
 */
export const runBackfillDisplayIds = onCall(
  callableOptions,
  async (
    request,
  ): Promise<{ migrated: number; skipped: number; errors: string[] }> => {
    requireRole(request.auth, "admin");

    logger.info("Starting display ID backfill...");

    const result = await backfillDisplayIds();

    logger.info("Display ID backfill complete", result);

    return result;
  },
);
