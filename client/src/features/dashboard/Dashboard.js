import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { exportContractToPDF, exportContractAsText } from '../../utils/pdfExport';
import TemplateSelector from '../../components/TemplateSelector';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your contracts..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your contracts and collaborate with your team</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Welcome back,</p>
                <p className="font-medium text-gray-900">{user.username || 'User'}</p>
              </div>
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button onClick={() => createNewContract()} size="lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Contract
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowTemplates(!showTemplates)}
            size="lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showTemplates ? 'Hide Templates' : 'Use Template'}
          </Button>
        </div>

        {showTemplates && (
          <TemplateSelector 
            onSelectTemplate={handleTemplateSelect}
            onClose={() => setShowTemplates(false)}
          />
        )}

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Search and Filter Section */}
        <Card className="mb-8">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Search Contracts"
                placeholder="Search by title or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                rightIcon={
                  searchTerm ? (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )
                }
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input"
              >
                <option value="all">All Categories</option>
                <option value="legal">Legal</option>
                <option value="business">Business</option>
                <option value="employment">Employment</option>
                <option value="nda">NDA</option>
              </select>
            </div>
          </div>
          
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-600">
              Found {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''} 
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </Card>

        {/* Bulk Operations Section */}
        {filteredContracts.length > 0 && (
          <Card className="mb-8 bg-gray-50">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="font-medium text-gray-700">
                  Select All ({filteredContracts.length})
                </span>
              </label>
              
              {selectedContracts.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {selectedContracts.length} selected
                  </span>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleBulkExport}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Selected
                  </Button>
                  <Button
                    variant="error"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Contracts Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Contracts</h2>
          
          {filteredContracts.length === 0 ? (
            <Card className="text-center py-12">
              <div className="flex flex-col items-center">
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {contracts.length === 0 
                    ? 'No contracts yet' 
                    : searchTerm 
                      ? 'No contracts found' 
                      : 'No contracts in this category'
                  }
                </h3>
                <p className="text-gray-500 mb-6">
                  {contracts.length === 0 
                    ? 'Create your first contract to get started!' 
                    : searchTerm 
                      ? `No contracts match "${searchTerm}"` 
                      : 'Try selecting a different category'
                  }
                </p>
                {contracts.length === 0 && (
                  <Button onClick={() => createNewContract()}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Contract
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredContracts.map(contract => (
                <Card key={contract._id} hover className="transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedContracts.includes(contract._id)}
                      onChange={() => handleSelectContract(contract._id)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                            {contract.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Last edited: {new Date(contract.lastEdited).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {contract.participants?.length || 0} participant{(contract.participants?.length || 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/editor/${contract._id}`)}
                          size="sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Open Editor
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleExportContract(contract)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export
                        </Button>
                        <Button
                          variant="error"
                          size="sm"
                          onClick={() => handleDeleteContract(contract._id, contract.title)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 