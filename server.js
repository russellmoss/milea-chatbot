require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");
const { searchSimilarDocuments } = require("./utils/vectorStore");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Commerce7 API Credentials
const C7_APP_ID = process.env.C7_APP_ID;
const C7_SECRET_KEY = process.env.C7_SECRET_KEY;
const C7_TENANT_ID = process.env.C7_TENANT_ID;

// Base authentication configuration for Commerce7
const authConfig = {
    auth: {
        username: C7_APP_ID,
        password: C7_SECRET_KEY,
    },
    headers: {
        Tenant: C7_TENANT_ID,
        "Content-Type": "application/json",
    },
};

// Generate RAG Response
async function generateRAGResponse(query) {
  try {
    console.log(`🔎 Processing query: "${query}"`);
    
    // Retrieve documents based on semantic similarity
    const semanticResults = await searchSimilarDocuments(query, 12); // Increased to find more potential vintages
    console.log(`📚 Found ${semanticResults.length} semantically similar documents`);
    
    // Process query for keyword matching
    const queryTerms = query.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .split(/\s+/) // Split by whitespace
      .filter(term => term.length > 3); // Only keep terms longer than 3 chars
    
    console.log(`🔑 Extracted keywords: ${queryTerms.join(', ')}`);
    
    // Extract wine name without year for grouping vintages
    const wineNameMatch = query.match(/([a-zA-Z\s]+)/);
    const wineNameBase = wineNameMatch ? wineNameMatch[0].trim().toLowerCase() : '';
    console.log(`🍷 Base wine name for vintage grouping: "${wineNameBase}"`);
    
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
      
      // Extra checks for wine-specific queries
      if (query.toLowerCase().includes('wine') && source.startsWith('wine_')) {
        keywordScore += 15; // Boost wine documents for wine queries
      }
      
      // Special boost for reserve cabernet franc explicitly
      if (query.toLowerCase().includes('reserve cabernet franc') && 
          source.includes('reserve-cabernet-franc')) {
        keywordScore += 25;
      }
      
      // Extract vintage year from filename or content
      let vintage = 0;
      const vintageMatch = source.match(/-(\d{4})-/) || content.match(/\b(20\d{2})\b/);
      if (vintageMatch) {
        vintage = parseInt(vintageMatch[1]);
      }
      
      // Extract availability status from content
      const isAvailable = !content.includes('Not Available') && 
                         content.includes('Available / Available');
      
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
    console.log('🏆 Top document matches:');
    scoredDocs.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i+1}. Score: ${item.score}, Source: ${item.doc.metadata.source}, Vintage: ${item.vintage}, Available: ${item.isAvailable}`);
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
    
    console.log(`🍷 Found ${Object.keys(wineGroups).length} wine groups`);
    
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
        
        console.log(`🍷 Selected primary vintage: ${wineGroups[bestGroup][0].vintage} (Available: ${wineGroups[bestGroup][0].isAvailable})`);
        console.log(`🍷 Other vintages found: ${otherVintages.length}`);
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
    
    // Improved prompt for wine domain with vintage handling
    const prompt = `
You are an AI assistant for Milea Estate Vineyard, specializing in providing information about their wines and products.

CONTEXT INFORMATION:
${context}

${vintagesInfo ? `VINTAGE INFORMATION:\n${vintagesInfo}\n\n` : ''}

USER QUERY: "${query}"

Based on the context information provided, give a detailed response about the wine or product mentioned. Include specific details from the context such as:
- Description and tasting notes
- Price information if available (ONLY for currently available wines)
- Vintage information
- Any special characteristics mentioned

IMPORTANT: Never mention prices for wines that are not currently available. If a wine is marked as "Not Available", you should mention that it exists but do not reference its historical price.

${vintagesInfo ? 'At the end of your response, mention the other vintages that exist and ask if the user would like information about those instead, but only mention price information for vintages that are currently available.' : ''}

If the exact product isn't in the context, clearly state: "I don't have detailed information about that specific wine in my database." Then provide information about similar products if available.

Keep your tone warm and conversational, as if you're a knowledgeable wine expert at the vineyard speaking to a visitor. Don't invent information not present in the context.
`;

    // Use OpenAI to generate response
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
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
    console.error('❌ RAG Response Generation Error:', error);
    return { 
      response: "I apologize, but I'm having trouble generating a response right now.",
      sources: []
    };
  }
}

// Add a new RAG-enhanced chat endpoint
app.post("/rag-chat", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("📝 Processing RAG chat request:", message);
    
    const ragResponse = await generateRAGResponse(message);
    
    res.json({
      response: ragResponse.response,
      sources: ragResponse.sources
    });
  } catch (error) {
    console.error("❌ RAG Chat Error:", error);
    res.status(500).json({ 
      error: "Error processing request",
      message: "I apologize, but I encountered an issue while processing your request."
    });
  }
});

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

app.get("/", (req, res) => {
    res.send("Milea Chatbot Server Running!");
});

// Chat endpoint (non-RAG, basic OpenAI chat)
app.post("/chat", async (req, res) => {
    try {
        const { message } = req.body;
        console.log("📝 Processing chat request:", message);
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: message }],
        });
        
        res.json({ response: response.choices[0].message.content });
    } catch (error) {
        console.error("❌ OpenAI API Error:", error);
        res.status(500).json({ error: "Error processing request" });
    }
});

// Add this to your server.js file
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});