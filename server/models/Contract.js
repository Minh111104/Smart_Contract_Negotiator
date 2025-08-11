const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  // Role-based participants
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true, default: 'viewer' }
  }],
  lastEdited: {
    type: Date,
    default: Date.now
  },
  currentVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Helper static to find a participant by user id
ContractSchema.statics.findParticipantRole = function(contract, userId) {
  if (!contract || !Array.isArray(contract.participants)) return null;
  const participant = contract.participants.find(p => p.user?.toString() === userId.toString());
  return participant ? participant.role : null;
};

module.exports = mongoose.model('Contract', ContractSchema);