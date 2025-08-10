import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { setContent } from './editorSlice';
import { useAuth } from '../../contexts/AuthContext';
import socket from '../../socket';
import UserPresence from '../../components/UserPresence';
import useDebounce from '../../hooks/useDebounce';
import ShareContract from '../../components/ShareContract';
import ExportOptions from '../../components/ExportOptions';

import TypingIndicator from '../../components/TypingIndicator';
import AIClauseSuggestions from '../../components/AIClauseSuggestions';
import RichTextEditor from '../../components/RichTextEditor';
import VersionHistory from '../../components/VersionHistory';

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
  const [showExport, setShowExport] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for version history
  const [contractData, setContractData] = useState({ title: '', participants: [] });

  const [isTyping, setIsTyping] = useState(false);

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
        setContractData({
          title: contract.title,
          participants: contract.participants || []
        });
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
    socket.emit('join-room', { roomId: contractId, username: user.username, userId: user._id });

    // Store socket and room info globally for cursor tracking
    window.socket = socket;
    window.currentRoomId = contractId;

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
      delete window.socket;
      delete window.currentRoomId;
    };
  }, [contractId, dispatch, fetchContract, user.username]);

  const handleChange = (newValue) => {
    dispatch(setContent(newValue));
    socket.emit('send-changes', { roomId: contractId, delta: newValue });
    
    // Emit typing indicators
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing-start', { roomId: contractId, username: user.username });
      
      // Stop typing indicator after 2 seconds of no input
      setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing-stop', { roomId: contractId, username: user.username });
      }, 2000);
    }
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

  const handleInsertClause = (clause) => {
    const newContent = content + '<br><br>' + clause;
    dispatch(setContent(newContent));
    socket.emit('send-changes', { roomId: contractId, delta: newContent });
  };

  const handleSaveTitle = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          title: contractData.title,
          content: content
        })
      });
      
      if (response.ok) {
        console.log('Title updated successfully');
      } else {
        console.error('Failed to update title');
      }
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const handleCreateVersion = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/contracts/${contractId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          content: content,
          title: contractData.title,
          changeDescription: 'Manual version created'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('Version created successfully!');
        const newRefreshKey = refreshKey + 1;
        setRefreshKey(newRefreshKey); // Trigger refresh for version history
      } else {
        const errorData = await response.text();
        console.error('Failed to create version:', response.status, errorData);
        alert('Failed to create version');
      }
    } catch (error) {
      console.error('Error creating version:', error);
      alert('Error creating version');
    }
  };

  if (loading) return <div>Loading contract...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <UserPresence users={activeUsers} />
      <TypingIndicator activeUsers={activeUsers} currentUser={user} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>Contract Editor</h1>
          <input
            type="text"
            value={contractData.title}
            onChange={(e) => setContractData(prev => ({ ...prev, title: e.target.value }))}
            onBlur={handleSaveTitle}
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              border: 'none',
              borderBottom: '2px solid #e2e8f0',
              padding: '0.5rem',
              backgroundColor: 'transparent',
              outline: 'none'
            }}
            placeholder="Contract Title"
          />
        </div>
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
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            style={{ 
              marginRight: '1rem',
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showAISuggestions ? 'Hide AI' : 'AI Suggestions'}
          </button>
          <button 
            onClick={() => setShowExport(!showExport)}
            style={{ 
              marginRight: '1rem',
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
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            style={{ 
              marginRight: '1rem',
              backgroundColor: '#6f42c1', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Version History
          </button>
          <button 
            onClick={handleCreateVersion}
            style={{ 
              marginRight: '1rem',
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Version
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
      
      <div style={{ position: 'relative' }}>
        <RichTextEditor
          value={content}
          onChange={handleChange}
          placeholder="Start typing your contract..."
        />
      </div>
      
      {showShare && (
        <ShareContract 
          contractId={contractId} 
          onShare={() => setShowShare(false)}
        />
      )}
      
      {showAISuggestions && (
        <AIClauseSuggestions 
          currentContent={content}
          onInsertClause={handleInsertClause}
        />
      )}
      
      {showExport && (
        <ExportOptions 
          contractTitle={contractData.title}
          contractContent={content}
          participants={contractData.participants}
          onClose={() => setShowExport(false)}
        />
      )}
      
      {showVersionHistory && (
        <VersionHistory 
          contractId={contractId}
          refreshKey={refreshKey} // Pass refresh key
          onClose={() => setShowVersionHistory(false)}
        />
      )}
      
    </div>
  );
}

export default Editor; 