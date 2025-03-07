// routes/auth.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.post("/login", async (req, res) => {
  try {
    // For testing purposes, this will simulate a successful login
    // In production, you would validate against Commerce7 API
    const { email, password } = req.body;
    
    logger.auth(`Login attempt: ${email}`);
    
    // Simple validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    // For testing, accept any email/password (replace with real auth later)
    // You can implement real Commerce7 auth once the basic flow works
    const mockToken = "mock-token-" + Date.now();
    const mockCustomerId = "mock-customer-" + Date.now();
    
    logger.success(`Login successful for ${email}`);
    
    res.json({
      success: true,
      token: mockToken,
      customerId: mockCustomerId
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

module.exports = router;