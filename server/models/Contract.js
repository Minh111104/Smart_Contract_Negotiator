const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastEdited: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Contract', ContractSchema);