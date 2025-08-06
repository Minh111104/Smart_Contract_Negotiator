import React, { useState, useEffect } from 'react';

function TypingIndicator({ activeUsers, currentUser }) {
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    const handleTyping = ({ socketId, username, isTyping }) => {
      if (socketId === window.socket?.id) return; // Don't show own typing
      
      if (isTyping) {
        setTypingUsers(prev => {
          if (!prev.find(user => user.socketId === socketId)) {
            return [...prev, { socketId, username }];
          }
          return prev;
        });
      } else {
        setTypingUsers(prev => prev.filter(user => user.socketId !== socketId));
      }
    };

    if (window.socket) {
      window.socket.on('user-typing', handleTyping);
    }

    return () => {
      if (window.socket) {
        window.socket.off('user-typing', handleTyping);
      }
    };
  }, []);

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '12px',
      zIndex: 1000
    }}>
      {typingUsers.length === 1 ? (
        <span>{typingUsers[0].username} is typing...</span>
      ) : (
        <span>{typingUsers.map(u => u.username).join(', ')} are typing...</span>
      )}
    </div>
  );
}

export default TypingIndicator; 