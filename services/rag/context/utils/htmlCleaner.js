// services/rag/context/utils/htmlCleaner.js

/**
 * Enhanced clean HTML content function with better handling of nested content
 * @param {string} content - Content that may contain HTML
 * @returns {string} - Cleaned content with HTML properly handled
 */
function cleanHtmlContent(content) {
  if (!content) return '';
  
  // Handle complex nested HTML with a more comprehensive approach
  
  // Step 1: Pre-process content to preserve critical sections with clear markers
  let processedContent = content
    // Mark important sections for wine descriptions
    .replace(/<strong>WINE NOTES<\/strong>/gi, '### WINE NOTES ###')
    .replace(/<strong>Wine Notes<\/strong>/gi, '### WINE NOTES ###')
    .replace(/<strong>TASTING NOTES<\/strong>/gi, '### TASTING NOTES ###')
    .replace(/<strong>Tasting Notes<\/strong>/gi, '### TASTING NOTES ###')
    .replace(/<strong>Tasting notes<\/strong>/gi, '### TASTING NOTES ###')
    .replace(/<strong>PAIRING RECOMMENDATION<\/strong>/gi, '### PAIRING RECOMMENDATION ###')
    .replace(/<strong>Pairing Recommendation:<\/strong>/gi, '### PAIRING RECOMMENDATION ###')
    .replace(/<strong>ACCOLADES<\/strong>/gi, '### ACCOLADES ###')
    .replace(/<strong>Accolades<\/strong>/gi, '### ACCOLADES ###');
  
  // Step 2: Handle nested divs better - replace them with newlines and spacing
  // This handles the complex nesting structure in the wine descriptions
  processedContent = processedContent
    .replace(/<div>[\s\n]*<div>/gi, '\n')
    .replace(/<\/div>[\s\n]*<\/div>/gi, '\n\n')
    // Handle all divs (even non-nested)
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n\n');
  
  // Step 3: Handle paragraph tags with proper spacing
  processedContent = processedContent
    .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')  // Using /s flag to match across lines
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
    
  // Step 4: Handle other HTML formatting
  processedContent = processedContent
    // Handle strong/bold tags
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    // Handle italic tags
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    // Handle headers
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '**$1**\n\n')
    // Handle line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Handle span tags
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  
  // Step 5: Convert common HTML entities
  processedContent = processedContent
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Handle accented characters
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&uuml;/g, "ü")
    .replace(/&ouml;/g, "ö")
    .replace(/&auml;/g, "ä")
    .replace(/&iuml;/g, "ï")
    .replace(/&ccedil;/g, "ç")
    .replace(/&ocirc;/g, "ô")
    .replace(/&acirc;/g, "â")
    .replace(/&ecirc;/g, "ê");
    
  // Step 6: Final cleanup - remove any remaining HTML tags
  processedContent = processedContent
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Clean up excess whitespace but preserve paragraph breaks
    .replace(/\n{3,}/g, '\n\n')
    // Ensure section headers stand out
    .replace(/### ([A-Z\s]+) ###/g, '\n\n### $1 ###\n');
  
  // Remove leading/trailing whitespace
  return processedContent.trim();
}

module.exports = { cleanHtmlContent };