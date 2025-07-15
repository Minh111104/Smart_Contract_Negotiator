const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'SECRET_KEY';

const User = require('./models/User');
const Contract = require('./models/Contract');

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

// Create a new contract
app.post('/api/contracts', async (req, res) => {
  try {
    const { title, content, participants } = req.body;
    const contract = new Contract({ title, content, participants });
    await contract.save();
    res.status(201).json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all contracts
app.get('/api/contracts', async (req, res) => {
  try {
    const contracts = await Contract.find().populate('participants', 'username');
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single contract by ID
app.get('/api/contracts/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate('participants', 'username');
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash });
    await user.save();

    // Optionally, auto-login after register:
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
