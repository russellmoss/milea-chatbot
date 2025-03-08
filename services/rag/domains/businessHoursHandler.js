// services/rag/domains/businessHoursHandler.js
const logger = require('../../../utils/logger');
const axios = require('axios');

async function handleQuery(query, queryInfo, context) {
  try {
    logger.info(`Processing business hours query: "${query}"`);
    
    // Determine if we need hours or open status
    const needsOpenStatus = query.toLowerCase().includes('open now') || 
                           query.toLowerCase().includes('currently open') ||
                           query.toLowerCase().includes('open today') ||
                           query.toLowerCase().includes('closed now') ||
                           query.toLowerCase().includes('currently closed');
    
    try {
      // Call our internal API to get business hours
      const response = await axios.get('http://localhost:8080/api/business/hours');
      const businessHours = response.data;
      
      // Add a note if we're using fallback hours
      const fallbackNote = businessHours.isFallback ? 
        "\n\n⚠️ Note: These are our typical hours. For the most current information, please call us at (845) 677-8446." : "";
      
      if (needsOpenStatus) {
        // Return if we're currently open
        const isOpen = businessHours.isCurrentlyOpen;
        
        let openStatusResponse = isOpen 
          ? "Yes, Milea Estate Vineyard is currently open! 😊 You can visit us right now."
          : "Sorry, Milea Estate Vineyard is currently closed. Please check our hours below for when we'll be open next:";
          
        // Add hours information if closed
        if (!isOpen) {
          openStatusResponse += "\n\n🕒 **Our Regular Hours**\n\n";
          businessHours.regularHours.forEach(day => {
            openStatusResponse += `- **${day.day}**: ${day.openTime === 'Closed' ? 'Closed' : `${day.openTime} - ${day.closeTime}`}\n`;
          });
        }
        
        // Add fallback notice if needed
        if (businessHours.isFallback) {
          openStatusResponse += "\n\n⚠️ Note: This is based on our typical schedule. For the most current information, please call us at (845) 677-8446.";
        }
        
        return {
          response: openStatusResponse,
          sources: businessHours.isFallback ? ["Typical Hours"] : ["Google Places API"],
          fromGoogleAPI: !businessHours.isFallback
        };
      } else {
        // Format and return regular hours
        let response = "🕒 **Our Regular Hours**\n\n";
        
        businessHours.regularHours.forEach(day => {
          response += `- **${day.day}**: ${day.openTime === 'Closed' ? 'Closed' : `${day.openTime} - ${day.closeTime}`}\n`;
        });
        
        // Add fallback note if using fallback hours
        response += fallbackNote;
        
        // Add current open status
        const isOpen = businessHours.isCurrentlyOpen;
        response += `\n\n${isOpen ? '✅ We are currently open!' : '🔒 We are currently closed.'}`;
        
        return {
          response,
          sources: businessHours.isFallback ? ["Typical Hours"] : ["Google Places API"],
          fromGoogleAPI: !businessHours.isFallback
        };
      }
    } catch (error) {
      logger.error('Error fetching from hours API:', error.message);
      
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