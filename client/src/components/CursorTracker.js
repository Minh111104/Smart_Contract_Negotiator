import React, { useEffect, useRef } from 'react';

function CursorTracker({ textareaRef, activeUsers, currentUser }) {
  const cursorsRef = useRef({});

  useEffect(() => {
    const handleCursorMove = (e) => {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate cursor position in text
      const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
      const lines = textBeforeCursor.split('\n');
      const lineNumber = lines.length - 1;
      const columnNumber = lines[lines.length - 1].length;
      
      // Emit cursor position to other users
      if (window.socket) {
        window.socket.emit('cursor-move', {
          roomId: window.currentRoomId,
          position: { x, y, lineNumber, columnNumber },
          username: currentUser.username
        });
      }
    };

    const handleCursorUpdate = ({ socketId, position, username }) => {
      if (socketId === window.socket?.id) return; // Don't show own cursor
      
      const cursorElement = cursorsRef.current[socketId];
      if (cursorElement) {
        cursorElement.style.left = `${position.x}px`;
        cursorElement.style.top = `${position.y}px`;
        cursorElement.style.display = 'block';
      }
    };

    const handleTyping = ({ socketId, username, isTyping }) => {
      if (socketId === window.socket?.id) return; // Don't show own typing
      
      const cursorElement = cursorsRef.current[socketId];
      if (cursorElement) {
        if (isTyping) {
          cursorElement.style.opacity = '1';
        } else {
          cursorElement.style.opacity = '0.5';
        }
      }
    };

    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.addEventListener('mousemove', handleCursorMove);
      textarea.addEventListener('click', handleCursorMove);
      textarea.addEventListener('keyup', handleCursorMove);
      
      if (window.socket) {
        window.socket.on('cursor-update', handleCursorUpdate);
        window.socket.on('user-typing', handleTyping);
      }
    }

    return () => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.removeEventListener('mousemove', handleCursorMove);
        textarea.removeEventListener('click', handleCursorMove);
        textarea.removeEventListener('keyup', handleCursorMove);
      }
      
      if (window.socket) {
        window.socket.off('cursor-update', handleCursorUpdate);
        window.socket.off('user-typing', handleTyping);
      }
    };
  }, [textareaRef, currentUser]);

  // Create cursor elements for each active user
  useEffect(() => {
    activeUsers.forEach(user => {
      if (user.socketId === window.socket?.id) return; // Don't create cursor for self
      
      if (!cursorsRef.current[user.socketId]) {
        const cursorElement = document.createElement('div');
        cursorElement.style.position = 'absolute';
        cursorElement.style.width = '2px';
        cursorElement.style.height = '20px';
        cursorElement.style.backgroundColor = user.color;
        cursorElement.style.pointerEvents = 'none';
        cursorElement.style.zIndex = '1000';
        cursorElement.style.transition = 'opacity 0.3s ease';
        cursorElement.style.display = 'none';
        
        // Add username label
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.top = '-20px';
        label.style.left = '5px';
        label.style.backgroundColor = user.color;
        label.style.color = 'white';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '3px';
        label.style.fontSize = '10px';
        label.style.whiteSpace = 'nowrap';
        label.textContent = user.username;
        cursorElement.appendChild(label);
        
        cursorsRef.current[user.socketId] = cursorElement;
        
        if (textareaRef.current) {
          textareaRef.current.parentElement.style.position = 'relative';
          textareaRef.current.parentElement.appendChild(cursorElement);
        }
      }
    });
  }, [activeUsers, textareaRef]);

  return null; // This component doesn't render anything visible
}

export default CursorTracker; 