// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../api';
import './Sidebar.css';

const Sidebar = ({ user, setUser, isMobileOpen, toggleMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDevicesOpen, setIsDevicesOpen] = useState(location.pathname.startsWith('/devices'));

  useEffect(() => {
    setIsDevicesOpen(location.pathname.startsWith('/devices'));
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      localStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const toggleDevicesMenu = () => setIsDevicesOpen(!isDevicesOpen);
  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.username) return 'U';
    return user.username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Get background color for avatar based on username and role
  const getAvatarColor = () => {
    if (!user) return '#4B5563';
    
    // Use green for admin users
    if (user.role === 'admin') {
      return '#059669'; // Slightly darker green for better contrast
    }
    
    // Use blue for regular users
    return '#2563EB'; // Slightly darker blue for better contrast
  };

  return (
    <>
      <div className={`sidebar-container ${isMobileOpen ? 'open' : ''}`}>
        <div className="logo">
          <img src="/logo-nobg.png" alt="Anomaly Dashboard" className="sidebar-logo" />
          <span>dashboard</span>
        </div>
        
        {user ? (
          <>
            <ul className="menu-list">
              <li className="menu-item">
                <Link to="/" 
                  className={`menu-link ${isActive('/') ? 'active' : ''}`}
                  onClick={() => isMobileOpen && toggleMobile()}>
                  <span className="menu-icon">📊</span>
                  Home
                </Link>
              </li>
              
              <li className="menu-item">
                <button onClick={toggleDevicesMenu} className={`menu-button ${isActive('/devices') ? 'active' : ''}`}>
                  <span className="menu-icon">💻</span>
                  <span>Devices</span>
                  <span className={`icon-wrapper ${isDevicesOpen ? 'open' : ''}`}>▼</span>
                </button>
                
                <ul className={`sub-menu-list ${isDevicesOpen ? 'open' : ''}`}>
                  <li className="sub-menu-item">
                    <Link to="/devices/pc" 
                      className={`sub-menu-link ${isActive('/devices/pc') ? 'active' : ''}`}
                      onClick={() => isMobileOpen && toggleMobile()}>
                      PCs
                    </Link>
                  </li>
                  <li className="sub-menu-item">
                    <Link to="/devices/router" 
                      className={`sub-menu-link ${isActive('/devices/router') ? 'active' : ''}`}
                      onClick={() => isMobileOpen && toggleMobile()}>
                      Routers
                    </Link>
                  </li>
                  <li className="sub-menu-item">
                    <Link to="/devices/switch" 
                      className={`sub-menu-link ${isActive('/devices/switch') ? 'active' : ''}`}
                      onClick={() => isMobileOpen && toggleMobile()}>
                      Switches
                    </Link>
                  </li>
                </ul>
              </li>
              
              <li className="menu-item">
                <Link to="/anomalies" 
                  className={`menu-link ${isActive('/anomalies') ? 'active' : ''}`}
                  onClick={() => isMobileOpen && toggleMobile()}>
                  <span className="menu-icon">🔍</span>
                  Anomaly Logs
                </Link>
              </li>
              
              {user.role === 'admin' && (
                <li className="menu-item">
                  <Link to="/users" 
                    className={`menu-link ${isActive('/users') ? 'active' : ''}`}
                    onClick={() => isMobileOpen && toggleMobile()}>
                    <span className="menu-icon">👥</span>
                    User Management
                  </Link>
                </li>
              )}
            </ul>
            
            <div 
              className="user-info"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.75rem 1.5rem 0.5rem',
                marginTop: 'auto',
                borderTop: '1px solid rgba(51, 65, 85, 0.5)',
                marginBottom: '0',
                position: 'relative',
                bottom: '10px'
              }}
            >
              <div 
                className="user-avatar" 
                style={{ 
                  backgroundColor: getAvatarColor(),
                  width: '34px',
                  height: '34px',
                  fontSize: '0.85rem',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  color: 'white',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  letterSpacing: '-0.5px'
                }}
              >
                {getUserInitials()}
              </div>
              <div 
                className="user-details"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  width: 'calc(100% - 42px)'
                }}
              >
                <div 
                  className="user-name" 
                  style={{
                    fontWeight: 600,
                    color: 'white',
                    fontSize: '0.9375rem',
                    marginBottom: '6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user.username || 'User'}
                </div>
                {user.role === 'admin' ? (
                  <span style={{ 
                    backgroundColor: 'rgb(5, 150, 105)',
                    color: 'white !important',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    maxWidth: '100%',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Admin
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: 'rgb(37, 99, 235)',
                    color: 'white !important',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    maxWidth: '100%',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    User
                  </span>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleLogout} 
              className="logout-button"
              style={{
                marginTop: '0',
                marginLeft: '1.5rem',
                marginRight: '1.5rem',
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                fontWeight: '500',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>Log out</span>
            </button>
          </>
        ) : (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading...</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;