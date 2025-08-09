import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { exportContractToPDF, exportContractAsText } from '../../utils/pdfExport';
import TemplateSelector from '../../components/TemplateSelector';

function Dashboard() {
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
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
  }, [user]);

  useEffect(() => {
    if (user && user.token) {
      fetchContracts();
    } else {
      setLoading(false);
    }
  }, [fetchContracts, user]);

  // Filter contracts based on search term and category
  useEffect(() => {
    let filtered = contracts;
    
    // Filter by search term (title or content)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contract => 
        contract.title.toLowerCase().includes(term) ||
        (contract.content && contract.content.toLowerCase().includes(term))
      );
    }
    
    // Filter by category (if we add categories later)
    if (filterCategory !== 'all') {
      filtered = filtered.filter(contract => 
        contract.category === filterCategory
      );
    }
    
    setFilteredContracts(filtered);
  }, [contracts, searchTerm, filterCategory]);

  // Handle select all functionality
  useEffect(() => {
    if (selectAll) {
      setSelectedContracts(filteredContracts.map(contract => contract._id));
    } else {
      setSelectedContracts([]);
    }
  }, [selectAll, filteredContracts]);

  // Clear selections when search/filter changes
  useEffect(() => {
    setSelectedContracts([]);
    setSelectAll(false);
  }, [searchTerm, filterCategory]);

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

  // Bulk operations
  const handleSelectContract = (contractId) => {
    setSelectedContracts(prev => 
      prev.includes(contractId) 
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedContracts.length === 0) return;
    
    const contractNames = contracts
      .filter(contract => selectedContracts.includes(contract._id))
      .map(contract => contract.title);
    
    if (!window.confirm(`Are you sure you want to delete ${selectedContracts.length} contract(s)?\n\n${contractNames.join('\n')}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = selectedContracts.map(contractId =>
        fetch(`http://localhost:5000/api/contracts/${contractId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        })
      );

      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter(res => !res.ok);
      
      if (failedDeletes.length === 0) {
        // Remove deleted contracts from local state
        setContracts(prev => prev.filter(contract => !selectedContracts.includes(contract._id)));
        setSelectedContracts([]);
        setSelectAll(false);
        alert(`${selectedContracts.length} contract(s) deleted successfully`);
      } else {
        alert(`Failed to delete ${failedDeletes.length} contract(s). Please try again.`);
      }
    } catch (err) {
      alert('Network error during bulk delete');
    }
  };

  const handleBulkExport = async () => {
    if (selectedContracts.length === 0) return;
    
    try {
      const selectedContractData = contracts.filter(contract => 
        selectedContracts.includes(contract._id)
      );
      
      // Export each selected contract
      for (const contract of selectedContractData) {
        await exportContractToPDF(contract.title, contract.content, contract.participants);
      }
      
      alert(`${selectedContracts.length} contract(s) exported successfully`);
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

      {/* Search and Filter Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search contracts by title or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                paddingRight: searchTerm ? '2.5rem' : '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#666'
                }}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Categories</option>
            <option value="legal">Legal</option>
            <option value="business">Business</option>
            <option value="employment">Employment</option>
            <option value="nda">NDA</option>
          </select>
        </div>
        
        {searchTerm && (
          <div style={{ fontSize: '14px', color: '#666' }}>
            Found {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''} 
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </div>

      {/* Bulk Operations Section */}
      {filteredContracts.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => setSelectAll(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500' }}>Select All ({filteredContracts.length})</span>
            </label>
            
            {selectedContracts.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '14px', color: '#666', alignSelf: 'center' }}>
                  {selectedContracts.length} selected
                </span>
                <button
                  onClick={handleBulkExport}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Export Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <h2>Your Contracts</h2>
      {filteredContracts.length === 0 ? (
        <p>
          {contracts.length === 0 
            ? 'No contracts yet. Create your first one!' 
            : searchTerm 
              ? `No contracts found matching "${searchTerm}"` 
              : 'No contracts in this category'
          }
        </p>
      ) : (
        <div>
          {filteredContracts.map(contract => (
            <div key={contract._id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <input
                  type="checkbox"
                  checked={selectedContracts.includes(contract._id)}
                  onChange={() => handleSelectContract(contract._id)}
                  style={{ cursor: 'pointer', marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard; 