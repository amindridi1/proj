import React, { useState, useMemo, useEffect } from 'react';
import './AnomalyLogs.css';

const AnomalyLogs = ({ logs, isLoading }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    deviceType: 'all',
    source: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const itemsPerPage = 10;

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const sources = new Set();
    const deviceTypes = new Set();
    
    logs.forEach(log => {
      sources.add(log.source);
      if (log.anomaly_causes && log.anomaly_causes[0]) {
        deviceTypes.add(log.anomaly_causes[0].device_type);
      }
    });
    
    return {
      sources: Array.from(sources),
      deviceTypes: Array.from(deviceTypes).filter(t => t)
    };
  }, [logs]);

  // Apply filters and search
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const cause = log.anomaly_causes?.[0] || {};
      const deviceType = cause.device_type || '';
      const source = log.source || '';
      
      // Apply dropdown filters
      if (filters.deviceType !== 'all' && deviceType !== filters.deviceType) return false;
      if (filters.source !== 'all' && source !== filters.source) return false;
      
      // Apply search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          log.message?.toLowerCase().includes(searchLower) ||
          log.hostname?.toLowerCase().includes(searchLower) ||
          cause.cause?.toLowerCase().includes(searchLower) ||
          cause.recommendation?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [logs, filters, searchTerm]);

  // Apply sorting
  const sortedLogs = useMemo(() => {
    const sortableLogs = [...filteredLogs];
    if (sortConfig.key) {
      sortableLogs.sort((a, b) => {
        if (!['device_type', 'cause', 'recommendation'].includes(sortConfig.key)) {
          const aValue = a[sortConfig.key] || '';
          const bValue = b[sortConfig.key] || '';
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        const aCause = a.anomaly_causes?.[0] || {};
        const bCause = b.anomaly_causes?.[0] || {};
        const aValue = aCause[sortConfig.key] || '';
        const bValue = bCause[sortConfig.key] || '';
        
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      });
    }
    return sortableLogs;
  }, [filteredLogs, sortConfig]);

  // Paginate logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedLogs, currentPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const toggleExpandLog = (index) => {
    setExpandedLogId(expandedLogId === index ? null : index);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading anomaly logs...</p>
      </div>
    );
  }

  return (
    <div className="anomaly-container">
      <div className="anomaly-header-container">
        <h1 className="anomaly-header">Anomaly Logs</h1>
        <p className="logs-count">{logs.length} logs found</p>
      </div>
      
      <div className="filters-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search logs..."
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
        
        <div className="filter-group">
          <label className="filter-label">Device Type:</label>
          <select 
            className="filter-select"
            value={filters.deviceType}
            onChange={(e) => handleFilterChange('deviceType', e.target.value)}
          >
            <option value="all">All Devices</option>
            {filterOptions.deviceTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Source:</label>
          <select 
            className="filter-select"
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
          >
            <option value="all">All Sources</option>
            {filterOptions.sources.map(source => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {sortedLogs.length === 0 ? (
        <div className="no-logs">
          <div className="no-logs-icon">📊</div>
          <h3>No matching logs found</h3>
          <p>Try adjusting your filters or search criteria</p>
          <button 
            className="reset-filters-btn"
            onClick={() => {
              setFilters({deviceType: 'all', source: 'all'});
              setSearchTerm('');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th className="expand-column"></th>
                  {['timestamp', 'hostname', 'device_type', 'source', 'message'].map((key) => (
                    <th 
                      key={key}
                      onClick={() => requestSort(key)}
                      className={sortConfig.key === key ? 'sortable active' : 'sortable'}
                    >
                      {key.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                      {sortConfig.key === key && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log, index) => {
                  const anomalyCause = log.anomaly_causes?.[0] || {};
                  const isExpanded = expandedLogId === index;
                  
                  return (
                    <React.Fragment key={index}>
                      <tr 
                        className={`anomaly-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleExpandLog(index)}
                      >
                        <td className="expand-cell">
                          <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                        </td>
                        <td className="timestamp-cell">{log.timestamp}</td>
                        <td>{log.hostname}</td>
                        <td>{anomalyCause.device_type || 'N/A'}</td>
                        <td>{log.source}</td>
                        <td className="message-cell">{log.message}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="details-row">
                          <td colSpan="6">
                            <div className="log-details">
                              <div className="detail-section">
                                <h4>Cause:</h4>
                                <p>{anomalyCause.cause || 'Unknown'}</p>
                              </div>
                              <div className="detail-section">
                                <h4>Recommendation:</h4>
                                <p>{anomalyCause.recommendation || 'No recommendation available'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredLogs.length, currentPage * itemsPerPage)} of {filteredLogs.length} logs
            </div>
            <div className="pagination-controls">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="pagination-button first"
                title="First Page"
              >
                ««
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="pagination-button prev"
                title="Previous Page"
              >
                «
              </button>
              {Array.from({ length: Math.min(5, Math.ceil(filteredLogs.length / itemsPerPage)) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLogs.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredLogs.length / itemsPerPage)}
                className="pagination-button next"
                title="Next Page"
              >
                »
              </button>
              <button 
                onClick={() => setCurrentPage(Math.ceil(filteredLogs.length / itemsPerPage))}
                disabled={currentPage === Math.ceil(filteredLogs.length / itemsPerPage)}
                className="pagination-button last"
                title="Last Page"
              >
                »»
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnomalyLogs;