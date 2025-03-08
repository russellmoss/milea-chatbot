// services/loyaltyService.js
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Service to handle loyalty points operations with Commerce7
 */
class LoyaltyService {
  constructor() {
    this.apiConfig = {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.C7_APP_ID + ':' + process.env.C7_SECRET_KEY).toString('base64')}`,
        'Tenant': process.env.C7_TENANT_ID,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Get customer loyalty points directly from Commerce7
   * @param {string} customerId - Commerce7 customer ID
   * @returns {Promise<Object>} - Loyalty points info
   */
  async getCustomerLoyaltyPoints(customerId) {
    if (!customerId) {
      logger.error("Cannot fetch loyalty points: No customer ID provided");
      throw new Error("Customer ID is required");
    }

    logger.info(`Fetching loyalty points for customer ID: ${customerId}`);
    
    try {
      // Fetch the customer data which includes loyalty info
      const response = await axios.get(
        `https://api.commerce7.com/v1/customer/${customerId}`,
        this.apiConfig
      );
      
      const customer = response.data;
      
      // Extract loyalty points
      const loyaltyPoints = customer.loyalty?.points || 0;
      
      logger.info(`Retrieved ${loyaltyPoints} loyalty points for customer ${customerId}`);
      
      return {
        points: loyaltyPoints,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email
        }
      };
    } catch (error) {
      logger.error(`Error fetching loyalty points:`, error);
      
      if (error.response?.status === 404) {
        throw new Error(`Customer not found: ${customerId}`);
      }
      
      throw new Error("Failed to retrieve loyalty points");
    }
  }

  /**
   * Get loyalty transaction history
   * @param {string} customerId - Commerce7 customer ID
   * @returns {Promise<Array>} - Transaction history
   */
  async getLoyaltyTransactions(customerId) {
    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    logger.info(`Fetching loyalty transactions for customer ID: ${customerId}`);
    
    try {
      const response = await axios.get(
        `https://api.commerce7.com/v1/loyalty-transaction?customerId=${customerId}`,
        this.apiConfig
      );
      
      const transactions = response.data.loyaltyTransactions || [];
      logger.info(`Retrieved ${transactions.length} loyalty transactions`);
      
      return transactions;
    } catch (error) {
      logger.error(`Error fetching loyalty transactions:`, error);
      throw new Error("Failed to retrieve loyalty transactions");
    }
  }
}

module.exports = new LoyaltyService();