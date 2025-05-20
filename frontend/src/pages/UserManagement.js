// src/pages/UserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { fetchUsers, createUser, deleteUser, updateUserRole } from '../api';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    role: 'user'
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePage, setActivePage] = useState('list'); // 'list' or 'grid'
  const [confirmDelete, setConfirmDelete] = useState(null); // User ID to confirm deletion

  // Fetch users data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      setCurrentUserId(storedUser?.id || null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to fetch users: ' + (err.message || 'Unknown error'));
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  });

  const validatePassword = () => {
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(null);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validatePassword()) return;

    setLoading(true);
    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        username: formData.username,
        role: formData.role,
      };
      const newUser = await createUser(userData);
      setUsers([newUser, ...users]);
      setSuccess('User created successfully!');
      // Reset form and close modal
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        role: 'user'
      });
      setIsModalOpen(false);
      
      // Auto-dismiss success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create user: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUserId) {
      setError('You cannot delete yourself!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    try {
      await deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      setSuccess('User deleted successfully!');
      setConfirmDelete(null);
      
      // Auto-dismiss success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete user: ' + (err.message || 'Unknown error'));
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    if (userId === currentUserId) {
      setError('You cannot change your own role!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      setSuccess('User role updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update role: ' + (err.message || 'Unknown error'));
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      role: 'user'
    });
  };

  const openDeleteConfirmation = (userId) => {
    setConfirmDelete(userId);
  };

  const closeDeleteConfirmation = () => {
    setConfirmDelete(null);
  };

  const getRoleBadgeClass = (role) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'admin-role';
      case 'user':
        return 'user-role';
      default:
        return 'guest-role';
    }
  };

  // Generate user avatar initials
  const getUserAvatar = (username) => {
    if (!username) return '👤';
    return username.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Background color for avatar based on username
  const getAvatarColor = (username, role) => {
    if (!username) return '#4B5563';
    
    // Find the user's role by username
    const foundUser = users.find(u => u.username === username);
    const userRole = foundUser ? foundUser.role : role;
    
    // Use green for admin users
    if (userRole === 'admin') {
      return '#10B981'; // Green color for admins
    }
    
    // Use blue for regular users
    return '#3B82F6'; // Blue color for regular users
  };

  // Determine if user is the current logged-in user
  const isCurrentUser = (userId) => userId === currentUserId;

  return (
    <div className="users-container">
      <div className="users-header-container">
        <h1 className="users-header">User Management</h1>
        <p className="users-count">{users.length} users registered</p>
      </div>
      
      {error && (
        <div className="alert error-alert" role="alert">
          {error}
          <button className="close-alert" onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      {success && (
        <div className="alert success-alert" role="alert">
          {success}
          <button className="close-alert" onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="users-actions-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search" 
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>
        
        <div className="users-actions-right">
          <div className="view-toggle">
            <button 
              className={`view-button ${activePage === 'list' ? 'active' : ''}`}
              onClick={() => setActivePage('list')}
              title="List View"
            >
              📋
            </button>
            <button 
              className={`view-button ${activePage === 'grid' ? 'active' : ''}`}
              onClick={() => setActivePage('grid')}
              title="Grid View"
            >
              📊
            </button>
          </div>
          
          <button 
            className="add-user-button" 
            onClick={() => setIsModalOpen(true)}
            disabled={loading}
          >
            Add New User
          </button>
        </div>
      </div>

      {loading && users.length === 0 ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="no-users">
          <div className="no-users-icon">👥</div>
          <h3>No users found</h3>
          <p>{searchTerm ? 'Try adjusting your search' : 'Add your first user to get started'}</p>
          {searchTerm && (
            <button 
              className="reset-search-btn"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : activePage === 'grid' ? (
        <div className="users-grid">
          {filteredUsers.map(user => (
            <div key={user.id} className={`user-card ${isCurrentUser(user.id) ? 'current-user' : ''}`}>
              <div className="user-card-header">
                <div 
                  className="user-avatar" 
                  style={{ backgroundColor: getAvatarColor(user.username, user.role) }}
                >
                  {getUserAvatar(user.username)}
                </div>
                {isCurrentUser(user.id) && <span className="current-user-badge">You</span>}
              </div>
              
              <div className="user-card-body">
                <h3 className="user-name">{user.username}</h3>
                <p className="user-email">{user.email}</p>
                <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
              
              <div className="user-card-footer">
                <select 
                  className="form-select"
                  value={user.role} 
                  onChange={(e) => handleUpdateRole(user.id, e.target.value)} 
                  disabled={loading || isCurrentUser(user.id)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                
                <button 
                  className="delete-button"
                  onClick={() => openDeleteConfirmation(user.id)} 
                  disabled={loading || isCurrentUser(user.id)}
                  title={isCurrentUser(user.id) ? "You cannot delete your own account" : "Delete user"}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className={isCurrentUser(user.id) ? 'current-user-row' : ''}>
                  <td className="user-cell">
                    <div 
                      className="user-avatar table-avatar" 
                      style={{ backgroundColor: getAvatarColor(user.username, user.role) }}
                    >
                      {getUserAvatar(user.username)}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.username}</span>
                      {isCurrentUser(user.id) && <span className="current-user-label">You</span>}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="action-cell">
                    <select 
                      className="form-select"
                      value={user.role} 
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)} 
                      disabled={loading || isCurrentUser(user.id)}
                      title={isCurrentUser(user.id) ? "You cannot change your own role" : "Change role"}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    
                    <button 
                      className="delete-button"
                      onClick={() => openDeleteConfirmation(user.id)} 
                      disabled={loading || isCurrentUser(user.id)}
                      title={isCurrentUser(user.id) ? "You cannot delete your own account" : "Delete user"}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New User</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter password (min. 8 characters)"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="role">Role</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">🔑</span>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="cancel-button" 
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={closeDeleteConfirmation}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Deletion</h2>
              <button className="modal-close" onClick={closeDeleteConfirmation}>×</button>
            </div>
            
            <div className="confirm-message">
              <div className="confirm-icon">⚠️</div>
              <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={closeDeleteConfirmation}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="delete-confirm-button"
                onClick={() => handleDeleteUser(confirmDelete)}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;