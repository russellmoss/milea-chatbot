// services/rag/context/utils/htmlCleaner.js
// Enhanced version that properly extracts content from HTML tags

/**
 * Process HTML content from wine descriptions
 * This function extracts text from HTML tags while preserving structure
 * 
 * @param {string} content - The content to process
 * @returns {string} - Processed content
 */
function cleanHtmlContent(content) {
  if (!content) return '';
  
  // Extract text from HTML tags while preserving structure
  let processedContent = content
    .replace(/<p[^>]*>(.*?)<\/p>/gs, '$1\n\n') // Extract paragraph content
    .replace(/<strong[^>]*>(.*?)<\/strong>/gs, '**$1**') // Convert strong to markdown bold
    .replace(/<span[^>]*>(.*?)<\/span>/gs, '$1') // Extract span content
    .replace(/<div[^>]*>(.*?)<\/div>/gs, '$1\n') // Extract div content
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gs, '**$1**\n\n') // Extract heading content
    .replace(/<em[^>]*>(.*?)<\/em>/gs, '*$1*') // Convert em to markdown italic
    .replace(/<br\s*\/?>/g, '\n') // Convert <br> to newline
    .replace(/<li[^>]*>(.*?)<\/li>/gs, '• $1\n') // Extract list items
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gs, '\n'); // Remove list containers
  
  // Handle HTML entities
  processedContent = processedContent
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