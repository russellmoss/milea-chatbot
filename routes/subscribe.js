// routes/subscribe.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Subscribe endpoint to add users to Commerce7 with Subscribed email marketing status
 * This creates a new customer or updates an existing one
 */
router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, email, emailMarketingStatus = 'Subscribed' } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        message: "First name, last name, and email are required" 
      });
    }
    
    logger.info(`Processing subscription request for: ${email}`);
    
    // Configuration for Commerce7 API
    const apiConfig = {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.C7_APP_ID + ':' + process.env.C7_SECRET_KEY).toString('base64')}`,
        'Tenant': process.env.C7_TENANT_ID,
        'Content-Type': 'application/json'
      }
    };
    
    // First check if customer already exists
    try {
      const searchResponse = await axios.get(
        `https://api.commerce7.com/v1/customer?q=${encodeURIComponent(email)}`,
        apiConfig
      );
      
      const existingCustomer = searchResponse.data.customers?.[0];
      
      if (existingCustomer) {
        logger.info(`Customer already exists (ID: ${existingCustomer.id}), updating subscription status`);
        
        // Update existing customer's email marketing status
        await axios.put(
          `https://api.commerce7.com/v1/customer/${existingCustomer.id}`,
          { emailMarketingStatus },
          apiConfig
        );
        
        return res.status(200).json({
          success: true,
          message: "Subscription status updated successfully",
          isExisting: true
        });
      }
      
      // Create new customer with subscribed status
      logger.info(`Creating new customer for: ${email}`);
      const createResponse = await axios.post(
        `https://api.commerce7.com/v1/customer`,
        {
          firstName,
          lastName,
          emails: [{ email }],
          emailMarketingStatus,
          countryCode: "US", // Default country code
          metaData: {
            source: "chatbot_subscription"
          }
        },
        apiConfig
      );
      
      logger.success(`Successfully created customer and subscription for: ${email}`);
      return res.status(201).json({
        success: true,
        message: "Successfully subscribed to mailing list",
        customerId: createResponse.data.id
      });
      
    } catch (error) {
      logger.error("Commerce7 API Error:", error.response?.data || error.message);
      
      if (error.response?.status === 409) {
        return res.status(409).json({ 
          success: false, 
          message: "This email is already subscribed" 
        });
      }
      
      throw error; // Let the outer catch handle other errors
    }
  } catch (error) {
    logger.error("Subscription error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process subscription. Please try again later." 
    });
  }
});

module.exports = router;