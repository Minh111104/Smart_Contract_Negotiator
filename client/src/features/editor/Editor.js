import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { setContent } from './editorSlice';
import { useAuth } from '../../contexts/AuthContext';
import socket from '../../socket';
import UserPresence from '../../components/UserPresence';
import useDebounce from '../../hooks/useDebounce';
import ShareContract from '../../components/ShareContract';

function Editor() {
  const dispatch = useDispatch();
  const content = useSelector(state => state.editor.content);
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [showShare, setShowShare] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/contracts/${contractId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (res.ok) {
        const contract = await res.json();
        dispatch(setContent(contract.content || ''));
      } else {
        const errorData = await res.json();
        setError(`Failed to load contract: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [contractId, user.token, dispatch]);

  useEffect(() => {
    // Load contract content
    fetchContract();
    
    // Join socket room with username
    socket.emit('join-room', { roomId: contractId, username: user.username });

    // Listen for changes from other users
    socket.on('receive-changes', delta => {
      dispatch(setContent(delta));
    });

    // Listen for user presence events
    socket.on('user-joined', ({ username, socketId }) => {
      setActiveUsers(prev => [...prev, { 
        username, 
        socketId, 
        color: `hsl(${Math.random() * 360}, 70%, 50%)` 
      }]);
    });

    socket.on('user-left', ({ username, socketId }) => {
      setActiveUsers(prev => prev.filter(u => u.socketId !== socketId));
    });

    return () => {
      socket.off('receive-changes');
      socket.off('user-joined');
      socket.off('user-left');
      socket.emit('leave-room', contractId);
    };
  }, [contractId, dispatch, fetchContract, user.username]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    dispatch(setContent(newValue));
    socket.emit('send-changes', { roomId: contractId, delta: newValue });
  };

  const saveContract = useCallback(async () => {
    if (!content.trim()) return; // Don't save empty content
    
    setSaveStatus('saving');
    try {
      const res = await fetch(`http://localhost:5000/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
        setError('Failed to save contract');
      }
    } catch (err) {
      setSaveStatus('error');
      setError('Network error');
    }
  }, [content, contractId, user.token]);

  // Auto-save with debouncing
  useDebounce(saveContract, 2000); // Save 2 seconds after last change

  const handleSave = async () => {
    await saveContract();
  };

  const handleDeleteContract = async () => {
    if (!window.confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
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
        alert('Contract deleted successfully');
        navigate('/dashboard');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to delete contract');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  if (loading) return <div>Loading contract...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <UserPresence users={activeUsers} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Contract Editor</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            fontSize: '12px', 
            color: saveStatus === 'saved' ? '#28a745' : saveStatus === 'saving' ? '#ffc107' : '#dc3545' 
          }}>
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'saving' && '⏳ Saving...'}
            {saveStatus === 'error' && '✗ Save failed'}
          </div>
          <button onClick={handleSave} style={{ marginRight: '1rem' }}>Save</button>
          <button onClick={() => setShowShare(!showShare)} style={{ marginRight: '1rem' }}>
            {showShare ? 'Hide Share' : 'Share'}
          </button>
          <button 
            onClick={handleDeleteContract}
            style={{ 
              marginRight: '1rem',
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
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
      
      <textarea
        value={content}
        onChange={handleChange}
        rows={20}
        cols={80}
        style={{ fontFamily: 'monospace', width: '100%' }}
        placeholder="Start typing your contract..."
      />
      
      {showShare && (
        <ShareContract 
          contractId={contractId} 
          onShare={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

export default Editor; 