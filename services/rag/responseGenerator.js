// services/rag/responseGenerator.js
// Enhanced response generation with strict validation

const openai = require('../../config/openai');
const logger = require('../../utils/logger');
const { extractWinesFromKnowledgeBase } = require('./utils/knowledgeUtils');

/**
 * Generate a response using the LLM
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {Object} context - Context information with documents
 * @param {Object} additionalData - Optional additional data
 * @returns {Promise<Object>} - Generated response
 */
async function generateResponse(query, queryInfo, context, additionalData = {}) {
  try {
    // Construct context from relevant documents
    const contextText = context.documents.map(doc => doc.pageContent).join('\n\n');
    
    // Add vintages information if available
    const vintagesInfo = context.otherVintages.length > 0 
      ? `Other vintages: ${context.otherVintages.map(v => `${v.vintage}${v.isAvailable ? ' (Available)' : ' (Not Available)'}`).join(', ')}`
      : '';
    
    // ✅ IMPROVED: Extract actual wines from knowledge base for suggestion validation
    const knownWines = await extractWinesFromKnowledgeBase();
    
    // ✅ IMPROVED: Enhance additionalData with verified information
    const enhancedData = {
      ...additionalData,
      knownWines
    };
    
    // Construct a dynamic prompt based on the query type
    const promptTemplate = constructPrompt(query, queryInfo, contextText, vintagesInfo, enhancedData);
    
    // Use OpenAI to generate response
    const response = await openai.chat.completions.create({
      model: "gpt-4",
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
 * Construct a prompt for the LLM
 * @param {string} query - User's query
 * @param {Object} queryInfo - Query classification information
 * @param {string} contextText - Context text from documents
 * @param {string} vintagesInfo - Information about wine vintages
 * @param {Object} additionalData - Optional additional data with known wines
 * @returns {string} - Constructed prompt
 */
function constructPrompt(query, queryInfo, contextText, vintagesInfo, additionalData) {
  // Base prompt template
  let promptTemplate = `
You are an AI assistant for Milea Estate Vineyard, specializing in providing information about their wines, visiting experiences, and events.

CONTEXT INFORMATION:
${contextText}

${vintagesInfo ? `VINTAGE INFORMATION:\n${vintagesInfo}\n\n` : ''}

USER QUERY: "${query}"

Based on the context information provided, give a detailed response that addresses the user's query. 
`;

  // ✅ IMPROVED: Add strict instruction to ONLY use verified wines
  if (queryInfo.type === 'wine' || (additionalData && additionalData.knownWines)) {
    promptTemplate += `
CRITICAL WINE INSTRUCTION:
You MUST ONLY reference actual wines from Milea Estate Vineyard. Here is the list of confirmed wines:
${getWineListPrompt(additionalData.knownWines)}

DO NOT suggest any wines that are not on this list. If you need to suggest alternatives, ONLY use wines from this list.
`;
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

Keep your response factual based on the provided context. If information isn't available in the context, acknowledge this limitation rather than making up details.
`;

  // If handling multiple wines, add clarification instructions
  if (additionalData.isMultipleWines) {
    promptTemplate = getMultipleWinesPrompt(query, queryInfo, contextText, additionalData);
  }

  return promptTemplate;
}

/**
 * ✅ NEW FUNCTION: Format the list of known wines for inclusion in the prompt
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
  switch (queryInfo.type) {
    case 'club':
      return `
For wine club queries, include:
- Membership tier names and options
- Number of bottles per shipment
- Pricing information for each tier
- Benefits and discounts
- How to join the club
`;
    case 'wine':
      return `
For wine-related queries, include:
- Description and tasting notes
- Price information (ALWAYS include the price if it appears in the Product Information section)
- Vintage information (the year, typically 4 digits like 2022, or "NV" for non-vintage)
- Any special characteristics mentioned
- Mention that wine club members receive discounts on all wine purchases

IMPORTANT WINE GUIDANCE: 
1. DO NOT mention the wine's availability status (Available/Not Available).
2. Instead, direct customers to check the web store at https://mileaestatevineyard.com/acquire/ for current availability.
3. The vintage year should be clearly stated at the beginning of your response (e.g., "The 2022 Reserve Cabernet Franc is...").
4. DO NOT fabricate any wines that aren't in the context. Only discuss wines from the verified list.
5. NEVER suggest a wine in "Did you mean?" unless it is on the verified list I provided above.
`;
    case 'visiting':
      return `
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
`;
    case 'merchandise':
      return `
For merchandise queries, include:
- Product descriptions
- Pricing information when available
- Any special features or materials
- How to purchase these items
`;
    default:
      return `
Provide a clear, helpful response based on the context information. Include:
- Relevant facts and details
- Specific information addressing the user's query
- Suggestions for related information they might find helpful
`;
  }
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
  
  // ✅ IMPROVED: Only include wines that exist in our knowledge base
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