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
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { getUserDocKey } from '../utils/userStorage';

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
  googleLogin: () => Promise<{ success: boolean; message?: string }>;
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
    let firestoreUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      if (firebaseUser) {
        // 1. Instantly set user state from auth & local storage
        const localSaved = JSON.parse(localStorage.getItem('saved_items') || '[]');
        const localContinue = JSON.parse(localStorage.getItem('continueWatching') || '[]');

        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          isVerified: firebaseUser.emailVerified,
          saved_items: localSaved,
          continueWatching: localContinue
        });
        setLoading(false);

        // 2. Perform background cloud synchronization using the Firebase user ID.
        (async () => {
          try {
            const docKey = getUserDocKey(firebaseUser.email, firebaseUser.uid);
            if (!docKey) return;

            const userDocRef = doc(db, 'users', docKey);
            const snapshot = await getDoc(userDocRef);

            if (snapshot.exists()) {
              const data = snapshot.data();
              const cloudSaved = data.saved_items || [];
              const cloudContinue = data.continueWatching || [];

              // Merge local and cloud saved items
              const mergedSavedMap = new Map<number, any>();
              cloudSaved.forEach((item: any) => item?.id && mergedSavedMap.set(item.id, item));
              localSaved.forEach((item: any) => item?.id && mergedSavedMap.set(item.id, item));
              const mergedSaved = Array.from(mergedSavedMap.values());

              // Merge local and cloud continueWatching
              const mergedContinueMap = new Map<number, any>();
              cloudContinue.forEach((item: any) => item?.id && mergedContinueMap.set(item.id, item));
              localContinue.forEach((item: any) => item?.id && mergedContinueMap.set(item.id, item));
              const mergedContinue = Array.from(mergedContinueMap.values());

              localStorage.setItem('saved_items', JSON.stringify(mergedSaved));
              localStorage.setItem('user_bookmarks', JSON.stringify(mergedSaved.map((item: any) => item.id)));
              localStorage.setItem('continueWatching', JSON.stringify(mergedContinue));
              if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));

              await setDoc(userDocRef, {
                email: firebaseUser.email,
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                saved_items: mergedSaved,
                continueWatching: mergedContinue,
                updatedAt: new Date().toISOString()
              }, { merge: true });

              setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                email: firebaseUser.email || '',
                isVerified: firebaseUser.emailVerified,
                saved_items: mergedSaved,
                continueWatching: mergedContinue
              });
            } else {
              await setDoc(userDocRef, {
                email: firebaseUser.email,
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                saved_items: localSaved,
                continueWatching: localContinue,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }

            // Real-time listener for multi-device sync across all logins with same email
            firestoreUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
              if (docSnap.exists()) {
                const freshData = docSnap.data();
                const freshSaved = freshData.saved_items || [];
                const freshContinue = freshData.continueWatching || [];

                localStorage.setItem('saved_items', JSON.stringify(freshSaved));
                localStorage.setItem('user_bookmarks', JSON.stringify(freshSaved.map((item: any) => item.id)));
                localStorage.setItem('continueWatching', JSON.stringify(freshContinue));
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));

                setUser((prev) => prev ? {
                  ...prev,
                  saved_items: freshSaved,
                  continueWatching: freshContinue
                } : null);
              }
            }, (err) => {
              if (err?.code !== 'unavailable' && !err?.message?.includes('offline')) {
                console.warn("Firestore listener notice:", err);
              }
            });

          } catch (e: any) {
            if (e?.code !== 'unavailable' && !e?.message?.includes('offline')) {
              console.warn("Firestore sync background notice:", e);
            }
          }
        })();

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (firestoreUnsubscribe) firestoreUnsubscribe();
    };
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      await updateProfile(firebaseUser, { displayName: name });
      try {
        await sendEmailVerification(firebaseUser);
      } catch (e) {
        console.warn("Could not send verification email:", e);
      }
      
      return { success: true, message: 'Account created successfully! Verification email sent.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Signup failed' };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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

  const googleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (err: any) {
      const code = err.code || '';
      let message = err.message || 'Google sign-in failed.';
      if (code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized in Firebase Console. Please add your Vercel domain under Firebase Console -> Authentication -> Settings -> Authorized Domains.';
      } else if (code === 'auth/operation-not-allowed') {
        message = 'Google Sign-In is disabled in Firebase Console. Please enable "Google" under Firebase Console -> Authentication -> Sign-in method.';
      }
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('saved_items');
        localStorage.removeItem('user_bookmarks');
        localStorage.removeItem('continueWatching');
        window.dispatchEvent(new Event('storage'));
      }
      await signOut(auth);
      setUser(null);
    } catch (e) {
      console.warn("Logout error:", e);
    }
  };

  const syncUserData = async (saved_items?: any[], continueWatching?: any[]) => {
    if (saved_items) {
      localStorage.setItem('saved_items', JSON.stringify(saved_items));
      localStorage.setItem('user_bookmarks', JSON.stringify(saved_items.map((item: any) => item.id)));
    }
    if (continueWatching) {
      localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
    }

    if (auth.currentUser) {
      try {
        const docKey = getUserDocKey(auth.currentUser.email, auth.currentUser.uid);
        if (!docKey) return;

        const userDocRef = doc(db, 'users', docKey);
        const payload: Record<string, any> = { updatedAt: new Date().toISOString() };
        if (saved_items !== undefined) payload.saved_items = saved_items;
        if (continueWatching !== undefined) payload.continueWatching = continueWatching;

        await setDoc(userDocRef, payload, { merge: true });
      } catch (e) {
        console.warn("Failed to sync user data to Firestore:", e);
      }
    }
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
        googleLogin,
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
