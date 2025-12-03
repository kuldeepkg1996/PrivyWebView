import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import '../styles/EmailLinkModal.css';

interface EmailLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function EmailLinkModal({ isOpen, onClose, onSuccess }: EmailLinkModalProps) {
  const { getAccessToken } = usePrivy();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const accessToken = await getAccessToken();
      
      console.log('Sending code to:', email);
      console.log('Access token:', accessToken ? 'Present' : 'Missing');
      
      const response = await fetch('https://auth.privy.io/api/v1/passwordless/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'privy-app-id': import.meta.env.VITE_PRIVY_APP_ID || '',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
        }),
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData?.message || 'Failed to send verification code');
      }

      setLoading(false);
      setStep('code');
      setSuccess('Verification code sent to your email!');
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err?.message || 'Failed to send code');
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      setError('Please enter the verification code');
      return;
    }

    if (code.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const accessToken = await getAccessToken();
      
      console.log('Verifying code:', code);
      
      const response = await fetch('https://auth.privy.io/api/v1/linked_accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'privy-app-id': import.meta.env.VITE_PRIVY_APP_ID || '',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      console.log('Verify response status:', response.status);
      const responseData = await response.json();
      console.log('Verify response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData?.message || 'Invalid verification code');
      }

      setLoading(false);
      setSuccess('Email linked successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
        resetModal();
      }, 1500);
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err?.message || 'Invalid verification code');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const accessToken = await getAccessToken();
      
      console.log('Resending code to:', email);
      
      const response = await fetch('https://auth.privy.io/api/v1/passwordless/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'privy-app-id': import.meta.env.VITE_PRIVY_APP_ID || '',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
        }),
      });

      console.log('Resend response status:', response.status);
      const responseData = await response.json();
      console.log('Resend response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData?.message || 'Failed to resend code');
      }

      setLoading(false);
      setSuccess('New code sent to your email!');
      setCode('');
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err?.message || 'Failed to resend code');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
    setError('');
    setSuccess('');
  };

  const resetModal = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !loading) {
      action();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="email-modal-overlay" onClick={handleOverlayClick}>
      <div className={`email-modal-card ${loading ? 'loading' : ''}`}>
        <button className="modal-close-button" onClick={handleClose} disabled={loading}>
          ✕
        </button>

        <div className="email-modal-header">
          {step === 'code' && (
            <button className="back-button" onClick={handleBack} disabled={loading}>
              ← Back
            </button>
          )}
          <h2 className="email-modal-title">
            {step === 'email' ? '📧 Link Email' : '🔐 Verify Code'}
          </h2>
          <p className="email-modal-subtitle">
            {step === 'email'
              ? 'Link your email address to your account'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {step === 'email' && (
          <div className="email-step">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="email-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, handleSendCode)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              className="btn btn-primary"
              onClick={handleSendCode}
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  <span>Sending...</span>
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="code-step">
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="code-input"
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                onKeyDown={(e) => handleKeyPress(e, handleVerifyCode)}
                disabled={loading}
                maxLength={6}
                autoFocus
              />
              <p className="input-hint">Enter the 6-digit code from your email</p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              className="btn btn-primary"
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  <span>Verifying...</span>
                </>
              ) : (
                'Verify & Link Email'
              )}
            </button>

            <div className="resend-section">
              <p className="resend-text">Didn't receive the code?</p>
              <button
                className="btn-link"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailLinkModal;
