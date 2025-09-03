const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Contract = require('./models/Contract');
const ContractVersion = require('./models/ContractVersion');
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

  socket.on('join-room', async ({ roomId, username, userId }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    // Ensure we have a valid userId, fallback to lookup by username
    if (userId) {
      socket.userId = userId;
    } else if (username) {
      try {
        const u = await User.findOne({ username }).select('_id');
        if (u) socket.userId = u._id.toString();
      } catch (e) {
        // ignore
      }
    }
    console.log(`Socket ${socket.id} (${username}) joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', { username, socketId: socket.id });
  });

  socket.on('send-changes', async ({ roomId, delta }) => {
    // Update the contract in the database
    try {
      const contract = await Contract.findById(roomId);
      if (contract) {
        // Enforce role-based permissions: only owner/editor can edit
        const participant = Array.isArray(contract.participants)
          ? contract.participants.find(p => {
              const pUser = p.user || p; // support legacy ObjectId arrays
              return pUser?.toString() === (socket.userId || '').toString();
            })
          : null;
        const role = participant && participant.role ? participant.role : (participant ? 'editor' : null);
        if (role === 'owner' || role === 'editor') {
          contract.content = delta;
          contract.lastEdited = new Date();
          await contract.save();
          // Broadcast to other users in the room only if edit was allowed
          socket.to(roomId).emit('receive-changes', delta);
        } else {
          // If viewer or not a participant, ignore persistence
          return;
        }
        
        // Create a new version every 10 changes (you can adjust this threshold)
        if (contract.currentVersion % 10 === 0) {
          const newVersion = new ContractVersion({
            contractId: roomId,
            version: contract.currentVersion + 1,
            content: delta,
            title: contract.title,
            createdBy: socket.userId || '000000000000000000000000',
            changeDescription: 'Auto-saved version',
            participants: (contract.participants || []).map(p => p.user ? p.user : p)
          });
          await newVersion.save();
          
          contract.currentVersion = newVersion.version;
          await contract.save();
        }
      }
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

  socket.on('typing-start', ({ roomId, username }) => {
    socket.to(roomId).emit('user-typing', { 
      socketId: socket.id, 
      username, 
      isTyping: true 
    });
  });

  socket.on('typing-stop', ({ roomId, username }) => {
    socket.to(roomId).emit('user-typing', { 
      socketId: socket.id, 
      username, 
      isTyping: false 
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
    const { title, content } = req.body;
    const contract = new Contract({
      title,
      content: content || '',
      participants: [{ user: req.user._id, role: 'owner' }]
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
      $or: [
        { participants: req.user._id }, // legacy
        { 'participants.user': req.user._id } // new structure
      ]
    }).populate({ path: 'participants.user', select: 'username' });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contracts/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Contract access request for:', req.params.id);
    console.log('User requesting access:', { _id: req.user._id, username: req.user.username });
    
    const contract = await Contract.findById(req.params.id)
      .populate({ path: 'participants.user', select: 'username' });
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Check if user is a participant - support both legacy and new structure
    const isParticipant = contract.participants.some(p => {
      if (p?.user) {
        // Handle populated user object (when using .populate())
        let participantUserId;
        if (typeof p.user === 'object' && p.user._id) {
          // User is populated, extract the _id
          participantUserId = p.user._id.toString();
        } else {
          // User is just the ObjectId
          participantUserId = p.user.toString();
        }
        return participantUserId === req.user._id.toString();
      }
      const participantId = p?._id ? p._id.toString() : p?.toString();
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
    const { content, title } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Determine role for current user
    const participantEntry = contract.participants.find(p => {
      if (p?.user) return p.user.toString() === req.user._id.toString();
      const id = p?._id ? p._id.toString() : p?.toString();
      return id === req.user._id.toString();
    });
    if (!participantEntry) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const role = participantEntry.role || 'editor'; // legacy participants treated as editor
    // Only owner/editor can modify content/title
    if (!(role === 'owner' || role === 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    if (typeof content === 'string') {
      contract.content = content;
    }
    if (typeof title === 'string') {
      contract.title = title;
    }
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
    const { username, role } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Only owner can share or change roles
    const me = contract.participants.find(p => {
      if (p?.user) return p.user.toString() === req.user._id.toString();
      const id = p?._id ? p._id.toString() : p?.toString();
      return id === req.user._id.toString();
    });
    const myRole = me?.role || 'editor';
    if (myRole !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can share or change roles' });
    }
    
    // Find the user to share with
    const userToShare = await User.findOne({ username });
    if (!userToShare) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Normalize desired role
    const desiredRole = ['owner', 'editor', 'viewer'].includes((role || '').toLowerCase())
      ? role.toLowerCase()
      : 'viewer';

    // If already participant, update role; else add
    const existingIdx = contract.participants.findIndex(p => {
      if (p?.user) return p.user.toString() === userToShare._id.toString();
      const id = p?._id ? p._id.toString() : p?.toString();
      return id === userToShare._id.toString();
    });
    if (existingIdx >= 0) {
      contract.participants[existingIdx] = { user: userToShare._id, role: desiredRole };
    } else {
      contract.participants.push({ user: userToShare._id, role: desiredRole });
    }
    await contract.save();
    
    res.json({ message: `Contract shared with ${username} as ${desiredRole}` });
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
    
    // Only owner can delete
    const me = contract.participants.find(p => {
      if (p?.user) return p.user.toString() === req.user._id.toString();
      const id = p?._id ? p._id.toString() : p?.toString();
      return id === req.user._id.toString();
    });
    const myRole = me?.role || 'editor';
    if (myRole !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can delete this contract' });
    }
    
    // Delete the contract
    await Contract.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Contract deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Version History routes ---
app.get('/api/contracts/:id/versions', authMiddleware, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Any participant (owner/editor/viewer) can view versions
    const isParticipant = contract.participants.some(p => {
      if (p?.user) return p.user.toString() === req.user._id.toString();
      const participantId = p?._id ? p._id.toString() : p?.toString();
      return participantId === req.user._id.toString();
    });
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const versions = await ContractVersion.find({ contractId: req.params.id })
      .populate('createdBy', 'username')
      .sort({ version: -1 });
    
    res.json(versions);
  } catch (err) {
    console.error('Error fetching versions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contracts/:id/versions', authMiddleware, async (req, res) => {
  try {
    const { content, title, changeDescription } = req.body;
    
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Only owner/editor can create versions
    const me = contract.participants.find(p => {
      if (p?.user) return p.user.toString() === req.user._id.toString();
      const id = p?._id ? p._id.toString() : p?.toString();
      return id === req.user._id.toString();
    });
    const myRole = me?.role || 'editor';
    if (!(myRole === 'owner' || myRole === 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Ensure currentVersion exists, default to 1 if not
    const currentVersion = contract.currentVersion || 1;
    
    // Create new version
    const newVersion = new ContractVersion({
      contractId: req.params.id,
      version: currentVersion + 1,
      content: content || contract.content,
      title: title || contract.title,
      createdBy: req.user._id,
      changeDescription: changeDescription || 'Auto-saved version',
      participants: (contract.participants || []).map(p => p.user ? p.user : p)
    });
    
    await newVersion.save();
    
    // Update contract's current version
    contract.currentVersion = newVersion.version;
    await contract.save();
    
    res.status(201).json(newVersion);
  } catch (err) {
    console.error('Error creating version:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contracts/:id/versions/:versionId', authMiddleware, async (req, res) => {
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
    
    const version = await ContractVersion.findOne({
      contractId: req.params.id,
      version: req.params.versionId
    }).populate('createdBy', 'username');
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json(version);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
