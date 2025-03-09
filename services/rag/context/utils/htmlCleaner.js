// services/rag/context/utils/htmlCleaner.js

/**
 * Clean HTML content in document text
 * @param {string} content - Content that may contain HTML
 * @returns {string} - Cleaned content with HTML properly handled
 */
function cleanHtmlContent(content) {
    if (!content) return '';
    
    // First, preserve valuable HTML content by converting tags to markdown equivalents
    let cleanedContent = content
      // Handle strong tags and headers
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<p><strong>(.*?)<\/strong><\/p>/gi, '**$1**\n\n')
      .replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '**$1**\n\n')
      
      // Handle nested divs with better content preservation
      .replace(/<div>[\s\n]*<div>/gi, '\n')
      .replace(/<\/div>[\s\n]*<\/div>/gi, '\n\n')
      
      // Handle paragraph tags with proper spacing
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      
      // Handle line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      
      // Convert common HTML entities
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

      // Explicitly preserve strong formatting for section headings
    cleanedContent = cleanedContent
    .replace(/\*\*(WINE NOTES|TASTING NOTES|PAIRING RECOMMENDATION)\*\*/gi, 
             '### $1 ###');  // Use distinctive markers
    
    // Special handling for nested content we might miss with regex
    // Replace any div or span tags with their content
    cleanedContent = cleanedContent.replace(/<(div|span)[^>]*>([\s\S]*?)<\/\1>/gi, '$2');
    
    // Then remove any remaining HTML tags
    cleanedContent = cleanedContent.replace(/<\/?[^>]+(>|$)/g, '');
    
    // Cleanup extra whitespace but preserve proper paragraph breaks
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');
    
    // Remove leading/trailing whitespace
    return cleanedContent.trim();
}

module.exports = { cleanHtmlContent };