const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Contract = require('./models/Contract');
const authMiddleware = require('./middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/contractdb');

// Express app setup
const app = express();
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());

// HTTP server and Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// --- Socket.IO events ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    console.log(`Socket ${socket.id} (${username}) joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', { username, socketId: socket.id });
  });

  socket.on('send-changes', async ({ roomId, delta }) => {
    // Broadcast to other users in the room
    socket.to(roomId).emit('receive-changes', delta);
    
    // Update the contract in the database
    try {
      await Contract.findByIdAndUpdate(roomId, { 
        content: delta,
        lastEdited: new Date()
      });
    } catch (error) {
      console.error('Error updating contract:', error);
    }
  });

  socket.on('cursor-move', ({ roomId, position, username }) => {
    socket.to(roomId).emit('cursor-update', { 
      socketId: socket.id, 
      position, 
      username 
    });
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-left', { 
        username: socket.username, 
        socketId: socket.id 
      });
    }
    console.log('A user disconnected:', socket.id);
  });
});

// --- Basic route ---
app.get('/', (req, res) => {
  res.send('Smart Contract Negotiator API is running');
});

// --- Authentication routes ---
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );
    res.status(201).json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Contract routes (protected) ---
app.post('/api/contracts', authMiddleware, async (req, res) => {
  try {
    const { title, content, participants } = req.body;
    const contract = new Contract({ 
      title, 
      content: content || '', 
      participants: participants || [req.user._id] 
    });
    await contract.save();
    res.status(201).json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/contracts', authMiddleware, async (req, res) => {
  try {
    const contracts = await Contract.find({
      participants: req.user._id
    }).populate('participants', 'username');
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contracts/:id', authMiddleware, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('participants', 'username');
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Check if user is a participant - handle both ObjectId and populated User objects
    const isParticipant = contract.participants.some(p => {
      const participantId = p._id ? p._id.toString() : p.toString();
      return participantId === req.user._id.toString();
    });
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contracts/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Check if user is a participant - handle both ObjectId and populated User objects
    const isParticipant = contract.participants.some(p => {
      const participantId = p._id ? p._id.toString() : p.toString();
      return participantId === req.user._id.toString();
    });
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    contract.content = content;
    contract.lastEdited = new Date();
    await contract.save();
    
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share contract with another user
app.post('/api/contracts/:id/share', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Check if user is a participant
    const isParticipant = contract.participants.some(p => {
      const participantId = p._id ? p._id.toString() : p.toString();
      return participantId === req.user._id.toString();
    });
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Find the user to share with
    const userToShare = await User.findOne({ username });
    if (!userToShare) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is already a participant
    if (contract.participants.some(p => p.toString() === userToShare._id.toString())) {
      return res.status(400).json({ error: 'User is already a participant' });
    }
    
    // Add user to participants
    contract.participants.push(userToShare._id);
    await contract.save();
    
    res.json({ message: `Contract shared with ${username}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contract
app.delete('/api/contracts/:id', authMiddleware, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Check if user is a participant
    const isParticipant = contract.participants.some(p => {
      const participantId = p._id ? p._id.toString() : p.toString();
      return participantId === req.user._id.toString();
    });
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete the contract
    await Contract.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Contract deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
