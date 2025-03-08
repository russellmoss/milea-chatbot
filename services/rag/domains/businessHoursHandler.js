// services/rag/domains/businessHoursHandler.js
const logger = require('../../../utils/logger');
const axios = require('axios');

/**
 * Handle business hours related queries
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information
 * @returns {Promise<Object>} - Handler response
 */
async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing business hours query: "${query}"`);
    
    // Determine if we need hours or open status
    const needsOpenStatus = query.toLowerCase().includes('open') || 
                           query.toLowerCase().includes('closed');
    
    try {
      // Call our internal API to get business hours from GMB
      const response = await axios.get('http://localhost:8080/api/business/hours');
      const businessHours = response.data;
      
      if (needsOpenStatus) {
        // Return if we're currently open
        const isOpen = businessHours.isCurrentlyOpen;
        return {
          response: isOpen 
            ? "Yes, Milea Estate Vineyard is currently open! 😊 You can visit us right now."
            : "Sorry, Milea Estate Vineyard is currently closed. Please check our hours for when we'll be open next.",
          sources: ["Google My Business"],
          fromGoogleMyBusiness: true
        };
      } else {
        // Format and return regular hours
        let response = "🕒 **Our Regular Hours**\n\n";
        
        businessHours.regularHours.forEach(day => {
          response += `- **${day.day}**: ${day.openTime} - ${day.closeTime}\n`;
        });
        
        // Add special hours if any
        if (businessHours.specialHours && businessHours.specialHours.length > 0) {
          response += "\n**Special Hours**\n\n";
          businessHours.specialHours.forEach(special => {
            const dateStr = new Date(special.startDate).toLocaleDateString();
            if (special.isClosed) {
              response += `- **${dateStr}**: Closed\n`;
            } else {
              response += `- **${dateStr}**: ${special.openTime} - ${special.closeTime}\n`;
            }
          });
        }
        
        return {
          response,
          sources: ["Google My Business"],
          fromGoogleMyBusiness: true
        };
      }
    } catch (error) {
      logger.error('Error fetching from Google My Business:', error);
      
      // Fall back to the documents if Google My Business data isn't available
      logger.info('Falling back to knowledge base for hours information');
      return {};
    }
  } catch (error) {
    logger.error('Error in business hours handler:', error);
    return {};
  }
}

module.exports = {
  handleQuery
};