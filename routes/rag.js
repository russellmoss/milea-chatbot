// routes/rag.js
const express = require('express');
const router = express.Router();
const { generateRAGResponse } = require('../services/rag/ragService');
const logger = require('../utils/logger');

// Keep track of recent messages per session
const sessionMessages = new Map();

router.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    logger.info("Processing RAG chat request:", message);
    
    // Get previous messages for this session
    const previousMessages = sessionMessages.get(sessionId) || [];
    
    // Generate response with conversation context
    const ragResponse = await generateRAGResponse(message, previousMessages);
    
    // Update session messages
    const updatedMessages = [...previousMessages, message];
    sessionMessages.set(sessionId, updatedMessages.slice(-5)); // Keep last 5 messages
    
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