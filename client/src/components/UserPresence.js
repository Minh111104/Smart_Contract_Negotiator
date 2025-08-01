import React, { useState, useEffect } from 'react';

function UserPresence({ users }) {
  if (!users || users.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      backgroundColor: 'white', 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      padding: '1rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '14px' }}>Currently Editing:</h4>
      <div>
        {users.map((user, index) => (
          <div key={user.socketId} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '0.25rem' 
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: user.color, 
              marginRight: '0.5rem' 
            }}></div>
            <span style={{ fontSize: '12px' }}>{user.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserPresence; 