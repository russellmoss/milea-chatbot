// middleware/extractCustomerId.js
const logger = require('../utils/logger');

/**
 * Middleware to extract customer ID from authorization header
 * 
 * This middleware checks for a token in the Authorization header
 * and extracts the customer ID from it. For a real implementation,
 * you would verify a JWT token, but this simplified version
 * extracts the customer ID directly from our custom token format.
 */
function extractCustomerId(req, res, next) {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warning('No valid authorization header found');
      req.customerId = null;
      return next();
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Extract customer ID from token
    // In our implementation, the token format is: c7-token-timestamp-customerId
    const tokenParts = token.split('-');
    
    // Check if the token format is valid
    if (tokenParts.length < 4 || tokenParts[0] !== 'c7' || tokenParts[1] !== 'token') {
      logger.warning('Invalid token format');
      req.customerId = null;
      return next();
    }
    
    // The last part of the token is the customer ID
    const customerId = tokenParts.slice(3).join('-');
    
    // Check if customer ID is valid
    if (!customerId || customerId === 'undefined') {
      logger.warning('Invalid customer ID extracted from token');
      req.customerId = null;
    } else {
      logger.info(`Extracted customer ID from token: ${customerId}`);
      req.customerId = customerId;
    }
  } catch (error) {
    logger.error('Error extracting customer ID:', error);
    req.customerId = null;
  }
  
  next();
}

module.exports = extractCustomerId;