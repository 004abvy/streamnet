'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import PosterBackground from '../../components/Auth/PosterBackground';
import styles from '../login/login.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || searchParams.get('token');
  const { login, verifyResetCode, confirmNewPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid or missing password reset code.');
      setLoading(false);
      return;
    }

    verifyResetCode(oobCode).then((res) => {
      setLoading(false);
      if (res.success && res.email) {
        setEmail(res.email);
      } else {
        setError(res.message || 'Invalid or expired password reset link.');
      }
    });
  }, [oobCode, verifyResetCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSubmitting(true);

    const res = await confirmNewPassword(oobCode!, newPassword);
    if (res.success) {
      setSuccess(true);

      // Broadcast password reset success so any open Login tabs automatically update
      try {
        localStorage.setItem('auth_password_reset', JSON.stringify({ email, timestamp: Date.now() }));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('streamflix_auth');
          channel.postMessage({ type: 'PASSWORD_RESET_SUCCESS', email });
          channel.close();
        }
      } catch (e) {
        // Silent catch
      }

      // Automatically sign in with the newly saved password!
      const loginRes = await login(email, newPassword);
      
      setTimeout(() => {
        if (loginRes.success) {
          router.push('/');
        } else {
          router.push(`/login?email=${encodeURIComponent(email)}&reset=success`);
        }
      }, 1200);
    } else {
      setError(res.message || 'Failed to reset password.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className={styles.authCard} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <span className={styles.spinner} style={{ margin: '0 auto 1.5rem', width: '32px', height: '32px' }} />
        <h1 className={styles.title} style={{ fontSize: '1.4rem' }}>Verifying Link...</h1>
        <p className={styles.subtitle}>Please wait a moment.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.authCard}>
        <div className={styles.successAlert} style={{ marginBottom: '1.5rem' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Password reset successful! Redirecting you to Sign In...</span>
        </div>

        <Link
          href={`/login?email=${encodeURIComponent(email)}&reset=success`}
          className={styles.submitBtn}
          style={{ textDecoration: 'none', width: '100%' }}
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.authCard}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Password</h1>
        <p className={styles.subtitle}>
          {email ? (
            <>Create a new password for <strong style={{ color: '#fff' }}>{email}</strong></>
          ) : (
            'Enter your new password below'
          )}
        </p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {!error ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <div className={styles.inputLabel}>
              <label htmlFor="new-password">New Password</label>
            </div>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="new-password"
                className={styles.inputField}
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputLabel}>
              <label htmlFor="confirm-password">Confirm New Password</label>
            </div>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="confirm-password"
                className={styles.inputField}
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? <span className={styles.spinner} /> : 'Save New Password'}
          </button>
        </form>
      ) : (
        <div className={styles.cardFooter}>
          <Link href="/login" className={styles.link}>
            ← Return to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className={styles.page}>
      <PosterBackground />

      <header className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIconWrapper}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 3h18v4H3V3z" />
              <path d="M4 7l2 14h12l2-14" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          </div>
          <span className={styles.logoText}>StreamFlix</span>
        </Link>

        <Link href="/login" className={styles.backHomeBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Sign In
        </Link>
      </header>

      <div className={styles.authContainer}>
        <Suspense fallback={<div className={styles.authCard}><h1 className={styles.title}>Loading...</h1></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
