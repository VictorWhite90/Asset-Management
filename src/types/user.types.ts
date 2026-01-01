import { Timestamp } from 'firebase/firestore';

export type UserRole = 'agency' | 'admin';

export interface User {
  userId: string;
  email: string;
  agencyName: string;
  role: UserRole;
  region: string; // Nigerian state
  ministryType?: string; // e.g., "Ministry of Finance", "Federal Agency"
  createdAt: Timestamp;
  emailVerified: boolean;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  agencyName: string;
  region: string;
  ministryType?: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}
