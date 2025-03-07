// services/ragService.js
const openai = require('../config/openai');
const { searchSimilarDocuments } = require('../utils/vectorStore');
const { isWineClubQuery, isLikelyWineQuery } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

// Generate RAG Response
async function generateRAGResponse(query) {
  try {
    logger.search(`Processing query: "${query}"`);
    
    // Check if this is a wine club related query
    const isClubQuery = isWineClubQuery(query);
    if (isClubQuery) {
      logger.wine(`Wine club query detected, prioritizing club documentation`);
    }
    
    // Determine if this is likely a wine query
    const isWineQuery = isLikelyWineQuery(query);
    logger.wine(`Is likely a wine query: ${isWineQuery}`);
    
    // Retrieve documents based on semantic similarity
    let semanticResults = await searchSimilarDocuments(query, 12); // Increased to find more potential vintages
    
    // Special handling for club queries - boost club document scores
    if (isClubQuery) {
      semanticResults = semanticResults.map(doc => {
        // Give highest priority to wine-club.md
        if (doc.metadata.source.toLowerCase().includes('wine-club')) {
          return { ...doc, club_priority: true };
        }
        return doc;
      });
      
      // Sort to prioritize club documents first
      semanticResults.sort((a, b) => {
        if (a.club_priority && !b.club_priority) return -1;
        if (!a.club_priority && b.club_priority) return 1;
        return 0;
      });
    }
    // For likely wine queries, boost wine document scores
    else if (isWineQuery) {
      // Sort results to prioritize wine documents
      semanticResults = semanticResults.sort((a, b) => {
        const aIsWine = a.metadata.source.toLowerCase().startsWith('wine_');
        const bIsWine = b.metadata.source.toLowerCase().startsWith('wine_');
        
        if (aIsWine && !bIsWine) return -1;  // Wine products first
        if (!aIsWine && bIsWine) return 1;   // Wine products first
        return 0;  // Otherwise, keep original order
      });
      
      logger.info(`Prioritized wine documents for likely wine query`);
    }
    
    logger.info(`Found ${semanticResults.length} semantically similar documents`);
    
    // Process query for keyword matching
    const queryTerms = query.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .split(/\s+/) // Split by whitespace
      .filter(term => term.length > 3); // Only keep terms longer than 3 chars
    
    logger.info(`Extracted keywords: ${queryTerms.join(', ')}`);
    
    // Extract wine name without year for grouping vintages
    const wineNameMatch = query.match(/([a-zA-Z\s]+)/);
    const wineNameBase = wineNameMatch ? wineNameMatch[0].trim().toLowerCase() : '';
    logger.wine(`Base wine name for vintage grouping: "${wineNameBase}"`);
    
    // Custom scoring for documents based on filename and content
    const scoredDocs = semanticResults.map(doc => {
      const source = doc.metadata.source.toLowerCase();
      const content = doc.pageContent.toLowerCase();
      
      // Calculate keyword match score
      let keywordScore = 0;
      for (const term of queryTerms) {
        // Check filename match (gives higher score)
        if (source.includes(term)) {
          keywordScore += 10;
        }
        
        // Check content match
        if (content.includes(term)) {
          keywordScore += 5;
        }
      }
      
      // Special boost for wine club documents when it's a club query
      if (isClubQuery && source.includes('wine-club')) {
        keywordScore += 200; // Massive boost for wine club documents in club queries
      }
      
      // ALWAYS give a massive boost to wine products when query could refer to a wine
      // This ensures wine products are prioritized over merchandise with similar names
      if (source.startsWith('wine_')) {
        // Boosting score for wine products
        keywordScore += 35; 
        
        // Special case for rosé queries
        if ((query.toLowerCase().includes('rose') || query.toLowerCase().includes('rosé')) && 
            (source.includes('rose') || source.includes('rosé'))) {
          // Give rosé wine a massive boost when someone mentions rose/rosé
          keywordScore += 50;
        }
      }
      
      // Extra checks for wine-specific queries
      if (query.toLowerCase().includes('wine') && source.startsWith('wine_')) {
        keywordScore += 15; // Additional boost for explicit wine queries
      }
      
      // Special boost for explicitly mentioned wines
      const specificWines = [
        {term: 'reserve cabernet franc', pattern: 'reserve-cabernet-franc'},
        {term: 'queen of the meadow', pattern: 'queen-of-the-meadow'},
        {term: 'four seasons', pattern: 'four-seasons'},
        {term: 'proceedo', pattern: 'proceedo'}
      ];
      
      for (const wine of specificWines) {
        if (query.toLowerCase().includes(wine.term) && source.includes(wine.pattern)) {
          keywordScore += 60; // Huge boost for exact wine matches
        }
      }
      
      // Extract vintage year from filename or content
      let vintage = 0;
      // Fix vintage extraction to properly get the year after wine_ at the beginning of filename
      // Also check content for the year at the beginning of the document title
      const vintageMatch = source.match(/^wine_(\d{4}|NV)-/) || content.match(/^# (\d{4}|NV) /);
      if (vintageMatch) {
        // If it's NV (non-vintage), store as string "NV", otherwise parse the year as integer
        vintage = vintageMatch[1] === "NV" ? "NV" : parseInt(vintageMatch[1]);
      }
      
      // Fix availability check - both admin and web status must be "Available"
      const isAvailable = content.includes("Status: Available / Available");
      
      return {
        doc,
        score: keywordScore,
        vintage,
        isAvailable
      };
    });
    
    // Sort by score (highest first)
    scoredDocs.sort((a, b) => b.score - a.score);
    
    // Log top matches for debugging
    logger.info('Top document matches:');
    scoredDocs.slice(0, 3).forEach((item, i) => {
      logger.info(`  ${i+1}. Score: ${item.score}, Source: ${item.doc.metadata.source}, Vintage: ${item.vintage}, Available: ${item.isAvailable}`);
    });
    
    // Get top documents with a positive score
    const topDocsByScore = scoredDocs.filter(item => item.score > 0).map(item => item.doc);
    
    // Group top documents by wine name for vintage handling
    const wineGroups = {};
    
    for (const item of scoredDocs.filter(item => item.score > 0)) {
      const source = item.doc.metadata.source.toLowerCase();
      // Extract base wine name (remove vintage year and ID)
      const baseNameMatch = source.match(/wine_([a-z0-9-]+?)-\d{4}-/);
      
      if (baseNameMatch) {
        const baseName = baseNameMatch[1];
        if (!wineGroups[baseName]) {
          wineGroups[baseName] = [];
        }
        wineGroups[baseName].push(item);
      } else {
        // If we can't extract base name, just use the source
        const simplifiedSource = source.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, '');
        if (!wineGroups[simplifiedSource]) {
          wineGroups[simplifiedSource] = [];
        }
        wineGroups[simplifiedSource].push(item);
      }
    }
    
    logger.wine(`Found ${Object.keys(wineGroups).length} wine groups`);
    
    // Modify document selection based on vintages
    let primaryDoc = null;
    let otherVintages = [];
    
    // If we have wine groups and the query looks wine-related
    if (Object.keys(wineGroups).length > 0 && topDocsByScore.length > 0) {
      // Find the wine group with the highest scored document
      const topItemSource = scoredDocs.filter(item => item.score > 0)[0].doc.metadata.source.toLowerCase();
      let bestGroup = null;
      
      for (const [groupName, items] of Object.entries(wineGroups)) {
        if (topItemSource.includes(groupName)) {
          bestGroup = groupName;
          break;
        }
      }
      
      if (bestGroup && wineGroups[bestGroup].length > 0) {
        // Sort items by: 1) availability, 2) vintage year
        wineGroups[bestGroup].sort((a, b) => {
          if (a.isAvailable !== b.isAvailable) {
            return a.isAvailable ? -1 : 1; // Available wines first
          }
          return b.vintage - a.vintage; // Then by newest vintage
        });
        
        // Primary document is newest available or just newest if none available
        primaryDoc = wineGroups[bestGroup][0].doc;
        
        // Other vintages (exclude the primary one)
        otherVintages = wineGroups[bestGroup]
          .slice(1)
          .map(item => ({
            source: item.doc.metadata.source,
            vintage: item.vintage,
            isAvailable: item.isAvailable
          }));
        
        logger.wine(`Selected primary vintage: ${wineGroups[bestGroup][0].vintage} (Available: ${wineGroups[bestGroup][0].isAvailable})`);
        logger.wine(`Other vintages found: ${otherVintages.length}`);
      }
    }
    
    // If no primary doc was selected from vintage logic, use standard selection
    if (!primaryDoc) {
      primaryDoc = topDocsByScore.length > 0 ? topDocsByScore[0] : semanticResults[0];
    }
    
    // Build final document list with primary doc first
    const docsToUse = [primaryDoc];
    
    // Add other top scoring docs that aren't other vintages of the same wine
    const primarySource = primaryDoc.metadata.source;
    const otherVintageSources = new Set(otherVintages.map(v => v.source));
    
    for (const doc of topDocsByScore.slice(1)) {
      if (doc.metadata.source !== primarySource && !otherVintageSources.has(doc.metadata.source)) {
        docsToUse.push(doc);
        if (docsToUse.length >= 3) break; // Limit to 3 docs total
      }
    }
    
    // Construct context from relevant documents
    const context = docsToUse.map(doc => doc.pageContent).join('\n\n');
    
    // Add vintages information to be used in the prompt
    const vintagesInfo = otherVintages.length > 0 
      ? `Other vintages: ${otherVintages.map(v => `${v.vintage}${v.isAvailable ? ' (Available)' : ' (Not Available)'}`).join(', ')}`
      : '';
    
    // Improved prompt for wine domain with vintage handling, recommendations, and did-you-mean suggestions
    const prompt = `
You are an AI assistant for Milea Estate Vineyard, specializing in providing information about their wines and products.

CONTEXT INFORMATION:
${context}

${vintagesInfo ? `VINTAGE INFORMATION:\n${vintagesInfo}\n\n` : ''}

USER QUERY: "${query}"

${isClubQuery ? `This is a query about wine clubs. If the context includes information about the Milea Estate wine clubs, focus on providing complete details about membership tiers, benefits, pricing, and how to join. This is high priority information.` : ''}

Based on the context information provided, give a detailed response about the ${isClubQuery ? 'wine clubs' : 'wine or product'} mentioned. Include specific details from the context such as:
${isClubQuery ? `
- Membership tier names and options
- Number of bottles per shipment
- Pricing information for each tier
- Benefits and discounts
- How to join the club
` : `
- Description and tasting notes
- Price information (ALWAYS include the price if it appears in the Product Information section)
- Vintage information (the year, typically 4 digits like 2022, or "NV" for non-vintage)
- Any special characteristics mentioned
`}

IMPORTANT: 
1. ALWAYS mention the price information from the Product Information section.
2. DO NOT mention the wine's availability status (Available/Not Available).
3. Instead, direct customers to check the web store at https://mileaestatevineyard.com/acquire/ for current availability.
4. The vintage year should be clearly stated at the beginning of your response (e.g., "The 2023 Hudson Heritage Chambourcin is...").
5. Mention that wine club members receive discounts on all wine purchases.
6. Use fun, appropriate emojis throughout your response to make it more engaging (e.g., 🍷 for wine, 🍇 for grapes, etc.).

${vintagesInfo ? 'Mention the other vintages that exist and ask if the user would like information about those instead.' : ''}

ALWAYS end your response with a "Did you mean?" section that offers 2-3 related products or alternative queries the user might be interested in. Format it like this:

🤔 Did you mean:
- [Alternative 1]? (e.g., "Our 2022 Reserve Cabernet Franc?")
- [Alternative 2]? (e.g., "Information about our wine club membership?")
- [Alternative 3]? (e.g., "Our wine tasting schedule?")

Make these suggestions highly relevant to the query but different enough to expand their options.

If the query is about a general wine category (like "rosé" or "cabernet franc" without specifying a particular vintage), provide a summary of the available information from all matching wines, perhaps starting with the newest vintage.

If the exact product isn't in the context, clearly state: "I don't have detailed information about that specific wine in my database." Then provide information about similar products if available.

Keep your tone warm and conversational, as if you're a knowledgeable wine expert at the vineyard speaking to a visitor. Don't invent information not present in the context.
`;

    // Use OpenAI to generate response
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2 // Lower temperature for more factual responses
    });
    
    return {
      response: response.choices[0].message.content,
      sources: docsToUse.map(doc => doc.metadata.source)
    };
  } catch (error) {
    logger.error('RAG Response Generation Error:', error);
    return { 
      response: "I apologize, but I'm having trouble generating a response right now.",
      sources: []
    };
  }
}

module.exports = {
  generateRAGResponse
};
