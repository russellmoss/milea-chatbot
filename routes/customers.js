// routes/customers.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.split(' ')[1];
    
    logger.search(`Customer data requested with token: ${token}`);
    
    // For testing, return mock customer data
    // In production, you would fetch this from Commerce7
    res.json({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      loyalty: {
        points: 250
      },
      orders: [],
      totalOrderCount: 0
    });
  } catch (error) {
    logger.error("Customer data error:", error);
    res.status(500).json({ error: "Failed to fetch customer data" });
  }
});

module.exports = router;
