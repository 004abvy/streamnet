'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../utils/firebase';
import { sendEmailVerification } from 'firebase/auth';
import PosterBackground from '../../components/Auth/PosterBackground';
import styles from './signup.module.css';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromLogin, setFromLogin] = useState(false);
  
  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  const { signup } = useAuth();
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Read URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const fromParam = params.get('from');

    if (emailParam) {
      setEmail(emailParam);
    }
    if (fromParam === 'login') {
      setFromLogin(true);
    }
  }, []);

  // Cooldown countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Transition to sign-in once verified
  const handleVerificationSuccess = useCallback(async () => {
    setIsVerified(true);
    setTimeout(async () => {
      if (auth.currentUser) {
        await auth.signOut();
      }
      router.push(`/login?email=${encodeURIComponent(email)}&verified=true`);
    }, 1200);
  }, [email, router]);

  // Quiet background verification check
  useEffect(() => {
    if (isVerifying && !isVerified) {
      timerRef.current = setInterval(async () => {
        try {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
              if (timerRef.current) clearInterval(timerRef.current);
              handleVerificationSuccess();
            }
          }
        } catch (e) {
          // Silent catch
        }
      }, 2500);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isVerifying, isVerified, handleVerificationSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signup(name, email, password);
    if (result.success) {
      setIsVerifying(true);
      setResendCooldown(30);
    } else {
      setError(result.message || 'An error occurred during signup');
    }
    setLoading(false);
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setResendMessage('');
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setResendMessage('Verification email resent! Please check your spam folder too.');
        setResendCooldown(30);
      } else {
        setResendMessage('Please refresh the page to request a new link.');
      }
    } catch (err: any) {
      setResendMessage(err.message || 'Failed to resend verification email.');
    }
    setTimeout(() => setResendMessage(''), 5000);
  };

  if (isVerifying) {
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

          <Link href="/" className={styles.backHomeBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Browse
          </Link>
        </header>

        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <div className={`${styles.mailIconWrapper} ${isVerified ? styles.verifiedIconWrapper : ''}`}>
              {isVerified ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              )}
            </div>

            <div className={styles.header}>
              <h1 className={styles.title}>
                {isVerified ? 'Email Verified!' : 'Check Your Inbox'}
              </h1>

              <p className={styles.subtitle}>
                {isVerified ? (
                  'Taking you to sign in...'
                ) : (
                  <>
                    We sent a confirmation link to <strong style={{ color: '#fff' }}>{email}</strong>
                  </>
                )}
              </p>
            </div>

            {!isVerified && (
              <>
                <div className={styles.spamTip}>
                  <strong>Can't find the email?</strong>
                  Please check your <strong>Spam or Junk folder</strong>. Verification links can sometimes land there.
                </div>

                <div className={styles.actionsContainer}>
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    className={styles.resendBtn}
                    disabled={resendCooldown > 0}
                  >
                    {resendCooldown > 0
                      ? `Resend Email (${resendCooldown}s)`
                      : 'Resend Verification Email'}
                  </button>
                </div>

                {resendMessage && (
                  <div className={styles.resendToast}>{resendMessage}</div>
                )}

                <div className={styles.cardFooter}>
                  Wrong email?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifying(false);
                      setIsVerified(false);
                    }}
                    className={styles.link}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Change email
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

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

        <Link href="/" className={styles.backHomeBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Browse
        </Link>
      </header>
      
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          {/* Segmented Navigation Menu */}
          <div className={styles.segmentedTabs}>
            <Link href={email ? `/login?email=${encodeURIComponent(email)}` : '/login'} className={styles.tabBtn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign In
            </Link>
            <span className={`${styles.tabBtn} ${styles.activeTab}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Sign Up
            </span>
          </div>

          <div className={styles.header}>
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>Join StreamFlix to start watching now</p>
          </div>
          
          {fromLogin && (
            <div className={styles.infoAlert}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>No account was found with that email. Let's create one for you!</span>
            </div>
          )}

          {error && <div className={styles.errorAlert}>{error}</div>}
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <div className={styles.inputLabel}>
                <label htmlFor="name">Username</label>
              </div>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="name"
                  className={styles.inputField}
                  type="text"
                  placeholder="Username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <div className={styles.inputLabel}>
                <label htmlFor="email">Email Address</label>
              </div>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  id="email"
                  className={styles.inputField}
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputLabel}>
                <label htmlFor="password">Password</label>
              </div>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  className={styles.inputField}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <span className={styles.spinner}></span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          <div className={styles.cardFooter}>
            Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
