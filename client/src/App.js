import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setContent } from './features/editor/editorSlice';
import socket from './socket';

function App() {
  const dispatch = useDispatch();
  const content = useSelector(state => state.editor.content);
  const roomId = 'test-room-1';

  useEffect(() => {
    socket.emit('join-room', roomId);

    socket.on('receive-changes', delta => {
      dispatch(setContent(delta));
    });

    return () => {
      socket.off('receive-changes');
    };
  }, [dispatch]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    dispatch(setContent(newValue));
    socket.emit('send-changes', { roomId, delta: newValue });
  };

  return (
    <div className="App" style={{ padding: '2rem' }}>
      <h1>Smart Contract Editor</h1>
      <textarea
        value={content}
        onChange={handleChange}
        rows={20}
        cols={80}
        style={{ fontFamily: 'monospace' }}
      />
    </div>
  );
}

export default App;
