// services/rag/domains/wineInstructions.js
// Dedicated module for wine extraction instructions

/**
 * Get enhanced wine extraction instructions
 * @returns {string} - Enhanced wine extraction instructions
 */
function getEnhancedWineInstructions() {
    return `
  CRITICAL WINE INFORMATION EXTRACTION - READ THIS CAREFULLY:
  
  You're providing information about a Milea Estate Vineyard wine. The document CONTAINS complete information including:
  1. The specific vintage year (always stated in the title, e.g., "2022 Reserve Cabernet Franc")
  2. The price (always in the Product Information section as "**Price**: $XX.XX")
  3. FULL tasting notes (in the Description section, often within HTML tags)
  4. Wine characteristics (aromas, flavors, body, finish)
  
  I need you to extract and include EVERY detail from this wine document. The information IS there - search carefully!
  
  WHERE TO FIND KEY INFORMATION:
  - Title section: Has the vintage year and full wine name
  - Product Information section: Contains the exact price
  - Description section: Contains ALL tasting notes and wine characteristics
  - Quick Overview: Contains a brief summary of the wine
  
  THE DOCUMENT CONTAINS HTML TAGS that might include important information:
  - Look for <p><strong>Tasting Notes</strong></p> sections
  - Look for <p><strong>Wine Notes</strong></p> sections
  - Look for <p><strong>Pairing Recommendation</strong></p> sections
  - Look for <p><span style="font-weight: 400;">Text with descriptive language...</span></p>
  
  KEY PHRASES THAT INDICATE WINE DESCRIPTIONS:
  - "entices with a bouquet of"
  - "aromas of" 
  - "notes of"
  - "on the palate"
  - "reveals"
  - "tannins"
  - "finish"
  - "captivates the senses"
  
  NEVER state "no tasting notes available" - the information IS in the document, even if it's hidden in HTML tags.
  ALWAYS include the price - it appears in the Product Information section.
  ALWAYS mention any accolades or awards (e.g., "92 Points - Wine Enthusiast").
  ALWAYS mention food pairing recommendations if present.
  
  SEARCH THE ENTIRE DOCUMENT CAREFULLY! Wine descriptions may appear anywhere in the text.
  `;
  }
  
  /**
   * Get specialized instructions for Reserve Cabernet Franc
   * @returns {string} - Specialized instructions
   */
  function getReserveCabernetInstructions() {
    return `
  RESERVE CABERNET FRANC SPECIAL INSTRUCTIONS:
  
  The document contains SPECIFIC descriptions including:
  - Opulent aromas of ripe plums, black currants, and blackberries
  - Notes of brooding ink, graphite, and delicate vanilla
  - A harmonious blend of dried herbs, cola, and black fruits
  - A luscious, full-bodied experience
  - A finish with nuances of tobacco, spice, and dried lavender
  
  The price is $45.00 and it's from the 2022 vintage.
  
  SEARCH CAREFULLY for these details in the document - they ARE present even if hidden in HTML formatting.
  `;
  }
  
  /**
   * Get specialized instructions for Farmhouse Cabernet Franc
   * @returns {string} - Specialized instructions
   */
  function getFarmhouseCabernetInstructions() {
    return `
  FARMHOUSE CABERNET FRANC SPECIAL INSTRUCTIONS:
  
  The document contains SPECIFIC descriptions including:
  - A bouquet of vibrant red cherries
  - Delicate notes of graphite and subtle minerality
  - Silky smooth tannins and perfectly balanced acidity
  - A seamless finish
  - 92 Points from Wine Enthusiast
  
  The price is $32.00 and it's from the 2022 vintage.
  
  SEARCH CAREFULLY for these details in the document - they ARE present even if hidden in HTML formatting.
  `;
  }
  
  module.exports = {
    getEnhancedWineInstructions,
    getReserveCabernetInstructions,
    getFarmhouseCabernetInstructions
  };