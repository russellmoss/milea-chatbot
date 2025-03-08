// routes/businessInfo.js
const express = require('express');
const router = express.Router();
const businessHoursService = require('../services/businessHoursService');
const logger = require('../utils/logger');

router.get("/hours", async (req, res) => {
  try {
    const businessHours = await businessHoursService.getBusinessHours();
    
    if (!businessHours) {
      return res.status(404).json({ 
        error: "Business hours information not available" 
      });
    }
    
    res.json(businessHours);
  } catch (error) {
    logger.error("Error fetching business hours:", error.message);
    res.status(500).json({ error: "Error retrieving business hours" });
  }
});

module.exports = router;