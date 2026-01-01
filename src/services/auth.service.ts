import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserRegistrationData, User } from '@/types/user.types';
import { COLLECTIONS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/utils/constants';

/**
 * Register a new agency user
 */
export const registerAgency = async (
  registrationData: UserRegistrationData
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
      displayName: registrationData.agencyName,
    });

    // Create user document in Firestore
    const userData: User = {
      userId: user.uid,
      email: registrationData.email,
      agencyName: registrationData.agencyName,
      role: 'agency',
      region: registrationData.region,
      ministryType: registrationData.ministryType,
      createdAt: Timestamp.now(),
      emailVerified: false,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), userData);

    // Send email verification
    await sendEmailVerification(user);

    return { user, userData };
  } catch (error: any) {
    console.error('Registration error:', error);
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
    await sendEmailVerification(user);
  } catch (error: any) {
    console.error('Email verification error:', error);
    throw new Error(getAuthErrorMessage(error.code));
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
    case 'auth/too-many-requests':
      return ERROR_MESSAGES.AUTH.TOO_MANY_REQUESTS;
    case 'auth/network-request-failed':
      return ERROR_MESSAGES.AUTH.NETWORK_ERROR;
    default:
      return 'An error occurred. Please try again.';
  }
};
