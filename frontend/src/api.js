const API_BASE_URL = 'http://localhost:5000/api'; // Adjust as needed

export const apiRequest = async (endpoint, method = 'GET', data = null, includeUserId = false) => {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (includeUserId) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
      config.headers['X-User-ID'] = user.id;
    }
  }

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'API request failed');
    }

    return result;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Authentication
export const login = (email, password) => 
  apiRequest('/auth/login', 'POST', { email, password });

export const logout = () => 
  apiRequest('/auth/logout', 'POST');

// Password Reset
export const requestPasswordReset = (email) => 
  apiRequest('/auth/forgot-password', 'POST', { email });

export const resetPassword = (token, password) => {
  console.log('Calling resetPassword API with token length:', token?.length || 0);
  // Log token preview (first 5 chars for debugging)
  if (token && token.length > 0) {
    console.log('Token preview:', token.substring(0, 5) + '...');
  }
  
  return apiRequest('/auth/reset-password', 'POST', { 
    token,
    password 
  });
};

// Logs
export const fetchLogs = () => 
  apiRequest('/logs');

// Metrics (New)
export const fetchMetrics = () => 
  apiRequest('/metrics');

// Dashboard stats
export const fetchDashboardStats = () => 
  apiRequest('/dashboard/stats');

// Users
export const fetchUsers = () => 
  apiRequest('/users', 'GET', null, true);

export const createUser = (userData) => 
  apiRequest('/users', 'POST', userData, true);

export const deleteUser = (userId) => 
  apiRequest(`/users/${userId}`, 'DELETE', null, true);

export const updateUserRole = (userId, role) => 
  apiRequest(`/users/${userId}/role`, 'PUT', { role }, true);

// Anomaly Scripts
export const updateScriptStatus = (causeId, status) => 
  apiRequest(`/anomaly_scripts/${causeId}/status`, 'PUT', { status }, true);

export const fetchScriptStatus = (causeId) => 
  apiRequest(`/anomaly_scripts/${causeId}`, 'GET', null, true);

export const fetchScriptContent = (causeId) => 
  apiRequest(`/scripts/${causeId}`, 'GET', null, true);

export const createOrUpdateScript = (causeId, scriptContent, deviceType, recommendation = null, agentUuid = null) => 
  apiRequest(`/scripts/${causeId}`, 'POST', { 
    script_content: scriptContent, 
    device_type: deviceType,
    recommendation: recommendation,
    agent_uuid: agentUuid 
  }, true);

// Agents
export const fetchAgentByHostname = (hostname) => 
  apiRequest(`/agents/hostname/${hostname}`, 'GET', null, true);