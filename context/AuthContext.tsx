'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  applyActionCode,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  fetchSignInMethodsForEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../utils/firebase';

export interface User {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  saved_items?: any[];
  continueWatching?: any[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; code?: string; message?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  syncUserData: (saved_items?: any[], continueWatching?: any[]) => Promise<void>;
  verifyEmailToken: (actionCode: string) => Promise<{ success: boolean; message?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmNewPassword: (oobCode: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  verifyResetCode: (oobCode: string) => Promise<{ success: boolean; email?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Hydrate from localStorage
        const saved = JSON.parse(localStorage.getItem('saved_items') || '[]');
        const continueWatching = JSON.parse(localStorage.getItem('continueWatching') || '[]');
        
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          isVerified: firebaseUser.emailVerified,
          saved_items: saved,
          continueWatching: continueWatching
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update profile with name
      await updateProfile(firebaseUser, { displayName: name });
      
      // Send verification email
      await sendEmailVerification(firebaseUser);
      
      return { success: true, message: 'Verification email sent. Please check your inbox.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Signup failed' };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        return { success: false, message: 'Please verify your email before logging in. Check your inbox and spam folder for the link.' };
      }
      
      return { success: true };
    } catch (err: any) {
      const code = err.code || '';
      const msg = err.message || '';
      
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return { success: false, code: 'WRONG_PASSWORD', message: 'Password incorrect. Please try again or reset your password.' };
      }
      if (code === 'auth/user-not-found') {
        return { success: false, code: 'USER_NOT_FOUND', message: 'No account found with this email.' };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, message: 'Too many unsuccessful login attempts. Please try again later or reset your password.' };
      }
      return { success: false, message: msg || 'Login failed' };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const syncUserData = async (saved_items?: any[], continueWatching?: any[]) => {
    if (saved_items) localStorage.setItem('saved_items', JSON.stringify(saved_items));
    if (continueWatching) localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
  };

  const verifyEmailToken = async (actionCode: string) => {
    try {
      await applyActionCode(auth, actionCode);
      return { success: true, message: 'Your email has been successfully verified! You can now log in.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid or expired verification link.' };
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Password reset link sent! Please check your inbox and spam folder.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send password reset email.' };
    }
  };

  const verifyResetCode = async (oobCode: string) => {
    try {
      const email = await verifyPasswordResetCode(auth, oobCode);
      return { success: true, email };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid or expired password reset link.' };
    }
  };

  const confirmNewPassword = async (oobCode: string, newPassword: string) => {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      return { success: true, message: 'Password has been reset successfully! You can now log in with your new password.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to reset password.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        syncUserData,
        verifyEmailToken,
        sendPasswordReset,
        confirmNewPassword,
        verifyResetCode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
