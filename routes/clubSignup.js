// routes/clubSignup.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authConfig } = require('../config/commerce7');
const logger = require('../utils/logger');

router.post("/", async (req, res) => {
  try {
    const clubSignupData = req.body;
    
    logger.info(`Processing wine club signup for ${clubSignupData.firstName} ${clubSignupData.lastName}`);
    
    // Search for existing customer by email
    const existingCustomer = await findCustomerByEmail(clubSignupData.email);
    
    let customerId;
    if (existingCustomer) {
      // Update existing customer
      logger.info(`Updating existing customer: ${existingCustomer.id}`);
      customerId = existingCustomer.id;
      await updateCustomer(customerId, clubSignupData);
    } else {
      // Create new customer
      logger.info('Creating new customer');
      const newCustomer = await createCustomer(clubSignupData);
      customerId = newCustomer.id;
    }
    
    // Handle addresses
    await processAddresses(customerId, clubSignupData.addresses);
    
    // Handle club membership
    const clubMembership = await createClubMembership(customerId, clubSignupData.clubMembership);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Wine club signup successful',
      customerId: customerId,
      clubMembership: clubMembership
    });
    
  } catch (error) {
    logger.error('Error processing wine club signup:', error);
    
    // Determine appropriate error response
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Error processing wine club signup';
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage
    });
  }
});

/**
 * Find a customer by email in Commerce7
 * @param {string} email - Customer email address
 * @returns {Promise<Object|null>} - Customer object if found, null otherwise
 */
async function findCustomerByEmail(email) {
  try {
    const response = await axios.get(
      `https://api.commerce7.com/v1/customer?q=${encodeURIComponent(email)}`,
      authConfig
    );
    
    if (response.data.customers && response.data.customers.length > 0) {
      return response.data.customers[0];
    }
    
    return null;
  } catch (error) {
    logger.error('Error searching for customer:', error);
    return null;
  }
}

/**
 * Create a new customer in Commerce7
 * @param {Object} customerData - Customer information
 * @returns {Promise<Object>} - Created customer object
 */
async function createCustomer(customerData) {
  try {
    // Format phone number if provided
    let formattedPhone = null;
    if (customerData.phone) {
      formattedPhone = customerData.phone.replace(/\D/g, "");
      if (formattedPhone.length === 10) {
        formattedPhone = `+1${formattedPhone}`;
      }
    }
    
    // Construct properly formatted payload
    const payload = {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      emails: [{ email: customerData.email }], // Corrected format
      phones: formattedPhone ? [{ phone: formattedPhone }] : [], // Corrected format
      password: customerData.password,
      countryCode: "US", // Added required field
      metaData: {
        source: 'wine_club_chatbot'
      }
    };
    
    // Log the payload for debugging
    logger.info('Creating customer with payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(
      'https://api.commerce7.com/v1/customer',
      payload,
      authConfig
    );
    
    logger.info('Customer created successfully with ID:', response.data.id);
    return response.data;
  } catch (error) {
    logger.error('Error creating customer:', error.message);
    
    // Log detailed error information
    if (error.response && error.response.data) {
      logger.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      
      // If there are specific validation errors, log them
      if (error.response.data.errors) {
        logger.error('Validation errors:', error.response.data.errors);
      }
    }
    
    throw error;
  }
}

/**
 * Update an existing customer in Commerce7
 * @param {string} customerId - Customer ID
 * @param {Object} customerData - Updated customer information
 * @returns {Promise<Object>} - Updated customer object
 */
async function updateCustomer(customerId, customerData) {
  try {
    // Format phone number if provided
    let formattedPhone = null;
    if (customerData.phone) {
      formattedPhone = customerData.phone.replace(/\D/g, "");
      if (formattedPhone.length === 10) {
        formattedPhone = `+1${formattedPhone}`;
      }
    }
    
    // Build the update payload
    const payload = {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      phones: formattedPhone ? [{ phone: formattedPhone }] : [], // Corrected format
      countryCode: "US", // Added required field 
      password: customerData.password,
      metaData: {
        source: 'wine_club_chatbot_update'
      }
    };
    
    logger.info(`Updating customer ${customerId} with payload:`, JSON.stringify(payload, null, 2));
    
    const response = await axios.put(
      `https://api.commerce7.com/v1/customer/${customerId}`,
      payload,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error updating customer ${customerId}:`, error.message);
    
    // Log detailed error information
    if (error.response && error.response.data) {
      logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

/**
 * Process and manage customer addresses
 * @param {string} customerId - Customer ID
 * @param {Array} addresses - Addresses to process
 * @returns {Promise<Array>} - Processed addresses
 */
async function processAddresses(customerId, addresses) {
  try {
    // Get existing addresses
    const existingAddresses = await getCustomerAddresses(customerId);
    
    // Process each address
    const results = [];
    for (const address of addresses) {
      // Check if same address type exists
      const existingAddress = existingAddresses.find(addr => addr.type === address.type);
      
      if (existingAddress) {
        // Update existing address
        results.push(await updateCustomerAddress(customerId, existingAddress.id, address));
      } else {
        // Create new address
        results.push(await createCustomerAddress(customerId, address));
      }
    }
    
    return results;
  } catch (error) {
    logger.error(`Error processing addresses for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Get a customer's addresses
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Customer addresses
 */
async function getCustomerAddresses(customerId) {
  try {
    const response = await axios.get(
      `https://api.commerce7.com/v1/customer/${customerId}/address`,
      authConfig
    );
    
    return response.data.addresses || [];
  } catch (error) {
    logger.error(`Error getting addresses for customer ${customerId}:`, error);
    return [];
  }
}

/**
 * Create a new address for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} addressData - Address information
 * @returns {Promise<Object>} - Created address
 */
async function createCustomerAddress(customerId, addressData) {
  try {
    // Ensure countryCode is provided
    if (!addressData.countryCode) {
      addressData.countryCode = "US";
    }
    
    logger.info(`Creating address for customer ${customerId}:`, JSON.stringify(addressData, null, 2));
    
    const response = await axios.post(
      `https://api.commerce7.com/v1/customer/${customerId}/address`,
      addressData,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error creating address for customer ${customerId}:`, error.message);
    
    // Log detailed error information
    if (error.response && error.response.data) {
      logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

/**
 * Update an existing customer address
 * @param {string} customerId - Customer ID
 * @param {string} addressId - Address ID
 * @param {Object} addressData - Updated address information
 * @returns {Promise<Object>} - Updated address
 */
async function updateCustomerAddress(customerId, addressId, addressData) {
  try {
    // Ensure countryCode is provided
    if (!addressData.countryCode) {
      addressData.countryCode = "US";
    }
    
    logger.info(`Updating address ${addressId} for customer ${customerId}:`, JSON.stringify(addressData, null, 2));
    
    const response = await axios.put(
      `https://api.commerce7.com/v1/customer/${customerId}/address/${addressId}`,
      addressData,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error updating address ${addressId} for customer ${customerId}:`, error.message);
    
    // Log detailed error information
    if (error.response && error.response.data) {
      logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

/**
 * Create a club membership for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} membershipData - Club membership information
 * @returns {Promise<Object>} - Created club membership
 */
async function createClubMembership(customerId, membershipData) {
  try {
    const payload = {
      clubId: membershipData.clubId,
      status: 'Pending',
      deliveryOption: membershipData.deliveryMethod === 'pickup' ? 'Pickup' : 'Ship',
      metaData: {
        source: 'chatbot_signup'
      }
    };
    
    logger.info(`Creating club membership for customer ${customerId}:`, JSON.stringify(payload, null, 2));
    
    const response = await axios.post(
      `https://api.commerce7.com/v1/customer/${customerId}/club-membership`,
      payload,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error creating club membership for customer ${customerId}:`, error.message);
    
    // Log detailed error information
    if (error.response && error.response.data) {
      logger.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

module.exports = router;