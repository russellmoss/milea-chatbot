// services/rag/context/utils/enhancedHtmlCleaner.js
/**
 * Enhanced HTML Cleaner for Wine Documents
 * 
 * Improved version that properly extracts structured data from HTML tags
 * in wine documents while preserving the semantic meaning.
 */

/**
 * Process HTML content from wine descriptions with enhanced extraction
 * @param {string} content - The content to process
 * @returns {Object} - Processed content and extracted data
 */
function enhancedHtmlCleaner(content) {
  if (!content) return { 
    cleanedContent: '', 
    extractedData: {
      tastingNotes: null,
      wineNotes: null,
      pairingRecommendations: null
    }
  };
  
  // Initialize extracted data
  const extractedData = {
    tastingNotes: null,
    wineNotes: null,
    pairingRecommendations: null
  };
  
  // First, handle specific sections with structured extraction
  
  // Extract Tasting Notes
  const tastingNotesPatterns = [
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*TASTING NOTES\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*Tasting Notes\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
    /<(?:strong|b)>\s*TASTING NOTES\s*(?:<\/strong>|<\/b>)(?:<br\s*\/?>|\s*<\/p>\s*<p[^>]*>)([\s\S]*?)(?=<(?:strong|b)>|<\/div>|<\/p>\s*<p|$)/i,
    /<(?:strong|b)>\s*Tasting Notes\s*(?:<\/strong>|<\/b>)(?:<br\s*\/?>|\s*<\/p>\s*<p[^>]*>)([\s\S]*?)(?=<(?:strong|b)>|<\/div>|<\/p>\s*<p|$)/i
  ];
  
  for (const pattern of tastingNotesPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      extractedData.tastingNotes = cleanHtmlContent(match[1]);
      break;
    }
  }
  
  // Extract Wine Notes
  const wineNotesPatterns = [
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*WINE NOTES\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*Wine Notes\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
    /<(?:strong|b)>\s*WINE NOTES\s*(?:<\/strong>|<\/b>)(?:<br\s*\/?>|\s*<\/p>\s*<p[^>]*>)([\s\S]*?)(?=<(?:strong|b)>|<\/div>|<\/p>\s*<p|$)/i,
    /<(?:strong|b)>\s*Wine Notes\s*(?:<\/strong>|<\/b>)(?:<br\s*\/?>|\s*<\/p>\s*<p[^>]*>)([\s\S]*?)(?=<(?:strong|b)>|<\/div>|<\/p>\s*<p|$)/i
  ];
  
  for (const pattern of wineNotesPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      extractedData.wineNotes = cleanHtmlContent(match[1]);
      break;
    }
  }
  
  // Extract Pairing Recommendations
  const pairingPatterns = [
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*PAIRING RECOMMENDATION[S]?\s*(?:<\/strong>|<\/b>)[:]?(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*Pairing Recommendation[s]?\s*(?:<\/strong>|<\/b>)[:]?(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
    /<(?:strong|b)>\s*PAIRING RECOMMENDATION[S]?[:]?\s*(?:<\/strong>|<\/b>)(?:<br\s*\/?>|\s*<\/p>\s*<p[^>]*>)([\s\S]*?)(?=<(?:strong|b)>|<\/div>|<\/p>\s*<p|$)/i,
    /<(?:strong|b)>\s*Pairing Recommendation[s]?[:]?\s*(?:<\/strong>|<\/b>)(?:<br\s*\/?>|\s*<\/p>\s*<p[^>]*>)([\s\S]*?)(?=<(?:strong|b)>|<\/div>|<\/p>\s*<p|$)/i,
    /<(?:p|div)[^>]*>\s*(?:<strong>|<b>)\s*Pairing[s]?[:]?\s*(?:<\/strong>|<\/b>)(?:<\/p>|<\/div>)\s*<(?:p|div)[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i
  ];
  
  for (const pattern of pairingPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      extractedData.pairingRecommendations = cleanHtmlContent(match[1]);
      break;
    }
  }
  
  // Handle inline pairing recommendations
  if (!extractedData.pairingRecommendations) {
    const inlinePairingMatch = content.match(/<p[^>]*>(?:<strong>|<b>)\s*Pairing Recommendation[s]?[:]?\s*(?:<\/strong>|<\/b>)\s*(.*?)(?:<\/p>)/i);
    if (inlinePairingMatch && inlinePairingMatch[1]) {
      extractedData.pairingRecommendations = cleanHtmlContent(inlinePairingMatch[1]);
    }
  }
  
  // Clean the entire content
  const cleanedContent = cleanHtmlContent(content);
  
  return {
    cleanedContent,
    extractedData
  };
}

/**
 * Clean HTML content while preserving structure
 * @param {string} content - Content with HTML
 * @returns {string} - Cleaned content
 */
function cleanHtmlContent(content) {
  if (!content) return '';
  
  let cleanedContent = content;
  
  // Handle HTML entities
  cleanedContent = cleanedContent
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
    .replace(/&ccedil;/g, "ç")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&uacute;/g, "ú")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&aacute;/g, "á")
    .replace(/&lsquo;/g, "'")
    .replace(/&bull;/g, "•")
    .replace(/&reg;/g, "®")
    .replace(/&copy;/g, "©")
    .replace(/&trade;/g, "™")
    .replace(/&deg;/g, "°")
    .replace(/&raquo;/g, "»")
    .replace(/&laquo;/g, "«");
  
  // Extract text from HTML tags while preserving structure
  cleanedContent = cleanedContent
    .replace(/<div[^>]*>/g, '')  // Remove div opening tags
    .replace(/<\/div>/g, '\n\n') // Replace div closing tags with line breaks
    .replace(/<p[^>]*>/g, '')    // Remove paragraph opening tags
    .replace(/<\/p>/g, '\n\n')   // Replace paragraph closing tags with line breaks
    .replace(/<br\s*\/?>/g, '\n') // Replace <br> with newline
    .replace(/<strong[^>]*>(.*?)<\/strong>/gs, '**$1**') // Convert strong to markdown bold
    .replace(/<b[^>]*>(.*?)<\/b>/gs, '**$1**')           // Convert b to markdown bold
    .replace(/<em[^>]*>(.*?)<\/em>/gs, '*$1*')         // Convert em to markdown italic
    .replace(/<i[^>]*>(.*?)<\/i>/gs, '*$1*')           // Convert i to markdown italic
    .replace(/<span[^>]*>(.*?)<\/span>/gs, '$1')       // Remove span tags, keep content
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gs, '**$1**\n\n') // Replace headings with bold
    .replace(/<li[^>]*>(.*?)<\/li>/gs, '• $1\n')       // Convert list items to bullet points
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gs, '\n'); // Remove list containers
  
  // Fix multiple consecutive newlines
  cleanedContent = cleanedContent
    .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with double newlines
    .trim();
  
  return cleanedContent;
}

module.exports = {
  enhancedHtmlCleaner,
  cleanHtmlContent
};