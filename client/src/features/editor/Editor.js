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
import AIChatbot from '../../components/AIChatbot';
import AIContractAnalysis from '../../components/AIContractAnalysis';
import AISmartTemplates from '../../components/AISmartTemplates';
import RichTextEditor from '../../components/RichTextEditor';
import VersionHistory from '../../components/VersionHistory';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';

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
  const [showAIChatbot, setShowAIChatbot] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showAITemplates, setShowAITemplates] = useState(false);
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
    if (user && user.username && user._id) {
      socket.emit('join-room', { roomId: contractId, username: user.username, userId: user._id });
    }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading contract..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <Alert type="error" title="Error Loading Contract">
            {error}
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserPresence users={activeUsers} />
      <TypingIndicator activeUsers={activeUsers} currentUser={user} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                size="sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Button>
              
              <div className="flex-1 min-w-0">
                <Input
                  value={contractData.title}
                  onChange={(e) => setContractData(prev => ({ ...prev, title: e.target.value }))}
                  onBlur={handleSaveTitle}
                  placeholder="Contract Title"
                  className="text-2xl font-bold border-none bg-transparent p-0 focus:ring-0 focus:border-b-2 focus:border-primary"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Save Status */}
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-1 text-success">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Saved
                  </div>
                )}
                {saveStatus === 'saving' && (
                  <div className="flex items-center gap-1 text-warning">
                    <div className="spinner w-4 h-4"></div>
                    Saving...
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-1 text-error">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Save failed
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSave}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save
                </Button>
                
                <Button
                  variant={showShare ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShowShare(!showShare)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share
                </Button>
                
                <Button
                  variant={showAISuggestions ? 'primary' : 'warning'}
                  size="sm"
                  onClick={() => setShowAISuggestions(!showAISuggestions)}
                  title="AI Clause Suggestions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI
                </Button>
                
                <Button
                  variant={showAIChatbot ? 'primary' : 'info'}
                  size="sm"
                  onClick={() => setShowAIChatbot(!showAIChatbot)}
                  title="AI Chat Assistant"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat
                </Button>
                
                <Button
                  variant={showAIAnalysis ? 'primary' : 'success'}
                  size="sm"
                  onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                  title="AI Contract Analysis"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Analyze
                </Button>
                
                <Button
                  variant={showAITemplates ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShowAITemplates(!showAITemplates)}
                  title="AI Smart Templates"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Templates
                </Button>
                
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setShowExport(!showExport)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </Button>
                
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </Button>
                
                <Button
                  variant="info"
                  size="sm"
                  onClick={handleCreateVersion}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Version
                </Button>
                
                <Button
                  variant="error"
                  size="sm"
                  onClick={handleDeleteContract}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Editor Area */}
      <div className="container py-4 md:py-6">
        <Card className="min-h-[400px] md:min-h-[600px]">
          <div className="relative h-full">
            <RichTextEditor
              value={content}
              onChange={handleChange}
              placeholder="Start typing your contract..."
            />
          </div>
        </Card>
      </div>
      
      {/* Modals */}
      {showShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <Card className="max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <ShareContract 
              contractId={contractId} 
              onShare={() => setShowShare(false)}
            />
          </Card>
        </div>
      )}
      
      {showAISuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <Card className="max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <AIClauseSuggestions 
              currentContent={content}
              onInsertClause={handleInsertClause}
            />
          </Card>
        </div>
      )}
      
      {showAIChatbot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full h-[85vh] overflow-hidden bg-white rounded-lg shadow-xl flex flex-col">
            <AIChatbot 
              contractId={contractId}
              onClose={() => setShowAIChatbot(false)}
            />
          </div>
        </div>
      )}
      
      {showAIAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl">
            <AIContractAnalysis 
              contractContent={content}
              onClose={() => setShowAIAnalysis(false)}
            />
          </div>
        </div>
      )}
      
      {showAITemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl">
            <AISmartTemplates 
              onClose={() => setShowAITemplates(false)}
              onUseTemplate={(template) => {
                const newContent = content + (content ? '<br><br>' : '') + template;
                dispatch(setContent(newContent));
                socket.emit('send-changes', { roomId: contractId, delta: newContent });
                setShowAITemplates(false);
              }}
            />
          </div>
        </div>
      )}
      
      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <Card className="max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <ExportOptions 
              contractTitle={contractData.title}
              contractContent={content}
              participants={contractData.participants}
              onClose={() => setShowExport(false)}
            />
          </Card>
        </div>
      )}
      
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <Card className="max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <VersionHistory 
              contractId={contractId}
              refreshKey={refreshKey}
              onClose={() => setShowVersionHistory(false)}
            />
          </Card>
        </div>
      )}
      
    </div>
  );
}

export default Editor; 