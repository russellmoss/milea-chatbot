// routes/customers.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const loyaltyService = require('../services/loyaltyService');
const extractCustomerId = require('../middleware/extractCustomerId');

// Middleware to extract customer ID from token
router.use(extractCustomerId);

// Get current customer data including loyalty points
router.get("/me", async (req, res) => {
  try {
    const customerId = req.customerId;
    
    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized: No valid customer ID" });
    }
    
    logger.info(`Fetching customer data for ID: ${customerId}`);
    
    try {
      // Get loyalty points using the service
      const loyaltyData = await loyaltyService.getCustomerLoyaltyPoints(customerId);
      
      // Return the user data with loyalty information
      res.json({
        id: loyaltyData.customer.id,
        firstName: loyaltyData.customer.firstName,
        lastName: loyaltyData.customer.lastName,
        email: loyaltyData.customer.email,
        loyaltyPoints: loyaltyData.points
      });
    } catch (error) {
      logger.error("Error retrieving customer data:", error);
      
      if (error.message.includes("Customer not found")) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.status(500).json({ error: "Failed to fetch customer data" });
    }
  } catch (error) {
    logger.error("Error in /customer/me endpoint:", error);
    res.status(500).json({ error: "Failed to fetch customer data" });
  }
});

// Get loyalty points only
router.get("/loyalty-points", async (req, res) => {
  try {
    const customerId = req.customerId;
    
    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized: No valid customer ID" });
    }
    
    logger.info(`Fetching loyalty points for customer ID: ${customerId}`);
    
    try {
      const loyaltyData = await loyaltyService.getCustomerLoyaltyPoints(customerId);
      res.json({ points: loyaltyData.points });
    } catch (error) {
      logger.error("Error retrieving loyalty points:", error);
      
      if (error.message.includes("Customer not found")) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.status(500).json({ error: "Failed to fetch loyalty points" });
    }
  } catch (error) {
    logger.error("Error in /loyalty-points endpoint:", error);
    res.status(500).json({ error: "Failed to fetch loyalty points" });
  }
});

// Get loyalty transactions history
router.get("/loyalty-transactions", async (req, res) => {
  try {
    const customerId = req.customerId;
    
    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized: No valid customer ID" });
    }
    
    logger.info(`Fetching loyalty transactions for customer ID: ${customerId}`);
    
    try {
      const transactions = await loyaltyService.getLoyaltyTransactions(customerId);
      res.json({ transactions });
    } catch (error) {
      logger.error("Error retrieving loyalty transactions:", error);
      res.status(500).json({ error: "Failed to fetch loyalty transactions" });
    }
  } catch (error) {
    logger.error("Error in /loyalty-transactions endpoint:", error);
    res.status(500).json({ error: "Failed to fetch loyalty transactions" });
  }
});

module.exports = router;
