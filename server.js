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
    // Find similar documents with increased k and filtering
    const relevantDocs = (await searchSimilarDocuments(query, 10))
      .filter(doc => doc.metadata.source.toLowerCase().includes(query.toLowerCase().replace(/\s+/g, '-')))
      .slice(0, 5); // Take top 5 after filtering
    
    // Construct context from relevant documents
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
    
    // Prepare prompt with strict matching
    const prompt = `Context:\n${context}\n\nUser Query: "${query}"\n\nBased on the context, provide a detailed response about the exact wine or product mentioned in the query (e.g., "2022 Reserve Cabernet Franc" or "Queen of the Meadow"). Include product details like type, price, status, and description if available. If the context doesn’t contain an exact match, say: "I couldn’t find specific info about '${query}' in my data, but here’s what I know about similar items:" and provide relevant info. Do not invent details not present in the context.`;
    
    // Use OpenAI to generate response
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3 // Lower temperature for less creativity
    });
    
    return {
      response: response.choices[0].message.content,
      sources: relevantDocs.map(doc => doc.metadata.source)
    };
  } catch (error) {
    console.error('RAG Response Generation Error:', error);
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});