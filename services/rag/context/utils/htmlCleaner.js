// services/rag/context/utils/htmlCleaner.js

/**
 * Clean HTML content in document text
 * @param {string} content - Content that may contain HTML
 * @returns {string} - Cleaned content with HTML properly handled
 */
function cleanHtmlContent(content) {
    // First, preserve valuable HTML content by converting tags to markdown equivalents
    let cleanedContent = content
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<p><strong>(.*?)<\/strong><\/p>/g, '**$1**\n\n')
      .replace(/<\/p>\s*<p>/g, '\n\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<div>\s*<div>/g, '\n')
      .replace(/<\/div>\s*<\/div>/g, '\n');
    
    // Then remove any remaining HTML tags
    cleanedContent = cleanedContent.replace(/<\/?[^>]+(>|$)/g, '');
    return cleanedContent.trim();
  }
  
  module.exports = { cleanHtmlContent };