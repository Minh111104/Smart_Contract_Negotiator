import React, { useState } from 'react';

function ShareContract({ contractId, onShare }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleShare = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/contracts/${contractId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setUsername('');
        if (onShare) onShare();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      padding: '1rem', 
      marginTop: '1rem' 
    }}>
      <h3>Share Contract</h3>
      <form onSubmit={handleShare}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username to share with"
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading || !username.trim()}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Sharing...' : 'Share'}
        </button>
      </form>
      
      {message && (
        <div style={{ color: '#28a745', marginTop: '0.5rem' }}>
          {message}
        </div>
      )}
      
      {error && (
        <div style={{ color: '#dc3545', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default ShareContract; 