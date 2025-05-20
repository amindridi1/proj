import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setSubmittedEmail(email);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setError(null);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-container">
          <img src="/logo-nobg.png" alt="Anomaly Dashboard" className="logo-img" />
        </div>
        <h2 className="login-title">Reset Password</h2>
        
        {isSubmitted ? (
          <div className="success-message">
            <p>Password reset instructions have been sent to:</p>
            <p className="submitted-email">{submittedEmail}</p>
            <p>Please check your inbox and spam folder for an email from Supabase. Follow the link in the email to reset your password.</p>
            <div className="action-links">
              <button onClick={handleTryAgain} className="secondary-button">
                Try a different email
              </button>
              <Link to="/login" className="back-to-login">Back to Login</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="reset-instructions">
              Enter your email address below, and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="login-label" htmlFor="email">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="login-input"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              
              {error && <div className="login-error">{error}</div>}
              
              <button 
                type="submit" 
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              
              <div className="back-link">
                <Link to="/login">Back to Login</Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword; 