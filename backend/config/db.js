// Database configuration
const mongoose = require('mongoose');

const dbURI = 'mongodb://localhost:27017/pipirka';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = mongoose;