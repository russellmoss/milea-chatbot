require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");

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

// Authenticate User with Commerce7
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    console.log(`🔑 Attempting Commerce7 login for: ${email}`);

    try {
        // First, search for the customer by email
        const searchResponse = await axios.get(
            `https://api.commerce7.com/v1/customer`,
            {
                ...authConfig,
                params: { q: email }
            }
        );

        // Check if customer exists
        if (!searchResponse.data.customers || searchResponse.data.customers.length === 0) {
            console.log("❌ Customer not found");
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Customer found - for development purposes we'll allow login without password verification
        // IMPORTANT: In production, implement proper authentication
        const customer = searchResponse.data.customers[0];
        
        // Create a simple token for session management
        const token = Buffer.from(`${customer.id}:${Date.now()}`).toString('base64');

        console.log("✅ Login successful for customer:", customer.id);

        res.json({
            message: "Login successful",
            token,
            customerId: customer.id,
            customerData: {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email
            }
        });
    } catch (error) {
        console.error("❌ Commerce7 Login Error:", error.response?.data || error.message);
        return res.status(401).json({ message: "Invalid email or password" });
    }
});

/**
 * Fetch all orders for a customer with pagination
 * @param {string} customerId - Commerce7 customer ID
 * @param {number} maxPages - Maximum number of pages to fetch (for safety)
 * @returns {Promise<Array>} - Array of orders
 */
async function fetchAllCustomerOrders(customerId, maxPages = 10) {
    console.log(`📋 Fetching all orders for customer: ${customerId}`);
    let allOrders = [];
    let page = 1;
    let hasMorePages = true;
    
    try {
        while (hasMorePages && page <= maxPages) {
            console.log(`📄 Fetching orders page ${page}...`);
            
            const response = await axios.get(
                `https://api.commerce7.com/v1/order`,
                {
                    ...authConfig,
                    params: {
                        customerId: customerId,
                        page: page,
                        limit: 50 // Maximum allowed by Commerce7 API
                    }
                }
            );
            
            const orders = response.data.orders || [];
            allOrders = [...allOrders, ...orders];
            
            console.log(`✅ Received ${orders.length} orders for page ${page}`);
            
            // Check if we've received fewer orders than the limit or no orders
            if (orders.length < 50) {
                hasMorePages = false;
                console.log(`📊 Completed fetching all orders. No more pages.`);
            } else {
                page++;
            }
        }
        
        if (page > maxPages) {
            console.log(`⚠️ Reached maximum page limit (${maxPages}). Some orders may not be included.`);
        }
        
        console.log(`📊 Total orders fetched: ${allOrders.length}`);
        return allOrders;
    } catch (error) {
        console.error("❌ Error fetching all customer orders:", error.response?.data || error.message);
        throw error;
    }
}

// Fetch Customer Data from Commerce7
app.get("/api/customer/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Missing authentication token" });

    const token = authHeader.split(" ")[1];
    
    try {
        const [customerId] = Buffer.from(token, 'base64').toString().split(':');

        if (!customerId) {
            return res.status(403).json({ message: "Invalid token format" });
        }

        // Fetch customer details
        const customerResponse = await axios.get(
            `https://api.commerce7.com/v1/customer/${customerId}`,
            authConfig
        );

        // Fetch ALL customer orders using pagination
        const allOrders = await fetchAllCustomerOrders(customerId);

        // Try to fetch club memberships if available
        let clubMemberships = [];
        try {
            const clubResponse = await axios.get(
                `https://api.commerce7.com/v1/club-membership?customerId=${customerId}`,
                authConfig
            );
            clubMemberships = clubResponse.data.clubMemberships || [];
        } catch (clubError) {
            console.log("Note: Unable to fetch club memberships:", clubError.message);
            // Continue without club data
        }

        // Combine all customer data
        const customerData = customerResponse.data;
        customerData.orders = allOrders;
        customerData.totalOrderCount = allOrders.length;
        customerData.clubMemberships = clubMemberships;

        res.json(customerData);
    } catch (error) {
        console.error("❌ Commerce7 Customer Lookup Error:", error.response?.data || error.message);
        return res.status(403).json({ message: "Failed to retrieve customer data" });
    }
});

app.get("/api/commerce7/products", async (req, res) => {
    try {
      const fetchAll = req.query.fetchAll === 'true';
      
      // If fetchAll is true, we'll need to make multiple requests with pagination
      if (fetchAll) {
        let allProducts = [];
        let page = 1;
        let hasMoreProducts = true;
        
        // Maximum number of pages to fetch (to prevent infinite loops)
        const MAX_PAGES = 10;
        
        while (hasMoreProducts && page <= MAX_PAGES) {
          console.log(`📄 Fetching products page ${page}...`);
          
          const response = await axios.get(
            `https://api.commerce7.com/v1/product`,
            {
              ...authConfig,
              params: {
                page: page,
                limit: 50 // Commerce7 API limit
              }
            }
          );
          
          const products = response.data.products || [];
          allProducts = [...allProducts, ...products];
          
          console.log(`✅ Received ${products.length} products for page ${page}`);
          
          // If we received fewer than 50 products, we've reached the end
          if (products.length < 50) {
            hasMoreProducts = false;
            console.log('📊 Completed fetching all products. No more pages.');
          } else {
            page++;
          }
        }
        
        if (page > MAX_PAGES) {
          console.log(`⚠️ Reached maximum page limit (${MAX_PAGES}). Some products may not be included.`);
        }
        
        console.log(`📊 Total products fetched: ${allProducts.length}`);
        
        // Return all products
        return res.json({ products: allProducts });
      } else {
        // Just fetch a single page (default behavior)
        const response = await axios.get(
          `https://api.commerce7.com/v1/product`,
          {
            ...authConfig,
            params: {
              limit: 50 // Commerce7 API limit
            }
          }
        );
        
        res.json(response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching Commerce7 products:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

app.get("/", (req, res) => {
    res.send("Milea Chatbot Server Running!");
});

// Chat endpoint
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