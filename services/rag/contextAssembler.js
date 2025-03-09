// services/rag/contextAssembler.js
// Refactored to use the modular context system

/**
 * This file serves as a compatibility layer for existing code that 
 * imports from contextAssembler.js, but delegates to the new modular
 * context system for the actual functionality.
 */

const { assembleContext, cleanHtmlContent } = require('./context');

// Re-export the validateResults and validateGroupedDocs functions
// for backward compatibility
const { validateResults, validateGroupedDocs } = require('./context/validator');

/**
 * @deprecated Use the new modular context system instead
 */
module.exports = {
  assembleContext,
  validateResults,
  validateGroupedDocs,
  cleanHtmlContent
};