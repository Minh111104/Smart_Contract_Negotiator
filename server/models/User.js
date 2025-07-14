const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  // Add more fields as needed (e.g., email)
});

module.exports = mongoose.model('User', UserSchema);