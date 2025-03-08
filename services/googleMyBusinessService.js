// services/googleMyBusinessService.js
const { google } = require('googleapis');
const logger = require('../utils/logger');

class GoogleMyBusinessService {
  constructor() {
    this.mybusiness = google.mybusiness('v4');
    this.accounts = null;
    this.locations = null;
    this.auth = null;
    this.locationName = null;
    this.cachedHours = null;
    this.lastCacheTime = null;
    this.CACHE_TTL = 3600000; // 1 hour in milliseconds
  }

  async init() {
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/business.manage'],
      });

      const client = await this.auth.getClient();
      google.options({ auth: client });

      // Get account information
      const accountsResponse = await this.mybusiness.accounts.list();
      this.accounts = accountsResponse.data.accounts;

      if (!this.accounts || this.accounts.length === 0) {
        throw new Error('No Google My Business accounts found');
      }

      // Get location information
      const locationsResponse = await this.mybusiness.accounts.locations.list({
        parent: this.accounts[0].name,
      });
      
      this.locations = locationsResponse.data.locations;
      
      if (!this.locations || this.locations.length === 0) {
        throw new Error('No locations found for this account');
      }
      
      // Use the first location (for Milea Estate Vineyard)
      this.locationName = this.locations[0].name;
      
      logger.info(`Google My Business initialized for: ${this.locations[0].title}`);
      return true;
    } catch (error) {
      logger.error('Error initializing Google My Business service:', error);
      return false;
    }
  }

  async getBusinessHours() {
    try {
      // Check if we have cached hours and they're still valid
      if (this.cachedHours && this.lastCacheTime && 
          (Date.now() - this.lastCacheTime < this.CACHE_TTL)) {
        logger.info('Returning cached business hours');
        return this.cachedHours;
      }

      // Fetch fresh data
      const location = await this.mybusiness.accounts.locations.get({
        name: this.locationName
      });

      const hours = location.data.regularHours || location.data.specialHours;
      const openInfo = location.data.openInfo || {};
      
      // Format the response
      const businessHours = {
        regularHours: this.formatRegularHours(hours),
        isCurrentlyOpen: this.isCurrentlyOpen(hours),
        specialHours: location.data.specialHours ? this.formatSpecialHours(location.data.specialHours) : null,
        openInfo: openInfo
      };

      // Update cache
      this.cachedHours = businessHours;
      this.lastCacheTime = Date.now();

      return businessHours;
    } catch (error) {
      logger.error('Error fetching business hours:', error);
      // Return cached data if available, otherwise null
      return this.cachedHours || null;
    }
  }

  formatRegularHours(regularHours) {
    if (!regularHours || !regularHours.periods) return null;
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return regularHours.periods.map(period => {
      return {
        day: daysOfWeek[period.openDay - 1],
        openTime: this.formatTime(period.openTime),
        closeTime: this.formatTime(period.closeTime)
      };
    });
  }

  formatSpecialHours(specialHours) {
    if (!specialHours || !specialHours.specialHourPeriods) return null;
    
    return specialHours.specialHourPeriods.map(period => {
      return {
        startDate: period.startDate,
        endDate: period.endDate,
        openTime: this.formatTime(period.openTime),
        closeTime: this.formatTime(period.closeTime),
        isClosed: period.isClosed
      };
    });
  }

  formatTime(timeObject) {
    if (!timeObject) return null;
    return `${timeObject.hours}:${timeObject.minutes.toString().padStart(2, '0')}`;
  }

  isCurrentlyOpen(regularHours) {
    if (!regularHours || !regularHours.periods) return null;
    
    const now = new Date();
    const day = now.getDay() + 1; // Convert to 1-7 format for matching Google's format
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    for (const period of regularHours.periods) {
      if (period.openDay === day) {
        const openHour = period.openTime.hours;
        const openMinutes = period.openTime.minutes;
        const closeHour = period.closeTime.hours;
        const closeMinutes = period.closeTime.minutes;
        
        // Check if current time is within open hours
        if ((hours > openHour || (hours === openHour && minutes >= openMinutes)) &&
            (hours < closeHour || (hours === closeHour && minutes < closeMinutes))) {
          return true;
        }
      }
    }
    
    return false;
  }
}

module.exports = new GoogleMyBusinessService();