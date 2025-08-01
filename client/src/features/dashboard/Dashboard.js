import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Dashboard() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const createNewContract = async () => {
    if (!user || !user.token) return;
    
    try {
      const res = await fetch('http://localhost:5000/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          title: 'New Contract',
          content: '',
          participants: []
        })
      });
      if (res.ok) {
        const newContract = await res.json();
        navigate(`/editor/${newContract._id}`);
      }
    } catch (err) {
      setError('Failed to create contract');
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

      <button onClick={createNewContract} style={{ marginBottom: '2rem' }}>
        Create New Contract
      </button>

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
              <button onClick={() => navigate(`/editor/${contract._id}`)}>
                Open Editor
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard; 