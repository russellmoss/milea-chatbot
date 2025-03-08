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
      
      // Fetch from Places API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${this.placeId}&` +
        `fields=name,opening_hours,utc_offset&` +
        `key=${this.apiKey}`
      );

      if (!response.data.result || !response.data.result.opening_hours) {
        throw new Error('No opening hours found in Places API response');
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
      // Return cached hours if available, otherwise null
      return this.cachedHours || null;
    }
  }

  formatRegularHours(openingHours) {
    // Places API provides periods and weekday_text
    if (!openingHours.periods || !openingHours.weekday_text) {
      return null;
    }

    // Transform the weekday_text into a structured format
    return openingHours.weekday_text.map(dayText => {
      // Example: "Monday: 10:00 AM – 5:00 PM"
      const [day, hours] = dayText.split(': ');
      
      if (!hours) {
        return { day, openTime: 'Closed', closeTime: 'Closed' };
      }
      
      const [openTime, closeTime] = hours.split(' – ');
      return { day, openTime, closeTime };
    });
  }
}

module.exports = new BusinessHoursService();