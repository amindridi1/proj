import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  updateScriptStatus, 
  createOrUpdateScript,
  fetchAgentByHostname,
  fetchScriptStatus 
} from '../api';
import GaugeChart from 'react-gauge-chart';
import './DeviceList.css';

const DeviceList = ({ logs, metrics: propMetrics, isLoading }) => {
  const { type } = useParams();
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedDevices, setExpandedDevices] = useState({});
  const [metrics, setMetrics] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scriptStatuses, setScriptStatuses] = useState({});
  const [editingScripts, setEditingScripts] = useState({});
  const [scriptEdits, setScriptEdits] = useState({});
  const [alert, setAlert] = useState(null);
  const [scriptErrors, setScriptErrors] = useState({});
  const [routers, setRouters] = useState([]);
  const [routerAlerts, setRouterAlerts] = useState({});
  const [expandedRouterAlerts, setExpandedRouterAlerts] = useState({});
  const [localLoading, setLocalLoading] = useState(true);

  // Use metrics from props
  useEffect(() => {
    if (propMetrics && propMetrics.length > 0) {
      setMetrics(propMetrics);
      setLastUpdated(new Date());
    }
  }, [propMetrics]);

  // Update local loading state based on initial loading and data fetching
  useEffect(() => {
    if (!isLoading && ((type.toLowerCase() === 'router' && routers.length > 0) || 
        (type.toLowerCase() !== 'router' && propMetrics.length > 0))) {
      setLocalLoading(false);
    } else {
      setLocalLoading(isLoading);
    }
  }, [isLoading, type, routers, propMetrics]);

  // Fetch script statuses when component mounts and when logs change
  useEffect(() => {
    const fetchScriptStatuses = async () => {
      if (!Array.isArray(logs) || logs.length === 0) return;
      
      // Extract all cause IDs that have scripts
      const causeIds = logs
        .filter(log => log.is_anomaly && log.anomaly_causes && log.anomaly_causes[0]?.id)
        .map(log => log.anomaly_causes[0].id);
      
      if (causeIds.length === 0) return;
      
      try {
        // Fetch status for each script
        const statuses = {};
        await Promise.all(
          causeIds.map(async (causeId) => {
            try {
              const response = await fetchScriptStatus(causeId);
              if (response && response.status) {
                statuses[causeId] = response.status;
              } else {
                statuses[causeId] = 'pending';
              }
            } catch (err) {
              console.error(`Error fetching status for script ${causeId}:`, err);
              // Default to 'pending' if we can't get the status
              statuses[causeId] = 'pending';
            }
          })
        );
        
        setScriptStatuses(statuses);
      } catch (error) {
        console.error('Error fetching script statuses:', error);
      }
    };
    
    fetchScriptStatuses();
  }, [logs]);

  // Fetch routers when component mounts
  useEffect(() => {
    const fetchRouters = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/routers');
        const data = await response.json();
        setRouters(data);
        
        // Create alerts map from the included alerts data
        if (Array.isArray(data)) {
          const alertsMap = {};
          data.forEach(router => {
            alertsMap[router.hostname] = router.alerts || [];
          });
          setRouterAlerts(alertsMap);
        }
      } catch (error) {
        console.error('Error fetching routers:', error);
      }
    };
    fetchRouters();
  }, []);

  // Get all devices from metrics data
  const allDevices = useMemo(() => {
    // If we're on the router page, return router data directly
    if (type.toLowerCase() === 'router' && Array.isArray(routers)) {
      return routers.map(router => ({
        hostname: router.hostname,
        device_type: 'router',
        metrics: null,
        hasAnomalies: router.alerts && router.alerts.length > 0,
        status: router.status,
        alerts: router.alerts || []
      })).sort((a, b) => {
        // Sort by having alerts first, then by hostname
        if (a.hasAnomalies && !b.hasAnomalies) return -1;
        if (!a.hasAnomalies && b.hasAnomalies) return 1;
        return a.hostname.localeCompare(b.hostname);
      });
    }

    // For other device types, use the existing logic
    const deviceMap = {};
    
    // Add all devices from metrics
    if (Array.isArray(metrics)) {
      metrics.forEach(metric => {
        // Skip metrics without hostnames
        if (!metric.hostname) return;
        
        // Determine device type - either from the metric or infer from hostname
        let deviceType = (metric.device_type || '').toLowerCase();
        if (!deviceType) {
          // If no device_type, try to infer from hostname
          if (metric.hostname.toLowerCase().includes('pc') || 
              metric.hostname.toLowerCase().includes('desktop') || 
              metric.hostname.toLowerCase().includes('laptop') ||
              metric.hostname.toLowerCase().includes('workstation')) {
            deviceType = 'pc';
          } else if (metric.hostname.toLowerCase().includes('switch') || 
                     metric.hostname.toLowerCase().includes('server')) {
            deviceType = 'switch';
          } else {
            // Default to unknown
            deviceType = 'unknown';
          }
        }
        
        // Add device to map if it matches the current view type
        const currentType = type.toLowerCase();
        
        if (currentType === 'switch' && (deviceType === 'switch' || deviceType === 'server')) {
          // For switch page, include both switches and servers
          if (!deviceMap[metric.hostname]) {
            deviceMap[metric.hostname] = {
              hostname: metric.hostname,
              device_type: deviceType,
              anomalies: [],
              metrics: null,
              hasAnomalies: false
            };
          }
        } else if (deviceType === currentType || 
                  (currentType === 'pc' && (deviceType === 'pc' || deviceType === 'desktop' || 
                                          deviceType === 'laptop' || deviceType === 'workstation'))) {
          if (!deviceMap[metric.hostname]) {
            deviceMap[metric.hostname] = {
              hostname: metric.hostname,
              device_type: deviceType,
              anomalies: [],
              metrics: null,
              hasAnomalies: false
            };
          }
        }
      });
    }
    
    // Now add anomalies to matching devices
    const filteredLogs = Array.isArray(logs) ? logs.filter(log => {
      if (!log.is_anomaly) return false;
      
      const deviceType = (log.anomaly_causes?.[0]?.device_type || '').toLowerCase();
      const currentType = type.toLowerCase();
      
      if (currentType === 'switch') {
        return deviceType === 'switch' || deviceType === 'server';
      } else if (currentType === 'pc') {
        return deviceType === 'pc' || deviceType === 'desktop' || 
               deviceType === 'laptop' || deviceType === 'workstation';
      }
      
      return deviceType === currentType;
    }) : [];

    // Process anomalies and add metrics
    filteredLogs.forEach(log => {
      const hostname = log.hostname;
      if (deviceMap[hostname]) {
        deviceMap[hostname].hasAnomalies = true;
        deviceMap[hostname].anomalies.push({
          message: log.message || 'No message available',
          timestamp: log.timestamp,
          cause: log.anomaly_causes?.[0]?.cause || 'Unknown',
          recommendation: log.anomaly_causes?.[0]?.recommendation || 'None',
          anomaly_type: log.anomaly_causes?.[0]?.anomaly_type || 'unknown',
          causeId: log.anomaly_causes?.[0]?.id,
          script_content: log.anomaly_causes?.[0]?.anomaly_scripts?.script_content || 'No script available',
          isThreat: log.anomaly_causes?.[0]?.anomaly_type === 'threat',
        });
      }
    });

    // Add metrics data
    Object.values(deviceMap).forEach(device => {
      const deviceMetrics = (Array.isArray(metrics) ? metrics : [])
        .filter(metric => metric.hostname === device.hostname)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      device.metrics = deviceMetrics || null;
      
      if (device.anomalies.length > 0) {
        device.anomalies.sort((a, b) => {
          if (a.isThreat && !b.isThreat) return -1;
          if (!a.isThreat && b.isThreat) return 1;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
      }
    });

    return Object.values(deviceMap).sort((a, b) => {
      if (a.hasAnomalies && !b.hasAnomalies) return -1;
      if (!a.hasAnomalies && b.hasAnomalies) return 1;
      return a.hostname.localeCompare(b.hostname);
    });
  }, [logs, metrics, type, routers]);

  // Filter devices based on search query
  const devices = useMemo(() => {
    if (!searchQuery.trim()) return allDevices;
    
    const query = searchQuery.toLowerCase();
    return allDevices.filter(device => 
      device.hostname.toLowerCase().includes(query)
    );
  }, [allDevices, searchQuery]);

  const handleAutoFix = async (causeId, rowKey) => {
    try {
      // Check if we need to save the script first (if it was just added)
      const hasUnsavedChanges = scriptEdits[rowKey] && scriptEdits[rowKey].trim() !== '';
      
      if (hasUnsavedChanges) {
        // Save the script first
        const content = scriptEdits[rowKey];
        
        // Get device type and recommendation from the anomaly
        const anomalyIndex = rowKey.split('-');
        const deviceIndex = parseInt(anomalyIndex[0]);
        const anomalyIdx = parseInt(anomalyIndex[1]);
        const anomaly = devices[deviceIndex]?.anomalies[anomalyIdx];
        const device = devices[deviceIndex];
        const deviceType = device?.device_type || 'unknown';
        
        // Get recommendation and try to find an agent UUID
        const recommendation = anomaly?.recommendation || null;
        let agentUuid = null;
        
        // Try to get agent UUID based on hostname
        if (device?.hostname) {
          try {
            const agentResponse = await fetchAgentByHostname(device.hostname).catch(() => null);
            if (agentResponse && agentResponse.id) {
              agentUuid = agentResponse.id;
            }
          } catch (err) {
            // Continue without agent UUID if it fails
            console.warn('Could not fetch agent UUID, continuing without it');
          }
        }
        
        // Save the script to the database
        await createOrUpdateScript(causeId, content, deviceType, recommendation, agentUuid);
        
        // Update local state
        if (devices[deviceIndex]?.anomalies[anomalyIdx]) {
          devices[deviceIndex].anomalies[anomalyIdx].script_content = content;
        }
        
        // Clear editing state
        setEditingScripts(prev => ({
          ...prev,
          [rowKey]: false
        }));
        
        setScriptEdits(prev => {
          const newState = {...prev};
          delete newState[rowKey];
          return newState;
        });
      }
    
      // Update local state immediately for better UX
      setScriptStatuses(prev => ({
        ...prev,
        [causeId]: 'queued'
      }));
      
      // Send request to update status in backend
      await updateScriptStatus(causeId, 'queued');
      
      // Show success message
      setAlert({
        type: 'success',
        message: 'Script queued for execution'
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => setAlert(null), 3000);
      
      // Start polling for status updates
      const intervalId = setInterval(async () => {
        try {
          const response = await fetchScriptStatus(causeId);
          if (response) {
            let status = response.status || 'pending';
            
            setScriptStatuses(prev => ({
              ...prev,
              [causeId]: status
            }));
            
            // If we've reached a terminal state, stop polling
            if (['executed', 'failed'].includes(status)) {
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error(`Error polling status for script ${causeId}:`, err);
          clearInterval(intervalId);
        }
      }, 5000); // Poll every 5 seconds
      
      // Clean up interval after 5 minutes (in case it never reaches a terminal state)
      setTimeout(() => clearInterval(intervalId), 300000);
      
    } catch (error) {
      console.error('Error queueing script:', error);
      
      // Revert status on error
      setScriptStatuses(prev => ({
        ...prev,
        [causeId]: 'pending'
      }));
      
      setAlert({
        type: 'error',
        message: 'Failed to queue script: ' + error.message
      });
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleCancelScript = async (causeId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      // Update local state immediately for better UX
      setScriptStatuses(prev => ({
        ...prev,
        [causeId]: 'pending'
      }));
      
      // Send request to update status in backend
      await updateScriptStatus(causeId, 'pending');
      
      // Show success message
      setAlert({
        type: 'success',
        message: 'Script cancelled and returned to pending'
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Error canceling script:', error);
      setAlert({
        type: 'error',
        message: 'Failed to cancel script: ' + error.message
      });
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleScriptEdit = (causeId, rowKey) => {
    // Start editing mode for this script
    setEditingScripts(prev => ({
      ...prev,
      [rowKey]: true
    }));
    
    // Reset script status to pending when editing starts
    if (causeId && scriptStatuses[causeId] && 
        (scriptStatuses[causeId] === 'failed' || scriptStatuses[causeId] === 'queued')) {
      setScriptStatuses(prev => ({
        ...prev,
        [causeId]: 'pending'
      }));
    }
    
    // Get current script content (might be empty)
    const anomalyIndex = rowKey.split('-');
    const deviceIndex = parseInt(anomalyIndex[0]);
    const anomalyIdx = parseInt(anomalyIndex[1]);
    const anomaly = devices[deviceIndex]?.anomalies[anomalyIdx];
    
    let initialContent = '';
    if (anomaly && anomaly.script_content && anomaly.script_content !== 'No script available') {
      initialContent = anomaly.script_content;
    }
    
    // Set initial edit content
    setScriptEdits(prev => ({
      ...prev,
      [rowKey]: initialContent
    }));
  };

  const handleScriptChange = (rowKey, content) => {
    setScriptEdits(prev => ({
      ...prev,
      [rowKey]: content
    }));
    
    // Clear any errors when user types
    if (scriptErrors[rowKey]) {
      setScriptErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[rowKey];
        return newErrors;
      });
    }
  };

  const handleScriptSave = async (causeId, rowKey) => {
    try {
      const content = scriptEdits[rowKey];
      if (!content || content.trim() === '') {
        // Set error state to show the red border
        setScriptErrors(prev => ({
          ...prev,
          [rowKey]: 'Script content cannot be empty'
        }));
        
        // Show alert
        setAlert({
          type: 'error',
          message: 'Script content cannot be empty'
        });
        setTimeout(() => setAlert(null), 5000);
        
        // Try to focus the textarea
        const textarea = document.querySelector(`.script-textarea[value="${scriptEdits[rowKey] || ''}"]`);
        if (textarea) {
          textarea.focus();
        }
        
        return;
      }
      
      // Clear any errors
      setScriptErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[rowKey];
        return newErrors;
      });
      
      // Get device type and recommendation from the anomaly
      const anomalyIndex = rowKey.split('-');
      const deviceIndex = parseInt(anomalyIndex[0]);
      const anomalyIdx = parseInt(anomalyIndex[1]);
      const anomaly = devices[deviceIndex]?.anomalies[anomalyIdx];
      const device = devices[deviceIndex];
      const deviceType = device?.device_type || 'unknown';
      
      // Get recommendation and find an agent UUID for the hostname
      const recommendation = anomaly?.recommendation || null;
      let agentUuid = null;
      
      // Use the hostname to find a matching agent UUID if possible
      if (device?.hostname) {
        try {
          // Attempt to fetch the agent UUID for this hostname (this is optional)
          const agentResponse = await fetchAgentByHostname(device.hostname).catch(() => null);
          if (agentResponse && agentResponse.id) {
            agentUuid = agentResponse.id;
          }
        } catch (err) {
          // If this fails, continue without agent UUID
          console.warn('Could not fetch agent UUID, continuing without it');
        }
      }
      
      // Save the script to the database
      await createOrUpdateScript(causeId, content, deviceType, recommendation, agentUuid);
      
      // Update local state for better UX
      setEditingScripts(prev => ({
        ...prev,
        [rowKey]: false
      }));
      
      // Update the anomaly in the local state
      const updatedDevices = [...devices];
      if (updatedDevices[deviceIndex]?.anomalies[anomalyIdx]) {
        updatedDevices[deviceIndex].anomalies[anomalyIdx].script_content = content;
      }
      
      // Set script status to pending
      setScriptStatuses(prev => ({
        ...prev,
        [causeId]: 'pending'
      }));
      
      // Show success message
      setAlert({
        type: 'success',
        message: 'Script saved successfully'
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Error saving script:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save script: ' + error.message
      });
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleScriptCancel = (rowKey) => {
    setEditingScripts(prev => ({
      ...prev,
      [rowKey]: false
    }));
    setScriptEdits(prev => {
      const newState = {...prev};
      delete newState[rowKey];
      return newState;
    });
    
    // Clear any errors
    setScriptErrors(prev => {
      const newErrors = {...prev};
      delete newErrors[rowKey];
      return newErrors;
    });
  };

  const toggleRow = (key) => {
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleDevice = (hostname) => {
    setExpandedDevices(prev => ({
      ...prev,
      [hostname]: !prev[hostname]
    }));
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const gaugeStyle = {
    width: '65px',
    height: '40px',
    margin: '0 auto',
  };

  const gaugeColors = {
    safe: '#05FF00',
    warning: '#FFFC00',
    critical: '#FF0000',
  };

  // Helper function to render button based on script status
  const renderActionButton = (causeId, anomaly, rowKey) => {
    // Check if there's no script available
    const originalScriptUnavailable = 
      !causeId || 
      !anomaly.script_content || 
      anomaly.script_content === 'No script available' ||
      anomaly.script_content.trim() === '';
    
    // Check if the script is being edited or has been edited
    const isEditing = editingScripts[rowKey];
    const hasEditedContent = scriptEdits[rowKey] && scriptEdits[rowKey].trim() !== '';
    
    // If still editing or if has edited content that's not saved yet, show disabled button
    if (isEditing) {
      return (
        <button className="auto-fix-button no-script-status" disabled>
          <span className="status-indicator no-script"></span>
          Editing Script...
        </button>
      );
    }
    
    // If no script available, disable button
    if (originalScriptUnavailable && !hasEditedContent) {
      return (
        <button className="auto-fix-button no-script-status" disabled>
          <span className="status-indicator no-script"></span>
          No Fix Available
        </button>
      );
    }
    
    const status = scriptStatuses[causeId] || 'pending';
    
    switch(status) {
      case 'pending':
        return (
          <button
            className="auto-fix-button"
            onClick={(e) => {
              e.stopPropagation();
              handleAutoFix(causeId, rowKey);
            }}
          >
            Auto Fix
          </button>
        );
      case 'queued':
        return (
          <div className="action-button-group">
          <button className="auto-fix-button queued-status" disabled>
            <span className="status-indicator queued"></span>
            Queued
          </button>
            <button 
              className="cancel-button"
              onClick={(e) => handleCancelScript(causeId, e)}
              title="Cancel and return to pending"
            >
              ✕
            </button>
          </div>
        );
      case 'executing':
        return (
          <button className="auto-fix-button executing-status" disabled>
            <span className="status-indicator executing"></span>
            Executing
          </button>
        );
      case 'executed':
        return (
          <button className="auto-fix-button success-status" disabled>
            <span className="status-indicator success"></span>
            Fixed
          </button>
        );
      case 'failed':
        return (
          <button className="auto-fix-button failed-status" disabled>
            <span className="status-indicator failed"></span>
            Failed
          </button>
        );
      default:
        return (
          <button
            className="auto-fix-button"
            onClick={(e) => {
              e.stopPropagation();
              handleAutoFix(causeId, rowKey);
            }}
          >
            Auto Fix
          </button>
        );
    }
  };

  // Helper to toggle expanded state for router alerts
  const toggleRouterAlert = (hostname, idx) => {
    setExpandedRouterAlerts(prev => ({
      ...prev,
      [hostname]: {
        ...(prev[hostname] || {}),
        [idx]: !((prev[hostname] || {})[idx])
      }
    }));
  };

  if (!['pc', 'router', 'switch'].includes(type.toLowerCase())) {
    return (
      <div className="device-container">
        <h1 className="device-header">Invalid Device Type</h1>
        <p>Please select a valid device type (PC, Router, or Switch).</p>
      </div>
    );
  }

  // Display a loading spinner if data is being loaded
  if (localLoading) {
    return (
      <div className="device-list-loading-container">
        <div className="device-list-loading-spinner"></div>
        <p className="device-list-loading-text">Loading {type} data...</p>
      </div>
    );
  }

  return (
    <div className="device-container">
      <div className="device-header-container">
        <h1 className="device-header">{type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Devices</h1>
        <div className="last-updated">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
        </div>
      </div>
      
      {alert && (
        <div className={`alert ${alert.type}-alert`} role="alert">
          {alert.message}
          <button className="close-alert" onClick={() => setAlert(null)}>×</button>
        </div>
      )}
      
      <div className="search-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={`Search ${type.toLowerCase()} devices...`}
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button 
              className="clear-search" 
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="search-stats">
            {devices.length} of {allDevices.length} device{allDevices.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
      
      {devices.length === 0 ? (
        <div className="no-devices">
          {searchQuery 
            ? `No ${type.toLowerCase()} devices found matching "${searchQuery}"`
            : `No ${type.toLowerCase()} devices found.`}
        </div>
      ) : (
        <div className="devices-wrapper">
          {devices.map((device, index) => {
            // For routers, show status and alerts, not metrics
            if (type.toLowerCase() === 'router') {
              // Find router info
              const routerInfo = routers.find(r => r.hostname === device.hostname);
              const status = routerInfo ? routerInfo.status : 'unknown';
              const alerts = routerAlerts[device.hostname] || [];
              return (
                <div key={index} className="device-card">
                  <div 
                    className={`device-header-row is-normal`}
                    onClick={() => toggleDevice(device.hostname)}
                  >
                    <div className="device-main-info">
                      <h3 className="device-name">{device.hostname}</h3>
                    </div>
                    <div className="device-metrics-row">
                      <span className={`router-status-badge ${status}`}>
                        {status === 'up' && <span className="router-status-icon" role="img" aria-label="Up">✔️</span>}
                        {status === 'down' && <span className="router-status-icon" role="img" aria-label="Down">❌</span>}
                        {status !== 'up' && status !== 'down' && <span className="router-status-icon" role="img" aria-label="Unknown">⚠️</span>}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                      <div className="expand-toggle">
                        {expandedDevices[device.hostname] ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                  {expandedDevices[device.hostname] && (
                    <div className="anomalies-section">
                      <h4 className="section-title">Alerts</h4>
                      {alerts.length > 0 ? (
                        alerts.map((alert, idx) => {
                          const isExpanded = (expandedRouterAlerts[device.hostname] || {})[idx];
                          return (
                            <div key={idx} className="anomaly-entry non-threat-anomaly">
                              <div className="anomaly-summary" onClick={() => toggleRouterAlert(device.hostname, idx)} style={{cursor: 'pointer'}}>
                                <div className="anomaly-title">
                                  {alert.description || alert.alert_type || 'No description'}
                                </div>
                                <div className="anomaly-actions">
                                  <div className="anomaly-date">{new Date(alert.timestamp).toLocaleString()}</div>
                                  <div className="anomaly-toggle">{isExpanded ? '▼' : '▶'}</div>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="anomaly-details">
                                  <div className="details-grid">
                                    <div className="details-column">
                                      <div className="detail-group">
                                        <h5 className="detail-label">Alert Type</h5>
                                        <p className="detail-value">{alert.alert_type}</p>
                                      </div>
                                      <div className="detail-group">
                                        <h5 className="detail-label">Source IP</h5>
                                        <p className="detail-value">{alert.source_ip}</p>
                                      </div>
                                      <div className="detail-group">
                                        <h5 className="detail-label">Destination IP</h5>
                                        <p className="detail-value">{alert.dest_ip}</p>
                                      </div>
                                      <div className="detail-group">
                                        <h5 className="detail-label">Protocol</h5>
                                        <p className="detail-value">{alert.protocol}</p>
                                      </div>
                                      <div className="detail-group">
                                        <h5 className="detail-label">Status</h5>
                                        <p className="detail-value">{alert.status}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="empty-anomalies">No alerts found</p>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            // This part is for non-router devices (PCs, Switches)
            const cpuUsage = device.metrics?.cpu_usage_percent || 0;
            const memoryUsageGB = Number(device.metrics?.memory_usage_gb) || 0;
            const memoryTotalGB = Number(device.metrics?.memory_total_gb) || 0;
            
            // Primary Disk
            const primaryDiskUsageGB = Number(device.metrics?.primary_disk_usage_gb) || 0;
            const primaryDiskTotalGB = Number(device.metrics?.primary_disk_capacity_gb) || 0;
            const primaryDiskPercent = primaryDiskTotalGB > 0 ? (primaryDiskUsageGB / primaryDiskTotalGB) : 0;

            // Secondary Disk
            const secondaryDiskUsageGB = Number(device.metrics?.secondary_disk_usage_gb) || 0;
            const secondaryDiskTotalGB = Number(device.metrics?.secondary_disk_capacity_gb) || 0;
            const hasSecondaryDisk = secondaryDiskTotalGB > 0 && device.metrics?.secondary_disk_capacity_gb !== null;
            const secondaryDiskPercent = hasSecondaryDisk ? (secondaryDiskUsageGB / secondaryDiskTotalGB) : 0;
            
            const anomalyCount = device.anomalies.length;
            const hasThreats = device.anomalies.some(a => a.isThreat);
            
            // Check if all anomalies have been fixed
            const allAnomaliesFixed = anomalyCount > 0 && 
              device.anomalies.every(anomaly => 
                scriptStatuses[anomaly.causeId] === 'executed'
              );

            return (
              <div key={index} className="device-card">
                <div 
                  className={`device-header-row ${
                    allAnomaliesFixed ? 'is-normal' : 
                    hasThreats ? 'has-threats' : 
                    anomalyCount > 0 ? 'has-anomalies' : 'is-normal'
                  }`}
                  onClick={() => toggleDevice(device.hostname)}
                >
                  <div className="device-main-info">
                    <h3 className="device-name">{device.hostname}</h3>
                    <div className="device-anomaly-badge">
                      {anomalyCount > 0 ? (
                        allAnomaliesFixed ? (
                          <span className="normal-status">All Issues Fixed</span>
                        ) : (
                          <>
                            {anomalyCount} anomaly{anomalyCount !== 1 ? 's' : ''} detected
                            {hasThreats && <span className="threat-indicator">!</span>}
                          </>
                        )
                      ) : (
                        <span className="normal-status">Normal</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="device-metrics-row">
                    {device.metrics ? (
                      <>
                        <div className="metric-item">
                          <div className="gauge-container">
                          <GaugeChart
                            id={`cpu-gauge-${device.hostname}`}
                              nrOfLevels={3}
                              arcsLength={[0.4, 0.3, 0.3]}
                            colors={[gaugeColors.safe, gaugeColors.warning, gaugeColors.critical]}
                            percent={cpuUsage / 100}
                              arcWidth={0.3}
                            needleColor="#00FFFF"
                              needleBaseColor="#0088FF"
                            style={gaugeStyle}
                            hideText={true}
                              cornerRadius={0}
                            />
                          </div>
                          <div className="metric-text">
                            <div className="metric-value">{cpuUsage.toFixed(1)}%</div>
                            <div className="metric-label">CPU</div>
                          </div>
                        </div>
                        
                        <div className="metric-item">
                          <div className="gauge-container">
                          <GaugeChart
                            id={`memory-gauge-${device.hostname}`}
                              nrOfLevels={3}
                              arcsLength={[0.4, 0.3, 0.3]}
                            colors={[gaugeColors.safe, gaugeColors.warning, gaugeColors.critical]}
                            percent={(memoryUsageGB / memoryTotalGB) || 0}
                              arcWidth={0.3}
                            needleColor="#00FFFF"
                              needleBaseColor="#0088FF"
                            style={gaugeStyle}
                            hideText={true}
                              cornerRadius={0}
                            />
                          </div>
                          <div className="metric-text">
                            <div className="metric-value">{memoryUsageGB.toFixed(1)}</div>
                            <div className="metric-label">GB MEM</div>
                        </div>
                        </div>
                        
                        <div className="metric-item">
                          <div className="gauge-container">
                            <GaugeChart
                              id={`primary-disk-gauge-${device.hostname}`}
                              nrOfLevels={3}
                              arcsLength={[0.4, 0.3, 0.3]}
                              colors={[gaugeColors.safe, gaugeColors.warning, gaugeColors.critical]}
                              percent={primaryDiskPercent}
                              arcWidth={0.3}
                              needleColor="#00FFFF"
                              needleBaseColor="#0088FF"
                              style={gaugeStyle}
                              hideText={true}
                              cornerRadius={0}
                            />
                          </div>
                          <div className="metric-text">
                            <div className="metric-value">{primaryDiskUsageGB.toFixed(1)}</div>
                            <div className="metric-label">DISK 1 (GB)</div>
                          </div>
                        </div>

                        {hasSecondaryDisk && (
                          <div className="metric-item">
                            <div className="gauge-container">
                              <GaugeChart
                                id={`secondary-disk-gauge-${device.hostname}`}
                                nrOfLevels={3}
                                arcsLength={[0.4, 0.3, 0.3]}
                                colors={[gaugeColors.safe, gaugeColors.warning, gaugeColors.critical]}
                                percent={secondaryDiskPercent}
                                arcWidth={0.3}
                                needleColor="#00FFFF"
                                needleBaseColor="#0088FF"
                                style={gaugeStyle}
                                hideText={true}
                                cornerRadius={0}
                              />
                            </div>
                            <div className="metric-text">
                              <div className="metric-value">{secondaryDiskUsageGB.toFixed(1)}</div>
                              <div className="metric-label">DISK 2 (GB)</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="expand-toggle">
                          {expandedDevices[device.hostname] ? '▼' : '▶'}
                        </div>
                      </>
                    ) : (
                      <div className="no-metrics">No metrics available</div>
                    )}
                  </div>
                </div>
                
                {expandedDevices[device.hostname] && (
                  <div className="anomalies-section">
                    <h4 className="section-title">Anomalies</h4>
                    
                    {device.anomalies.length > 0 ? (
                      device.anomalies.map((anomaly, idx) => {
                            const rowKey = `${index}-${idx}`;
                            return (
                          <div key={idx} className={`anomaly-entry ${anomaly.isThreat ? 'threat-anomaly' : 'non-threat-anomaly'}`}>
                            <div 
                              className="anomaly-summary"
                                  onClick={() => toggleRow(rowKey)}
                                >
                              <div className="anomaly-title">
                                    {anomaly.message}
                              </div>
                              <div className="anomaly-actions">
                                <div className="anomaly-date">{new Date(anomaly.timestamp).toLocaleString()}</div>
                                {renderActionButton(anomaly.causeId, anomaly, rowKey)}
                                <div className="anomaly-toggle">{expandedRows[rowKey] ? '▼' : '▶'}</div>
                              </div>
                            </div>
                            
                                {expandedRows[rowKey] && (
                              <div className="anomaly-details">
                                <div className="details-grid">
                                  <div className="details-column">
                                    <div className="detail-group">
                                      <h5 className="detail-label">Cause</h5>
                                      <p className="detail-value">{anomaly.cause}</p>
                                    </div>
                                    
                                    <div className="detail-group">
                                      <h5 className="detail-label">Recommendation</h5>
                                      <p className="detail-value">{anomaly.recommendation}</p>
                                    </div>
                                    
                                    <div className="detail-group">
                                      <h5 className="detail-label">Type</h5>
                                      <p className={`detail-value ${anomaly.isThreat ? 'threat-text' : ''}`}>
                                        {anomaly.anomaly_type}
                                      </p>
                                        </div>
                                        </div>
                                  
                                  <div className="details-column">
                                    <div className="detail-group full-width">
                                      <h5 className="detail-label">Script</h5>
                                      <div className="script-container">
                                        {editingScripts[rowKey] ? (
                                          <div className="script-editor">
                                            <textarea
                                              className={`script-textarea ${scriptErrors[rowKey] ? 'script-textarea-error' : ''}`}
                                              value={scriptEdits[rowKey] || ''}
                                              onChange={(e) => handleScriptChange(rowKey, e.target.value)}
                                              placeholder="Enter your script here..."
                                            ></textarea>
                                            <div className="script-edit-actions">
                                              <button 
                                                className="script-save-button"
                                                onClick={() => handleScriptSave(anomaly.causeId, rowKey)}
                                              >
                                                Save
                                              </button>
                                              <button 
                                                className="script-cancel-button"
                                                onClick={() => handleScriptCancel(rowKey)}
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : anomaly.script_content && anomaly.script_content !== 'No script available' ? (
                                          <div className="script-content-container">
                                            <pre className="script-content">{anomaly.script_content}</pre>
                                            <div className="script-actions">
                                              <button 
                                                className="edit-script-button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleScriptEdit(anomaly.causeId, rowKey);
                                                }}
                                              >
                                                Edit Script
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="no-script-message clickable" onClick={() => handleScriptEdit(anomaly.causeId, rowKey)}>
                                            <p>Create a script to fix this issue.</p>
                                            <button className="add-script-button">Add Custom Script</button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="empty-anomalies">No anomalies found</p>
                    )}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeviceList;