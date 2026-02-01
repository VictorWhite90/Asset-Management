import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { User } from '@/types/user.types';
import { COLLECTIONS } from '@/utils/constants';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Sync email verification status from Firebase Auth to Firestore
  // This ensures that if user verified email but hasn't visited VerifyEmailPage,
  // their Firestore document is still updated correctly
  const syncEmailVerification = async (user: FirebaseUser, data: User): Promise<User> => {
    // If email is verified in Firebase Auth but Firestore shows pending_verification
    // and user is agency staff, update to pending_ministry_approval
    if (
      user.emailVerified &&
      !data.emailVerified &&
      data.accountStatus === 'pending_verification' &&
      (data.role === 'agency' || data.role === 'agency-approver')
    ) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, user.uid);
        await updateDoc(userRef, {
          emailVerified: true,
          accountStatus: 'pending_ministry_approval',
        });
        // Return updated data
        return {
          ...data,
          emailVerified: true,
          accountStatus: 'pending_ministry_approval',
        };
      } catch (error) {
        console.error('Error syncing email verification:', error);
        // Return original data if update fails
        return data;
      }
    }
    // For ministry-admin, just sync emailVerified flag (they stay pending_verification until federal admin approves)
    else if (user.emailVerified && !data.emailVerified && data.role === 'ministry-admin') {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, user.uid);
        await updateDoc(userRef, {
          emailVerified: true,
        });
        return {
          ...data,
          emailVerified: true,
        };
      } catch (error) {
        console.error('Error syncing email verification:', error);
        return data;
      }
    }
    return data;
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Force token refresh to get updated custom claims
        // This ensures that if a user's role or ministry was updated,
        // they get the latest claims without having to log out/in
        try {
          await user.getIdToken(true);
        } catch (error) {
          console.warn('Failed to refresh token:', error);
        }

        // Fetch additional user data from Firestore
        let data = await fetchUserData(user.uid);

        // Sync email verification if needed
        if (data) {
          data = await syncEmailVerification(user, data);
        }

        setUserData(data);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
