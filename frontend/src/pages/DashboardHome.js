import React, { useMemo, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './DashboardHome.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardHome = ({ logs, isLoading, dashboardStats }) => {
  const [period, setPeriod] = useState('daily'); // State for selected time period
  const [routerAlerts, setRouterAlerts] = useState([]);

  // Fetch router alerts
  useEffect(() => {
    const fetchRouterAlerts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/alerts');
        const data = await response.json();
        setRouterAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching router alerts:', error);
        setRouterAlerts([]);
      }
    };

    fetchRouterAlerts();
  }, []);

  // Calculate chart data from logs and router alerts
  const { chartData } = useMemo(() => {
    const groupLogsByPeriod = (logs, routerAlerts, period) => {
      const groupedThreats = {};
      const groupedNormal = {};
      const groupedRouterAlerts = {};

      // Process PC anomaly logs
      logs.forEach(log => {
        const date = new Date(log.timestamp);
        let key;

        if (period === 'daily') {
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else if (period === 'monthly') {
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        }

        const causes = log.anomaly_causes || [];
        const firstCause = causes[0];
        const anomalyType = firstCause ? firstCause.anomaly_type.toLowerCase() : 'normal';

        if (anomalyType === 'threat') {
          groupedThreats[key] = (groupedThreats[key] || 0) + 1;
        } else {
          groupedNormal[key] = (groupedNormal[key] || 0) + 1;
        }
      });

      // Process router alerts
      routerAlerts.forEach(alert => {
        const date = new Date(alert.timestamp);
        let key;

        if (period === 'daily') {
          key = date.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else if (period === 'monthly') {
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        }

        groupedRouterAlerts[key] = (groupedRouterAlerts[key] || 0) + 1;
      });

      // Combine all keys and sort them
      const allKeys = [...new Set([
        ...Object.keys(groupedThreats),
        ...Object.keys(groupedNormal),
        ...Object.keys(groupedRouterAlerts)
      ])].sort();

      const labels = allKeys.slice(-30); // Last 30 periods
      const threatData = labels.map(key => groupedThreats[key] || 0);
      const normalData = labels.map(key => groupedNormal[key] || 0);
      const routerAlertData = labels.map(key => groupedRouterAlerts[key] || 0);

      return { labels, threatData, normalData, routerAlertData };
    };

    const { labels, threatData, normalData, routerAlertData } = groupLogsByPeriod(logs, routerAlerts, period);

    // Chart.js data structure with three datasets
    const chartData = {
      labels,
      datasets: [
        {
          label: 'PC Threats',
          data: threatData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red for threats
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(239, 68, 68, 0.85)',
        },
        {
          label: 'Router Alerts',
          data: routerAlertData,
          backgroundColor: 'rgba(234, 179, 8, 0.7)', // Yellow for router alerts
          borderColor: 'rgb(234, 179, 8)',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(234, 179, 8, 0.85)',
        },
        {
          label: 'Normal',
          data: normalData,
          backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue for normal
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(59, 130, 246, 0.85)',
        },
      ],
    };

    return { chartData };
  }, [logs, routerAlerts, period]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading dashboard data...</p>
      </div>
    );
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13,
        },
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 11,
          },
          maxRotation: 45,
          minRotation: 45,
        },
        title: {
          display: true,
          text: period === 'daily' ? 'Date' : period === 'weekly' ? 'Week Starting' : 'Month',
          color: '#cbd5e1',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 'normal',
          },
          padding: { top: 10 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 11,
          },
        },
        title: {
          display: true,
          text: 'Number of Logs',
          color: '#cbd5e1',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 'normal',
          },
          padding: { bottom: 10 },
        },
      },
    },
    barPercentage: 0.6,
    categoryPercentage: 0.7,
    animation: {
      duration: 1000,
    },
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-header">Dashboard Overview</h1>
      
      <div className="stats-overview">
        <div className="stat-card devices">
          <div className="stat-card-header">
            <div className="stat-card-title">
              <div className="stat-card-icon">💻</div>
              Total Devices
            </div>
          </div>
          <div className="stat-card-value blue">{dashboardStats?.total_devices || 0}</div>
          <div className="stat-card-trend">
            <span>{dashboardStats?.pc_count || 0} PCs, {dashboardStats?.router_count || 0} Routers</span>
          </div>
        </div>
        
        <div className="stat-card anomalies">
          <div className="stat-card-header">
            <div className="stat-card-title">
              <div className="stat-card-icon">🔍</div>
              Anomalies Detected
            </div>
          </div>
          <div className="stat-card-value">{dashboardStats?.anomalies_count || 0}</div>
          <div className="stat-card-trend">
            <span>Total anomalies found</span>
          </div>
        </div>
      </div>
      
      <div className="chart-section">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Activity Trend</h3>
            <div className="period-selector">
              <label htmlFor="period-select">View By:</label>
              <select
                id="period-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;