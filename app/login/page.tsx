'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import PosterBackground from '../../components/Auth/PosterBackground';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [isForgotView, setIsForgotView] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const { login, googleLogin, sendPasswordReset } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check query string parameters
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const verifiedParam = params.get('verified');
    const resetParam = params.get('reset');
    const modeParam = params.get('mode');
    const oobCodeParam = params.get('oobCode') || params.get('token');

    if (modeParam === 'resetPassword' && oobCodeParam) {
      router.push(`/reset-password?oobCode=${encodeURIComponent(oobCodeParam)}`);
      return;
    }

    if (emailParam) {
      setEmail(emailParam);
      setTimeout(() => document.getElementById('password')?.focus(), 150);
    }

    if (verifiedParam === 'true' || verifiedParam === '1') {
      setVerifiedSuccess(true);
    }

    if (resetParam === 'success') {
      setVerifiedSuccess(true);
    }

    const handleResetDetected = (userEmail?: string) => {
      setIsForgotView(false);
      setResetSuccessMsg('');
      setError('');
      setPasswordError(false);
      setVerifiedSuccess(true);
      if (userEmail) {
        setEmail(userEmail);
      }
      setTimeout(() => {
        document.getElementById('password')?.focus();
      }, 200);
    };

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('streamflix_auth');
      channel.onmessage = (event) => {
        if (event.data?.type === 'PASSWORD_RESET_SUCCESS') {
          handleResetDetected(event.data.email);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth_password_reset' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleResetDetected(parsed.email);
        } catch (err) {
          handleResetDetected();
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError(false);
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      router.push('/');
    } else {
      if (result.code === 'USER_NOT_FOUND') {
        router.push(`/signup?email=${encodeURIComponent(email)}&from=login`);
      } else if (result.code === 'WRONG_PASSWORD') {
        setPasswordError(true);
      } else {
        setError(result.message || 'An error occurred during sign in.');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const res = await googleLogin();
    if (res.success) {
      router.push('/');
    } else {
      setError(res.message || 'Google sign-in failed.');
    }
    setLoading(false);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);

    const res = await sendPasswordReset(email);
    if (res.success) {
      setResetSuccessMsg(`Password reset link sent to ${email}. Please check your inbox (and spam folder).`);
    } else {
      setError(res.message || 'Failed to send password reset email.');
    }
    setLoading(false);
  };

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
          {isForgotView ? (
            <div>
              <div className={styles.header}>
                <h1 className={styles.title}>Reset Password</h1>
                <p className={styles.subtitle}>
                  We'll email you instructions and a link to reset your password.
                </p>
              </div>

              {resetSuccessMsg ? (
                <div>
                  <div className={styles.successAlert}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>{resetSuccessMsg}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotView(false);
                      setResetSuccessMsg('');
                    }}
                    className={styles.submitBtn}
                    style={{ width: '100%', marginTop: '1.25rem' }}
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className={styles.form}>
                  {error && <div className={styles.errorAlert}>{error}</div>}

                  <div className={styles.inputGroup}>
                    <div className={styles.inputLabel}>
                      <label htmlFor="reset-email">Email Address</label>
                    </div>
                    <div className={styles.inputWrapper}>
                      <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <input
                        id="reset-email"
                        className={styles.inputField}
                        type="email"
                        placeholder="name@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? <span className={styles.spinner} /> : 'Send Reset Link'}
                  </button>

                  <div className={styles.cardFooter}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotView(false);
                        setError('');
                      }}
                      className={styles.link}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div className={styles.segmentedTabs}>
                <span className={`${styles.tabBtn} ${styles.activeTab}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Sign In
                </span>
                <Link href={email ? `/signup?email=${encodeURIComponent(email)}` : '/signup'} className={styles.tabBtn}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Sign Up
                </Link>
              </div>

              <div className={styles.header}>
                <h1 className={styles.title}>Welcome Back</h1>
                <p className={styles.subtitle}>Enter your details or use Google to sign in</p>
              </div>
              
              {verifiedSuccess && (
                <div className={styles.successAlert}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Email verified / password updated! Enter your password to sign in.</span>
                </div>
              )}

              {error && <div className={styles.errorAlert}>{error}</div>}

              {/* 1-Click Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginBottom: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
                <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600 }}>OR WITH EMAIL</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotView(true);
                        setError('');
                        setPasswordError(false);
                      }}
                      className={styles.link}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.8rem',
                        color: '#ff2e3a'
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className={`${styles.inputWrapper} ${passwordError ? styles.inputWrapperError : ''}`}>
                    <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      id="password"
                      className={`${styles.inputField} ${passwordError ? styles.inputFieldError : ''}`}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(false);
                      }}
                      required
                    />
                  </div>
                  {passwordError && (
                    <div className={styles.fieldError}>
                      <span>⚠️ Password incorrect</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotView(true);
                          setError('');
                          setPasswordError(false);
                        }}
                        className={styles.fieldErrorResetLink}
                      >
                        Reset Password
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? (
                    <span className={styles.spinner}></span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
              
              <div className={styles.cardFooter}>
                Don't have an account? <Link href="/signup" className={styles.link}>Sign up</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
