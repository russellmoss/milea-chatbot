// services/rag/domains/businessHoursHandler.js
const logger = require('../../../utils/logger');
const axios = require('axios');

async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing business hours query: "${query}"`);
    
    // Determine if we need hours or open status
    const needsOpenStatus = query.toLowerCase().includes('open') || 
                           query.toLowerCase().includes('closed');
    
    try {
      // Call our internal API to get business hours
      const response = await axios.get('http://localhost:8080/api/business/hours');
      const businessHours = response.data;
      
      if (needsOpenStatus) {
        // Return if we're currently open
        const isOpen = businessHours.isCurrentlyOpen;
        return {
          response: isOpen 
            ? "Yes, Milea Estate Vineyard is currently open! 😊 You can visit us right now."
            : "Sorry, Milea Estate Vineyard is currently closed. Please check our hours for when we'll be open next.",
          sources: ["Google Places API"],
          fromGoogleAPI: true
        };
      } else {
        // Format and return regular hours
        let response = "🕒 **Our Regular Hours**\n\n";
        
        businessHours.regularHours.forEach(day => {
          response += `- **${day.day}**: ${day.openTime} - ${day.closeTime}\n`;
        });
        
        return {
          response,
          sources: ["Google Places API"],
          fromGoogleAPI: true
        };
      }
    } catch (error) {
      logger.error('Error fetching from Google Places API:', error.message);
      
      // Fall back to the documents if API data isn't available
      logger.info('Falling back to knowledge base for hours information');
      return {};
    }
  } catch (error) {
    logger.error('Error in business hours handler:', error.message);
    return {};
  }
}

module.exports = {
  handleQuery
};