// Updated server.js - Add the club signup route
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customer', require('./routes/customers'));
app.use('/api/commerce7', require('./routes/commerce7'));
app.use('/api/commerce7/club-signup', require('./routes/clubSignup')); // New club signup route
app.use('/api/subscribe', require('./routes/subscribe'));
app.use('/chat', require('./routes/chat'));
app.use('/rag-chat', require('./routes/rag'));
app.use('/api/business', require('./routes/businessInfo'));

// Root route
app.get("/", (req, res) => {
    res.send("Milea Chatbot Server Running!");
});

// Test route
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// Error handling middleware
app.use(errorHandler);

// Initialize scheduled tasks if enabled
if (process.env.ENABLE_SCHEDULED_TASKS === 'true') {
  logger.info('Initializing scheduled tasks...');
  require('./scripts/scheduledTasks');
}

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.success(`Server running on port ${PORT}`);
});