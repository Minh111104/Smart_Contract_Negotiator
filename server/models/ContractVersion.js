const mongoose = require('mongoose');

const ContractVersionSchema = new mongoose.Schema({
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changeDescription: {
    type: String,
    default: 'Auto-saved version'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Compound index to ensure unique versions per contract
ContractVersionSchema.index({ contractId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('ContractVersion', ContractVersionSchema);
