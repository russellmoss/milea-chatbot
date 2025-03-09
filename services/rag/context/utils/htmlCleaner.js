// services/rag/context/utils/htmlCleaner.js
// Enhanced version that preserves content instead of cleaning it

/**
 * Process HTML content from wine descriptions
 * This function preserves all content rather than removing HTML tags
 * 
 * @param {string} content - The content to process
 * @returns {string} - Processed content
 */
function cleanHtmlContent(content) {
  if (!content) return '';
  
  // Instead of removing HTML tags, just preserve the content as is
  // This allows the LLM to see and extract all information
  // We'll only handle common HTML entities
  let processedContent = content
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&uuml;/g, "ü")
    .replace(/&ouml;/g, "ö")
    .replace(/&auml;/g, "ä")
    .replace(/&iuml;/g, "ï")
    .replace(/&ccedil;/g, "ç");
  
  // Clean up excessive whitespace but preserve newlines
  processedContent = processedContent
    .replace(/[ \t]+/g, ' ')    // Replace multiple spaces/tabs with a single space
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with double newlines
    .trim();
  
  return processedContent;
}

module.exports = { 
  cleanHtmlContent
};