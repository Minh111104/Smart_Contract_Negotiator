// Load dotenv first
require('dotenv').config();

// Export the JWT secret to ensure consistency across the app
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';

console.log('JWT_SECRET loaded:', JWT_SECRET ? 'Yes (length: ' + JWT_SECRET.length + ')' : 'No');

module.exports = JWT_SECRET;
