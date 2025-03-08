// services/businessHoursService.js
const axios = require('axios');
const logger = require('../utils/logger');

class BusinessHoursService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.placeId = process.env.GOOGLE_PLACE_ID;
    this.cachedHours = null;
    this.lastCacheTime = null;
    this.CACHE_TTL = 3600000; // 1 hour
  }

  async getBusinessHours() {
    try {
      // Check cache first
      if (this.cachedHours && this.lastCacheTime && 
          (Date.now() - this.lastCacheTime < this.CACHE_TTL)) {
        logger.info('Returning cached business hours');
        return this.cachedHours;
      }

      logger.info('Fetching business hours from Places API');
      logger.info(`Using Place ID: ${this.placeId}`);
      
      // Fetch from Places API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${this.placeId}&` +
        `fields=name,formatted_address,opening_hours&` +
        `key=${this.apiKey}`
      );

      // Log more information for debugging
      if (!response.data.result) {
        logger.error('Place not found in Google Places API');
        logger.error('API Response:', response.data);
        throw new Error('Place not found in Google Places API');
      }
      
      logger.info(`Found place: ${response.data.result.name || 'Unknown'}`);
      
      if (!response.data.result.opening_hours) {
        logger.warning('No opening hours available for this place');
        
        // Create fallback hours based on typical winery hours
        const fallbackHours = this.createFallbackHours();
        this.cachedHours = fallbackHours;
        this.lastCacheTime = Date.now();
        
        logger.info('Using fallback hours');
        return fallbackHours;
      }

      const placeDetails = response.data.result;
      
      // Format the response
      const businessHours = {
        regularHours: this.formatRegularHours(placeDetails.opening_hours),
        isCurrentlyOpen: placeDetails.opening_hours.open_now || false,
        specialHours: null // Places API doesn't provide special hours
      };

      // Update cache
      this.cachedHours = businessHours;
      this.lastCacheTime = Date.now();

      return businessHours;
    } catch (error) {
      logger.error('Error fetching business hours:', error.message);
      if (error.response) {
        logger.error('API response status:', error.response.status);
        logger.error('API response data:', error.response.data);
      }
      
      // Return fallback hours if no cached hours are available
      if (!this.cachedHours) {
        logger.info('Using fallback hours as no cache is available');
        return this.createFallbackHours();
      }
      
      // Return cached hours if available
      return this.cachedHours;
    }
  }

  formatRegularHours(openingHours) {
    // Places API provides periods and weekday_text
    if (!openingHours.weekday_text) {
      return this.createFallbackHours().regularHours;
    }

    // Transform the weekday_text into a structured format
    return openingHours.weekday_text.map(dayText => {
      // Example: "Monday: 10:00 AM – 5:00 PM"
      const dayParts = dayText.split(': ');
      const day = dayParts[0];
      const hoursSection = dayParts.length > 1 ? dayParts[1] : '';
      
      if (!hoursSection || hoursSection.toLowerCase().includes('closed')) {
        return { day, openTime: 'Closed', closeTime: 'Closed' };
      }
      
      // Split by the en dash (–) or hyphen (-) which is what Google Places API uses
      // Handle potential space variations around the dash
      const timeParts = hoursSection.split(/\s*[–-]\s*/);
      
      const openTime = timeParts[0].trim();
      let closeTime = 'Closing time not specified';
      
      // Check if we have a closing time part
      if (timeParts.length > 1 && timeParts[1].trim()) {
        closeTime = timeParts[1].trim();
      }
      
      return { day, openTime, closeTime };
    });
  }

  // Create fallback hours based on typical winery hours
  createFallbackHours() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Typical winery hours: Closed Monday-Tuesday, Open Wed-Sun
    const regularHours = days.map(day => {
      if (['Monday', 'Tuesday'].includes(day)) {
        return { day, openTime: 'Closed', closeTime: 'Closed' };
      } else if (['Friday', 'Saturday'].includes(day)) {
        return { day, openTime: '12:00 PM', closeTime: '7:00 PM' };
      } else {
        return { day, openTime: '12:00 PM', closeTime: '5:00 PM' };
      }
    });
    
    // Check if we're currently open based on fallback hours
    const now = new Date();
    const dayOfWeek = days[now.getDay()]; // 0 = Sunday, 1 = Monday, etc.
    const hourNow = now.getHours();
    const minuteNow = now.getMinutes();
    
    // Check if today is a day we're open
    const todayHours = regularHours.find(h => h.day === dayOfWeek);
    const isOpen = todayHours && todayHours.openTime !== 'Closed' && 
                  (hourNow >= 12) && // After or at 12:00 PM
                  (hourNow < (['Friday', 'Saturday'].includes(dayOfWeek) ? 19 : 17)); // Before closing (7PM or 5PM)
    
    return {
      regularHours,
      isCurrentlyOpen: isOpen,
      specialHours: null,
      isFallback: true // Flag to indicate these are fallback hours
    };
  }
}

module.exports = new BusinessHoursService();