// services/rag/index.js
// Main export point for the RAG service

const { generateRAGResponse } = require('./ragService');
const queryClassifier = require('./queryClassifier');
const contextAssembler = require('./contextAssembler');
const responseGenerator = require('./responseGenerator');
const wineHandler = require('./domains/wineHandler');
const visitingHandler = require('./domains/visitingHandler');
const clubHandler = require('./domains/clubHandler');
const generalHandler = require('./domains/generalHandler');

module.exports = {
  // Main RAG service
  generateRAGResponse,
  
  // Core components
  queryClassifier,
  contextAssembler,
  responseGenerator,
  
  // Domain handlers
  handlers: {
    wine: wineHandler,
    visiting: visitingHandler,
    club: clubHandler,
    general: generalHandler
  }
};