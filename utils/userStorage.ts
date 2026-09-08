import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export function getUserDocKey(email?: string | null, uid?: string): string | null {
  if (email && email.trim()) {
    return email.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  }
  if (uid) return uid;
  return null;
}

export async function saveWatchlist(items: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('saved_items', JSON.stringify(items));
    localStorage.setItem('user_bookmarks', JSON.stringify(items.map((i: any) => i?.id).filter(Boolean)));
    window.dispatchEvent(new Event('storage'));

    const currentUser = auth.currentUser;
    const docKey = getUserDocKey(currentUser?.email, currentUser?.uid);
    if (docKey) {
      const userDocRef = doc(db, 'users', docKey);
      await setDoc(userDocRef, {
        saved_items: items,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (e) {
    console.warn("saveWatchlist error:", e);
  }
}

export async function saveContinueWatching(items: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('continueWatching', JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));

    const currentUser = auth.currentUser;
    const docKey = getUserDocKey(currentUser?.email, currentUser?.uid);
    if (docKey) {
      const userDocRef = doc(db, 'users', docKey);
      await setDoc(userDocRef, {
        continueWatching: items,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (e) {
    console.warn("saveContinueWatching error:", e);
  }
}
