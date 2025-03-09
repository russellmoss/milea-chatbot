function cleanHtmlContent(content) {
  if (!content) return '';
  
  // Step 1: Just remove HTML tags entirely, preserving content
  let processedContent = content.replace(/<\/?[^>]+(>|$)/g, ' ');
  
  // Step 2: Handle HTML entities
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
  
  // Step 3: Clean up whitespace
  processedContent = processedContent
    .replace(/\s+/g, ' ')
    .trim();
  
  return processedContent;
}