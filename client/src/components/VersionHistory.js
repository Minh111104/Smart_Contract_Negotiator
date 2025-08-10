import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { generateSimpleDiff, formatDiffForDisplay } from '../utils/diffUtils';
import './VersionHistory.css';

const VersionHistory = ({ contractId, onClose, refreshKey }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const { token } = useAuth();

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost:5000/api/contracts/${contractId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch versions:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  }, [contractId, token, refreshKey]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Add manual refresh function
  const handleManualRefresh = () => {
    fetchVersions();
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    setShowDiff(false);
    setDiffResult(null);
  };

  const handleShowDiff = () => {
    if (!showDiff && selectedVersion && versions.length > 1) {
      // Find the previous version for comparison
      const currentIndex = versions.findIndex(v => v._id === selectedVersion._id);
      const previousVersion = versions[currentIndex + 1]; // versions are sorted desc
      
      if (previousVersion) {
        const diff = generateSimpleDiff(previousVersion.content, selectedVersion.content);
        setDiffResult(diff);
      }
    }
    setShowDiff(!showDiff);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="version-history-modal">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading versions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="version-history-modal">
      <div className="version-history-content">
        <div className="version-history-header">
          <h2 className="version-history-title">Version History</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={handleManualRefresh}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={onClose}
              className="version-history-close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="version-history-body">
          {/* Version List */}
          <div className="version-list">
            <div className="version-list-content">
              <h3 className="version-list-title">Versions</h3>
              {versions.length === 0 ? (
                <p className="no-versions">No versions found</p>
              ) : (
                <div>
                  {versions.map((version) => (
                    <div
                      key={version._id}
                      onClick={() => handleVersionSelect(version)}
                      className={`version-item ${
                        selectedVersion?._id === version._id ? 'selected' : ''
                      }`}
                    >
                      <div className="version-item-header">
                        <div>
                          <p className="version-number">v{version.version}</p>
                          <p className="version-description">
                            {version.changeDescription}
                          </p>
                        </div>
                        <span className="version-date">
                          {formatDate(version.createdAt)}
                        </span>
                      </div>
                      <p className="version-author">
                        by {version.createdBy?.username || 'Unknown'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Version Content */}
          <div className="version-content">
            {selectedVersion ? (
              <div>
                <div className="version-content-header">
                  <div>
                    <h3 className="version-content-title">
                      Version {selectedVersion.version}
                    </h3>
                    <p className="version-content-meta">
                      {formatDate(selectedVersion.createdAt)} • 
                      by {selectedVersion.createdBy?.username || 'Unknown'}
                    </p>
                  </div>
                  <button
                    onClick={handleShowDiff}
                    disabled={versions.length <= 1}
                    className={`diff-button ${
                      versions.length <= 1 ? 'disabled' : 'enabled'
                    }`}
                  >
                    {showDiff ? 'Hide Diff' : 'Show Diff'}
                  </button>
                </div>

                {showDiff ? (
                  <div className="diff-content">
                    <h4 className="diff-title">Changes from previous version</h4>
                    {diffResult ? (
                      <div 
                        className="text-sm"
                        dangerouslySetInnerHTML={{ __html: formatDiffForDisplay(diffResult) }}
                      />
                    ) : (
                      <p className="text-sm text-gray-600">Loading diff...</p>
                    )}
                  </div>
                ) : (
                  <div className="diff-content">
                    <h4 className="diff-title">Content</h4>
                    <div 
                      className="prose"
                      dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="select-version">
                <p>Select a version to view its content</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
