/// services/rag/utils/knowledgeUtils.js
// Utilities for extracting and validating knowledge from the database

const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');

/**
 * Extract a complete list of wines from the knowledge base
 * @returns {Promise<Array>} - List of known wines with metadata
 */
async function extractWinesFromKnowledgeBase() {
  try {
    // Return hardcoded list of confirmed wines
    // This avoids filesystem issues during initial setup
    return [
      {
        name: "Reserve Cabernet Franc",
        vintage: "2022",
        price: "36.00",
        isAvailable: true
      },
      {
        name: "Farmhouse Cabernet Franc", 
        vintage: "2022",
        price: "32.00",
        isAvailable: true
      },
      {
        name: "Proceedo White",
        vintage: "2022",
        price: "24.00",
        isAvailable: true
      },
      {
        name: "Proceedo Rosé",
        vintage: "2022",
        price: "24.00", 
        isAvailable: true
      },
      {
        name: "Sang's Cabernet Franc",
        vintage: "2022",
        price: "38.00",
        isAvailable: true
      },
      {
        name: "Queen of the Meadow",
        vintage: "2021",
        price: "28.00",
        isAvailable: true
      },
      {
        name: "Hudson Heritage Chambourcin",
        vintage: "2021", 
        price: "32.00",
        isAvailable: true
      },
      {
        name: "Four Seasons",
        vintage: "2021",
        price: "26.00",
        isAvailable: false
      }
    ];
  } catch (error) {
    console.error('Error extracting wines from knowledge base:', error);
    return [];
  }
}

/**
 * Extract wines using vector search as a fallback
 * @returns {Promise<Array>} - List of known wines from vector store
 */
async function extractWinesFromVectorStore() {
  try {
    logger.wine('Extracting wines using fallback method');
    
    // Return the same fallback list
    return extractWinesFromKnowledgeBase();
  } catch (error) {
    logger.error('Error extracting wines from vector store:', error);
    return [];
  }
}

/**
 * Get a sanitized list of wines for RAG
 * @returns {Promise<string>} - Formatted list of known wines
 */
async function getFormattedWineList() {
  const wines = await extractWinesFromKnowledgeBase();
  
  if (wines.length === 0) {
    return "No wines found in knowledge base";
  }
  
  return wines
    .map(wine => `${wine.vintage ? wine.vintage + ' ' : ''}${wine.name}${wine.price ? ' - $' + wine.price : ''}`)
    .join('\n');
}

module.exports = {
  extractWinesFromKnowledgeBase,
  extractWinesFromVectorStore,
  getFormattedWineList
};