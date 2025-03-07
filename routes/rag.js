// routes/rag.js
const express = require('express');
const router = express.Router();
const { generateRAGResponse } = require('../services/rag/ragService');
const logger = require('../utils/logger');

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    logger.info("Processing RAG chat request:", message);
    
    const ragResponse = await generateRAGResponse(message);
    
    res.json({
      response: ragResponse.response,
      sources: ragResponse.sources
    });
  } catch (error) {
    logger.error("RAG Chat Error:", error);
    res.status(500).json({ 
      error: "Error processing request",
      message: "I apologize, but I encountered an issue while processing your request."
    });
  }
});

module.exports = router;