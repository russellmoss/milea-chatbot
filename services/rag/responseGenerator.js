// services/rag/enhancedResponseGenerator.js
const openai = require('../../config/openai');
const logger = require('../../utils/logger');
const { extractWinesFromKnowledgeBase } = require('./utils/knowledgeUtils');

/**
 * Generate a response using the LLM with enhanced wine information extraction
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information with documents
 * @param {Object} additionalData - Optional additional data
 * @returns {Promise<Object>} - Generated response
 */
async function generateResponse(query, queryInfo, context, additionalData = {}) {
  try {
    // Construct context from relevant documents with enhanced processing
    let contextText = '';
    
    // Special handling for wine documents to ensure all information is preserved
    if (queryInfo.type === 'wine') {
      // Prioritize primary document and extract its content in detail
      contextText = context.documents.map((doc, index) => {
        // Add special markers for wine document content for better extraction
        if (index === 0 && doc.metadata?.source?.toLowerCase().includes('wine_')) {
          return `==== WINE DOCUMENT START ====\n${doc.pageContent}\n==== WINE DOCUMENT END ====`;
        }
        return doc.pageContent;
      }).join('\n\n');
    } else {
      // For non-wine queries, use standard document joining
      contextText = context.documents.map(doc => doc.pageContent).join('\n\n');
    }

    logger.info(`Sending context to LLM (first 200 chars): "${contextText.substring(0, 200)}..."`);
    
    // Add vintages information if available
    const vintagesInfo = context.otherVintages?.length > 0 
      ? `Other vintages: ${context.otherVintages.map(v => `${v.vintage}${v.isAvailable ? ' (Available)' : ' (Not Available)'}`).join(', ')}`
      : '';
    
    // Extract actual wines from knowledge base for suggestion validation
    const knownWines = await extractWinesFromKnowledgeBase();
    
    // Check for Rose wine special handling
    const isRoseQuery = query.toLowerCase().includes('rose') || 
                       query.toLowerCase().includes('rosé') ||
                       query.toLowerCase().includes('queen of the meadow');
    
    // Enhance additionalData with verified information
    const enhancedData = {
      ...additionalData,
      knownWines,
      isRoseQuery
    };
    
    // Construct a dynamic prompt based on the query type
    const promptTemplate = constructPrompt(query, queryInfo, contextText, vintagesInfo, enhancedData);
    
    // Use OpenAI to generate response with appropriate model
    const model = determineModel(queryInfo);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: promptTemplate }],
      temperature: 0.2 // Lower temperature for more factual responses
    });
    
    return {
      response: response.choices[0].message.content,
      sources: context.documents.map(doc => doc.metadata.source)
    };
  } catch (error) {
    logger.error('Response generation error:', error);
    return { 
      response: "I apologize, but I'm having trouble generating a response right now.",
      sources: []
    };
  }
}


/**
 * Determine the appropriate model based on query complexity
 * @param {Object} queryInfo - Query classification information
 * @returns {string} - Model name to use
 */
function determineModel(queryInfo) {
  // Simple query types can use a faster model
  const simpleQueryTypes = ['business-hours', 'visiting-hours', 'visiting-directions'];
  const useSimpleModel = simpleQueryTypes.includes(queryInfo.type) || 
                          (queryInfo.type === 'visiting' && simpleQueryTypes.includes(queryInfo.subtype));
  
  return useSimpleModel ? "gpt-3.5-turbo" : "gpt-4";
}

/**
 * Enhanced wine instructions with stronger extraction guidance
 * @returns {string} - Enhanced instructions for wine extraction
 */
function getEnhancedWineInstructions() {
  return `
CRITICAL WINE DETAIL EXTRACTION - READ THIS CAREFULLY:

You're provided a wine document from Milea Estate Vineyard. I need you to:

1. ALWAYS include EVERY detail from the wine document in your response
2. There ARE tasting notes in the document - look for sections labeled with "WINE NOTES", "TASTING NOTES", "Tasting Notes", etc.
3. Search for phrases like "entices with", "aromas of", "on the palate", "flavor", "notes", "bouquet" - these indicate wine descriptions
4. Extract ALL descriptive text about the wine's flavor, aroma, color, texture, and finish
5. Pay special attention to sentences that mention fruits, spices, herbs, flowers, or sensory experiences
6. Look for content inside HTML tags - many wine details are inside <p> tags or between <strong> tags
7. If you see words like "blackberry", "cherry", "plum", "oak", "tannin", "finish", etc. - these are DEFINITELY wine characteristics
8. NEVER reply with "no tasting notes available" or "information not provided" - the information IS in the document
9. Always include the exact price in dollars if available
10. Always state the vintage year at the beginning of your response
11. For suggestions, ONLY recommend verified wines from Milea Estate Vineyard
12. The content may appear in raw markdown format with section headings like # and ## - these indicate sections, not HTML tags
13. Look for wine details under headings like "Description", "Product Information", "Quick Overview"
14. Pay special attention to descriptive paragraphs that mention flavors, aromas, or tasting experiences
15. Assume ALL content is important wine information - there are no unimportant parts
16. ALWAYS include the specific price in dollars if available (look for "Price" under Product Information)

The document DOES contain wine descriptions - they might be in HTML format, markdown format, or in specific sections. Read the ENTIRE document carefully.
`;
}

/**
 * Create a prompt for the LLM
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {string} contextText - Context text from documents
 * @param {string} vintagesInfo - Information about wine vintages
 * @param {Object} additionalData - Optional additional data with known wines
 * @returns {string} - Constructed prompt
 */
function constructPrompt(query, queryInfo, contextText, vintagesInfo, additionalData) {
  // Base prompt template with stronger extraction guidance
  let promptTemplate = `
You are an AI assistant for Milea Estate Vineyard, specializing in providing information about their wines, visiting experiences, and events.

CONTEXT INFORMATION:
${contextText}

${vintagesInfo ? `VINTAGE INFORMATION:\n${vintagesInfo}\n\n` : ''}

USER QUERY: "${query}"

Your context contains content that may have HTML formatting or markdown formatting. Extract ALL information from it, including content within HTML tags and markdown sections. Pay special attention to wine descriptions, tasting notes, and characteristics that might be embedded in HTML or under markdown headings.

Based on the context information provided, give a detailed response that addresses the user's query. 
`;

  // Add special handling for Rose queries
  if (additionalData.isRoseQuery) {
    promptTemplate += `
SPECIAL ROSE WINE INSTRUCTIONS:
The user is asking about a Rose wine. Make sure to extract and include ALL information about the Rose wine, including:
1. The specific vintage year
2. Complete tasting notes
3. Color descriptions
4. Aroma profiles
5. Flavor characteristics
6. Any special production methods
7. Food pairing suggestions if available

THERE ARE wine details in the context - search carefully through all the content including HTML sections and markdown headings.
`;
  }

  // Add strict instruction to ONLY use verified wines
  if (queryInfo.type === 'wine' || (additionalData && additionalData.knownWines)) {
    promptTemplate += `
CRITICAL WINE INSTRUCTION:
You MUST ONLY reference actual wines from Milea Estate Vineyard. Here is the list of confirmed wines:
${getWineListPrompt(additionalData.knownWines)}

DO NOT suggest any wines that are not on this list. If you need to suggest alternatives, ONLY use wines from this list.
`;
  }

  // Include any special wine instructions from the handler
  if (additionalData.specialWineInstructions) {
    promptTemplate += additionalData.specialWineInstructions;
  } else if (queryInfo.type === 'wine') {
    // Always include enhanced wine instructions for wine queries
    promptTemplate += getEnhancedWineInstructions();
  }

  // Add specific instructions based on query type
  promptTemplate += getDomainSpecificInstructions(queryInfo);
  
  // Common formatting and style instructions
  promptTemplate += `
IMPORTANT FORMATTING:
1. Use clear headings and bullet points when appropriate to organize information.
2. Include specific details from the context such as times, prices, and locations.
3. Use a warm, conversational tone as if you're a knowledgeable vineyard host.
4. Use fun, appropriate emojis throughout your response to make it more engaging (e.g., 🍷 for wine, 🕒 for hours, 🚗 for directions).

${queryInfo.type === 'wine' ? `
ALWAYS end your response with a "Did you mean?" section that offers 2-3 VERIFIED wine products from the known wines list I provided above, or other queries the user might be interested in. NEVER suggest wines that aren't on the verified list.
` : `
ALWAYS end your response with a "Did you mean?" or "Also consider:" section that offers 2-3 related products or alternative queries the user might be interested in.
`}

Keep your response factual based on the provided context. Extract every detail from the context to provide comprehensive information.
`;

  // If handling multiple wines, add clarification instructions
  if (additionalData.isMultipleWines) {
    promptTemplate = getMultipleWinesPrompt(query, queryInfo, contextText, additionalData);
  }

  return promptTemplate;
}

/**
 * Format the list of known wines for inclusion in the prompt
 * @param {Array} knownWines - List of verified wines from knowledge base
 * @returns {string} - Formatted string of wines for prompt
 */
function getWineListPrompt(knownWines) {
  if (!knownWines || knownWines.length === 0) {
    return "- No specific wines provided, please do not suggest specific wines.";
  }
  
  return knownWines.map(wine => `- ${wine.name} (${wine.vintage || 'Unknown vintage'})`).join('\n');
}

/**
 * Get domain-specific instructions based on query type
 * @param {Object} queryInfo - Query classification information
 * @returns {string} - Domain-specific prompt instructions
 */
function getDomainSpecificInstructions(queryInfo) {
  // Define standard domain instructions
  const domainInstructions = {
    'club': `
For wine club queries, include:
- Membership tier names and options
- Number of bottles per shipment
- Pricing information for each tier
- Benefits and discounts
- How to join the club
`,
    'wine': `
For wine-related queries, include:
- COMPLETE description and tasting notes (extract ALL details from the context)
- Price information (ALWAYS include the price if it appears in the Product Information section)
- Vintage information (the year, typically 4 digits like 2022, or "NV" for non-vintage)
- ALL special characteristics mentioned in the context
- ALL flavor profiles and aromas described
- Mention that wine club members receive discounts on all wine purchases

IMPORTANT WINE GUIDANCE: 
1. DO NOT mention the wine's availability status (Available/Not Available).
2. The vintage year should be clearly stated at the beginning of your response (e.g., "The 2022 Reserve Cabernet Franc is...").
3. DO NOT fabricate any wines that aren't in the context. Only discuss wines from the verified list.
4. NEVER suggest a wine in "Did you mean?" unless it is on the verified list I provided above.
5. Make sure to include ALL tasting notes and wine notes from the context, even if they appear within HTML tags or markdown sections.
6. Carefully extract ALL details about aromas, flavors, and vineyard information.
7. If you see the markers ==== WINE DOCUMENT START ==== and ==== WINE DOCUMENT END ====, pay special attention to everything between these markers.
8. If you find any wine characteristics in the context, ALWAYS include them in your response.
9. Look carefully for price information in the "Product Information" section, which is typically formatted as "**Price**: $XX.XX"
`,
    'visiting': `
For visiting-related queries, include:
- Specific details such as times, addresses, and requirements
- Clear instructions for visitors
- Contact information if appropriate

${queryInfo.subtype === 'visiting-hours' ? 'Be sure to emphasize the specific hours of operation and any seasonal adjustments.' : ''}
${queryInfo.subtype === 'visiting-directions' ? 'Provide clear directions and address information, noting any GPS navigation issues.' : ''}
${queryInfo.subtype === 'visiting-reservations' ? 'Explain the reservation process, options, and how to book.' : ''}
${queryInfo.subtype === 'visiting-accommodations' ? 'List recommended accommodations with distances from the vineyard.' : ''}
${queryInfo.subtype === 'visiting-attractions' ? 'Describe local attractions and activities near the vineyard.' : ''}
${queryInfo.subtype === 'visiting-experiences' ? 'Detail the tasting experiences available, including pricing and what they include.' : ''}
`,
    'merchandise': `
For merchandise queries, include:
- Product descriptions
- Pricing information when available
- Any special features or materials
- How to purchase these items
`,
    'loyalty': `
For loyalty program queries, include:
- Details about the Milea Miles program
- How points are earned for different activities
- Point values for different redemption options
- Membership benefits and differences for wine club members
- Any current promotions or limited-time offers
`
  };
  
  // First check if we have specific instructions for this domain
  if (domainInstructions[queryInfo.type]) {
    return domainInstructions[queryInfo.type];
  }
  
  // For unspecified domains, return generic instructions
  return `
Provide a clear, helpful response based on the context information about ${queryInfo.type.replace(/_/g, ' ')}. Include:
- Relevant facts and details
- Specific information addressing the user's query
- Suggestions for related information they might find helpful
`;
}

/**
 * Create a prompt for multiple wines clarification
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {string} contextText - Context text from documents
 * @param {Object} additionalData - Additional data with wine information
 * @returns {string} - Specialized prompt for multiple wines
 */
function getMultipleWinesPrompt(query, queryInfo, contextText, additionalData) {
  // Format the list of available wines
  const wineType = queryInfo.wineTerms[0] || "wine";
  
  // Only include wines that exist in our knowledge base
  const verifiedOptions = additionalData.knownWines ? 
    additionalData.knownWines
      .filter(wine => wine.name.toLowerCase().includes(wineType))
      .map(wine => `- ${wine.name} (${wine.vintage || 'Unknown vintage'})`)
      .join('\n') :
    "- No specific wines verified";
  
  return `
You are an AI assistant for Milea Estate Vineyard. The user has asked about "${wineType}" wines, but we have multiple "${wineType}" wines in our collection. 

VERIFIED WINES:
${verifiedOptions}

Please respond with a warm, conversational message that:
1. Acknowledges their interest in our ${wineType} wines
2. Explains that we have several different ${wineType} wines they might be interested in
3. Lists ONLY the verified wines from the above list, clearly with bullet points
4. Asks which specific wine they'd like to know more about
5. Includes 1-2 appropriate emojis (like 🍷 for wine)

IMPORTANT:
- DO NOT list any wines that aren't in the verified list above
- Do NOT provide detailed information about any specific wine yet
- Keep your response brief and focused on clarifying which wine they want to know about
- Don't mention availability unless all wines are unavailable
- Maintain a friendly, helpful wine expert tone

USER QUERY: "${query}"

CONTEXT:
${contextText}
`;
}

module.exports = {
  generateResponse
};