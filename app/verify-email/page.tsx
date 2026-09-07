'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar/Navbar';
import styles from './verifyEmail.module.css';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('oobCode') || searchParams.get('token');
  const mode = searchParams.get('mode');
  const { verifyEmailToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (mode === 'resetPassword' && token) {
      window.location.href = `/reset-password?oobCode=${encodeURIComponent(token)}`;
      return;
    }

    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage('Invalid or missing verification token.');
      return;
    }

    verifyEmailToken(token).then((res: { success: boolean; message?: string }) => {
      setLoading(false);
      setSuccess(res.success);
      setMessage(res.message || (res.success ? 'Account successfully verified!' : 'Verification failed'));
    });
  }, [token, mode, verifyEmailToken]);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Verifying Account...</h1>
        <p className={styles.message}>Please wait while we verify your email address.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.iconCircle} ${!success ? styles.errorIconCircle : ''}`}>
        {success ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>

      <h1 className={styles.title}>{success ? 'Account Activated!' : 'Verification Error'}</h1>
      <p className={styles.message}>{message}</p>

      <Link href={success ? '/login' : '/signup'} className={styles.actionBtn}>
        {success ? 'Log In to Your Account' : 'Back to Sign Up'}
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.ambientGlow} />
      <Suspense fallback={<div className={styles.container}><h1 className={styles.title}>Loading...</h1></div>}>
        <VerifyContent />
      </Suspense>
    </main>
  );
}
