const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/contractdb');

// Express app setup
const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// HTTP server and Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// --- Socket.IO events ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('send-changes', ({ roomId, delta }) => {
    socket.to(roomId).emit('receive-changes', delta);
    // You will later add DB update logic here
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// --- Example REST routes ---
app.get('/', (req, res) => {
  res.send('API is running');
});

// Placeholder for user and contract routes
app.get('/api/contracts', (req, res) => {
  res.json([{ id: 1, title: 'Sample Contract' }]);
});

app.get('/api/users', (req, res) => {
  res.json([{ id: 1, username: 'alice' }]);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
