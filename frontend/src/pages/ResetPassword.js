import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../api';
import './Login.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract token from URL
  const [token, setToken] = useState('');
  const [tokenSource, setTokenSource] = useState('');
  
  useEffect(() => {
    console.log("Location object:", location);
    console.log("Hash:", location.hash);
    console.log("Search:", location.search);
    
    let foundToken = null;
    let source = '';
    
    // Try multiple approaches to find the token
    
    if (location.hash && location.hash.includes('access_token=')) {
      try {
        const hashParams = new URLSearchParams(location.hash.substring(1));
        foundToken = hashParams.get('access_token');
        if (foundToken) {
          source = 'hash-access_token';
          console.log("Found token in hash (access_token)");
        }
      } catch (err) {
        console.error("Error parsing hash params:", err);
      }
    }
    
    if (!foundToken && location.hash && location.hash.includes('token=')) {
      try {
        const hashParams = new URLSearchParams(location.hash.substring(1));
        foundToken = hashParams.get('token');
        if (foundToken) {
          source = 'hash-token';
          console.log("Found token in hash (token)");
        }
      } catch (err) {
        console.error("Error parsing hash params:", err);
      }
    }
    
    if (!foundToken && location.search && location.search.includes('access_token=')) {
      try {
        const searchParams = new URLSearchParams(location.search);
        foundToken = searchParams.get('access_token');
        if (foundToken) {
          source = 'search-access_token';
          console.log("Found token in search params (access_token)");
        }
      } catch (err) {
        console.error("Error parsing search params:", err);
      }
    }
    
    if (!foundToken && location.search && location.search.includes('token=')) {
      try {
        const searchParams = new URLSearchParams(location.search);
        foundToken = searchParams.get('token');
        if (foundToken) {
          source = 'search-token';
          console.log("Found token in search params (token)");
        }
      } catch (err) {
        console.error("Error parsing search params:", err);
      }
    }
    
    if (!foundToken && (location.search.includes('type=recovery') || location.hash.includes('type=recovery'))) {
      try {
        if (location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          foundToken = hashParams.get('access_token') || hashParams.get('token') || hashParams.get('refresh_token');
          if (foundToken) {
            source = 'hash-recovery-flow';
            console.log("Found token in hash (recovery flow)");
          }
        }
        
        if (!foundToken && location.search) {
          const searchParams = new URLSearchParams(location.search);
          foundToken = searchParams.get('access_token') || searchParams.get('token') || searchParams.get('refresh_token');
          if (foundToken) {
            source = 'search-recovery-flow';
            console.log("Found token in search params (recovery flow)");
          }
        }
      } catch (err) {
        console.error("Error parsing recovery flow params:", err);
      }
    }
    
    if (foundToken) {
      setToken(foundToken);
      setTokenSource(source);
      console.log(`Successfully extracted token from ${source}`);
      console.log("Token preview:", foundToken.substring(0, 5) + '...');
    } else {
      console.error("No token found in URL");
      setError('Invalid or missing reset token. Please try the password reset process again.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    console.log(`Submitting password reset with token from ${tokenSource}`);
    console.log("Token length:", token.length);
    console.log("Token preview:", token.substring(0, 5) + '...');

    try {
      const response = await resetPassword(token, password);
      console.log("Password reset response:", response);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-container">
          <img src="/logo-nobg.png" alt="Anomaly Dashboard" className="logo-img" />
        </div>
        <h2 className="login-title">Set New Password</h2>
        
        {isSuccess ? (
          <div className="success-message">
            <p>Your password has been reset successfully!</p>
            <p>Redirecting to login page...</p>
          </div>
        ) : (
          <>
            {!token ? (
              <div className="login-error">
                {error || 'Invalid reset link. Please request a new password reset.'}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label className="login-label" htmlFor="password">
                    New Password
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="login-input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="login-label" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="login-input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                {error && <div className="login-error">{error}</div>}
                
                <button 
                  type="submit" 
                  className="login-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword; 