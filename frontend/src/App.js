// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardHome from './pages/DashboardHome';
import DeviceList from './pages/DeviceList';
import UserManagement from './pages/UserManagement';
import AnomalyLogs from './pages/AnomalyLogs';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { fetchLogs, fetchMetrics, fetchDashboardStats } from './api'; // Import fetchDashboardStats
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]); // Add state for metrics
  const [dashboardStats, setDashboardStats] = useState({ 
    pc_count: 0, 
    router_count: 0, 
    total_devices: 0, 
    anomalies_count: 0 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Function to toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };

    const loadData = async () => {
      try {
        const [logsData, metricsData, statsData] = await Promise.all([
          fetchLogs(),
          fetchMetrics(), // Fetch metrics
          fetchDashboardStats(), // Fetch dashboard stats
        ]);
        console.log('Fetched Logs:', logsData);
        console.log('Fetched Metrics:', metricsData);
        console.log('Fetched Dashboard Stats:', statsData);

        // Ensure logsData and metricsData are arrays
        setLogs(Array.isArray(logsData) ? logsData : []);
        
        // Process metrics to ensure each has a device_type field
        let processedMetrics = [];
        if (Array.isArray(metricsData)) {
          processedMetrics = metricsData.map(metric => {
            // If metric doesn't have device_type, try to find it from logs
            if (!metric.device_type && metric.hostname) {
              const matchingLog = Array.isArray(logsData) ? 
                logsData.find(log => log.hostname === metric.hostname && log.anomaly_causes?.[0]?.device_type) : null;
              
              if (matchingLog) {
                return {
                  ...metric,
                  device_type: matchingLog.anomaly_causes[0].device_type
                };
              }
            }
            return metric;
          });
        }
        
        setMetrics(processedMetrics);
        
        // Set dashboard stats
        setDashboardStats(statsData || { agents_count: 0, anomalies_count: 0 });
      } catch (err) {
        console.error('Error fetching data:', err);
        setLogs([]); // Fallback to empty array
        setMetrics([]); // Fallback to empty array
        setDashboardStats({ 
          pc_count: 0, 
          router_count: 0, 
          total_devices: 0, 
          anomalies_count: 0 
        }); // Fallback to zero counts
      } finally {
        setIsLoading(false);
      }
    };

    // Close mobile sidebar when window is resized
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    checkSession();
    loadData();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login setUser={setUser} />}
        />
        <Route 
          path="/forgot-password" 
          element={user ? <Navigate to="/" /> : <ForgotPassword />} 
        />
        <Route 
          path="/reset-password" 
          element={user ? <Navigate to="/" /> : <ResetPassword />} 
        />
        <Route
          path="/*"
          element={user ? (
            <div className="app-container">
              {isMobileSidebarOpen && (
                <div className="sidebar-backdrop" onClick={toggleMobileSidebar}></div>
              )}
              
              <Sidebar 
                user={user} 
                setUser={setUser} 
                isMobileOpen={isMobileSidebarOpen}
                toggleMobile={toggleMobileSidebar}
              />
              
              {window.innerWidth <= 768 && (
                <div className="sidebar-toggle" onClick={toggleMobileSidebar}>
                  ☰
                </div>
              )}
              
              <main className="main-content">
                <Routes>
                  <Route path="/" element={
                    <DashboardHome 
                      logs={logs} 
                      isLoading={isLoading} 
                      dashboardStats={dashboardStats}
                    />
                  } />
                  <Route
                    path="/devices/:type"
                    element={<DeviceList logs={logs} metrics={metrics} isLoading={isLoading} />}
                  />
                  {user?.role === 'admin' && (
                    <Route path="/users" element={<UserManagement />} />
                  )}
                  <Route path="/anomalies" element={<AnomalyLogs logs={logs} isLoading={isLoading} />} />
                </Routes>
              </main>
            </div>
          ) : (
            <Navigate to="/login" />
          )}
        />
      </Routes>
    </Router>
  );
};

export default App;