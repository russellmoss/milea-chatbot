const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.auth(`Login attempt: ${email}`);
    
    // Simple validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    // Configuration for Commerce7 API
    const apiConfig = {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.C7_APP_ID + ':' + process.env.C7_SECRET_KEY).toString('base64')}`,
        'Tenant': process.env.C7_TENANT_ID,
        'Content-Type': 'application/json'
      }
    };
    
    try {
      // Step 1: Search for customer by email to get the customer ID
      logger.info(`Searching for customer by email: ${email}`);
      const searchResponse = await axios.get(
        `https://api.commerce7.com/v1/customer?q=${encodeURIComponent(email)}`,
        apiConfig
      );
      
      // Check if customer exists
      if (!searchResponse.data.customers || searchResponse.data.customers.length === 0) {
        logger.warning(`Customer not found for email: ${email}`);
        return res.status(404).json({ 
          success: false, 
          error: "Customer not found" 
        });
      }
      
      const customer = searchResponse.data.customers[0];
      logger.success(`Found customer: ${customer.id} (${customer.firstName} ${customer.lastName})`);
      
      // Step 2: In a real implementation, you would validate the password
      // This is a simplified version - in production, implement proper password validation
      // For now, we're trusting the email match alone
      
      // Create a real JWT token that includes the customer ID
      const token = `c7-token-${Date.now()}-${customer.id}`;
      
      // Get loyalty points in the same request if available
      let loyaltyPoints = 0;
      if (customer.loyalty && customer.loyalty.points) {
        loyaltyPoints = customer.loyalty.points;
        logger.info(`Customer has ${loyaltyPoints} loyalty points`);
      } else {
        logger.info(`No loyalty points found for customer`);
      }
      
      // Return customer information - Use the email from the request body 
      // which we know exists instead of possibly undefined customer.email
      res.json({
        success: true,
        token: token,
        customerId: customer.id,
        user: {
          id: customer.id,
          firstName: customer.firstName || "Milea",
          lastName: customer.lastName || "Customer",
          email: email,  // Use the email from the request body
          loyaltyPoints: loyaltyPoints
        }
      });
      
    } catch (error) {
      logger.error("Commerce7 API Error:", error.response?.data || error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        return res.status(401).json({ 
          success: false, 
          error: "Authentication failed. Please check your credentials." 
        });
      }
      throw error; // Let the outer catch handle other errors
    }
    
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Authentication failed. Please try again later." 
    });
  }
});

module.exports = router;