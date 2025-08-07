import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { exportContractToPDF, exportContractAsText } from '../../utils/pdfExport';
import TemplateSelector from '../../components/TemplateSelector';

function Dashboard() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const fetchContracts = useCallback(async () => {
    if (!user || !user.token) return;
    
    try {
      const res = await fetch('http://localhost:5000/api/contracts', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      } else {
        setError('Failed to fetch contracts');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (user && user.token) {
      fetchContracts();
    } else {
      setLoading(false);
    }
  }, [fetchContracts, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const createNewContract = async (template = null) => {
    if (!user || !user.token) return;
    
    try {
      const res = await fetch('http://localhost:5000/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          title: template ? template.title : 'New Contract',
          content: template ? template.content : ''
        })
      });
      
      if (res.ok) {
        const newContract = await res.json();
        navigate(`/editor/${newContract._id}`);
      } else {
        const errorData = await res.json();
        setError(`Failed to create contract: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError('Failed to create contract');
    }
  };

  const handleTemplateSelect = (template) => {
    createNewContract(template);
  };

  const handleDeleteContract = async (contractId, contractTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${contractTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/contracts/${contractId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (res.ok) {
        // Remove the contract from the local state
        setContracts(prev => prev.filter(contract => contract._id !== contractId));
        alert('Contract deleted successfully');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to delete contract');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleExportContract = async (contract) => {
    const exportType = window.confirm('Export as PDF? Click OK for PDF, Cancel for Text file.') ? 'pdf' : 'text';
    
    try {
      let result;
      
      if (exportType === 'pdf') {
        result = await exportContractToPDF(contract.title, contract.content, contract.participants);
      } else {
        result = exportContractAsText(contract.title, contract.content);
      }
      
      if (result.success) {
        alert(`${exportType.toUpperCase()} exported successfully!`);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  // Add safety check for user object after all hooks
  if (!user || !user.token) {
    return <div>Please log in to access the dashboard.</div>;
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <div>
          <span>Welcome, {user.username || 'User'}!</span>
          <button onClick={handleLogout} style={{ marginLeft: '1rem' }}>Logout</button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <button onClick={() => createNewContract()} style={{ marginRight: '1rem' }}>
          Create New Contract
        </button>
        <button 
          onClick={() => setShowTemplates(!showTemplates)}
          style={{ 
            backgroundColor: '#17a2b8', 
            color: 'white', 
            border: 'none', 
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showTemplates ? 'Hide Templates' : 'Use Template'}
        </button>
      </div>

      {showTemplates && (
        <TemplateSelector 
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <h2>Your Contracts</h2>
      {contracts.length === 0 ? (
        <p>No contracts yet. Create your first one!</p>
      ) : (
        <div>
          {contracts.map(contract => (
            <div key={contract._id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
              <h3>{contract.title}</h3>
              <p>Last edited: {new Date(contract.lastEdited).toLocaleDateString()}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => navigate(`/editor/${contract._id}`)}>
                  Open Editor
                </button>
                <button 
                  onClick={() => handleExportContract(contract)}
                  style={{ 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Export
                </button>
                <button 
                  onClick={() => handleDeleteContract(contract._id, contract.title)}
                  style={{ 
                    backgroundColor: '#dc3545', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard; 