const express = require('express');
const axios = require('axios');
const { authConfig } = require('../config/commerce7');

const router = express.Router();

// ✅ Fetch all wine products with pagination support
router.get('/products', async (req, res) => {
    try {
        console.log("📡 Fetching products from Commerce7...");
        
        // Get pagination parameters from query string or use defaults
        // Commerce7 API has a maximum limit of 50
        const limit = parseInt(req.query.limit) || 50;  // Default and maximum is 50
        const page = parseInt(req.query.page) || 1;      // Default to first page
        const fetchAll = req.query.fetchAll === 'true';  // Whether to fetch all pages
        
        // Initialize products array
        let allProducts = [];
        let hasMorePages = true;
        let currentPage = page;
        let totalCount = 0;
        const MAX_PAGES = 20; // Safety limit to prevent infinite loops (increased from 10)
        
        console.log(`🔄 Fetching ${fetchAll ? 'all products' : `page ${page} with limit ${limit}`}`);
        
        // Loop through pages if fetchAll is true
        while (hasMorePages && (fetchAll || currentPage === page) && currentPage <= MAX_PAGES) {
            console.log(`📄 Fetching page ${currentPage}...`);
            
            try {
                // Make sure limit is 50 or less to avoid 422 errors
                const safeLimit = Math.min(limit, 50);
                
                const response = await axios.get(
                    `https://api.commerce7.com/v1/product?limit=${safeLimit}&page=${currentPage}`, 
                    authConfig
                );
                
                if (!response.data || !response.data.products) {
                    console.warn("⚠️ Invalid response structure from Commerce7");
                    break;
                }
                
                const pageProducts = response.data.products;
                totalCount = response.data.total || pageProducts.length + (currentPage - 1) * safeLimit;
                
                console.log(`✅ Retrieved ${pageProducts.length} products from page ${currentPage}`);
                
                // Log sample of products retrieved (first 3)
                if (pageProducts.length > 0) {
                    console.log("📋 Sample products retrieved:");
                    pageProducts.slice(0, 3).forEach((p, idx) => {
                        console.log(`   ${idx+1}. ${p.title} (Status: ${p.adminStatus}/${p.webStatus})`);
                    });
                }
                
                allProducts = [...allProducts, ...pageProducts];
                
                // Check if we should fetch the next page
                if (fetchAll && pageProducts.length === safeLimit && pageProducts.length > 0) {
                    currentPage++;
                } else {
                    hasMorePages = false;
                }
            } catch (error) {
                console.error(`❌ Error fetching page ${currentPage}:`, error.message);
                if (error.response) {
                    console.error(`   Status: ${error.response.status}`);
                    console.error(`   Data:`, error.response.data);
                }
                hasMorePages = false;
                if (!allProducts.length) {
                    // Only throw if we haven't fetched any products yet
                    throw error;
                }
            }
        }
        
        console.log(`🏁 Total products retrieved: ${allProducts.length} from ${currentPage - (page - 1)} page(s)`);
        
        // Return the combined result
        res.json({
            products: allProducts,
            total: totalCount,
            page: page,
            limit: limit,
            pagesFetched: currentPage - (page - 1),
            totalPages: Math.ceil(totalCount / limit),
            hasMorePages: hasMorePages
        });
    } catch (error) {
        console.error('❌ Error fetching products:', error.message);
        
        // Enhanced error logging
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch products',
            details: error.response?.data || error.message,
            status: error.response?.status
        });
    }
});

// ✅ Search products by term
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.status(400).json({ error: "Search term is required" });
        }

        console.log(`📡 Searching products with term: "${searchTerm}"`);
        
        // Get pagination parameters (maximum 50 per page)
        const limit = Math.min(parseInt(req.query.limit) || 50, 50);
        const page = parseInt(req.query.page) || 1;
        
        const response = await axios.get(
            `https://api.commerce7.com/v1/product/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}&page=${page}`, 
            authConfig
        );
        
        console.log(`✅ Search results received for: "${searchTerm}" - Found: ${response.data.products?.length || 0} products`);
        
        // Log sample of products found (first 3)
        if (response.data.products?.length > 0) {
            console.log("📋 Sample products found in search:");
            response.data.products.slice(0, 3).forEach((p, idx) => {
                console.log(`   ${idx+1}. ${p.title}`);
            });
        }
        
        res.json(response.data);
    } catch (error) {
        console.error(`❌ Error searching products with term "${req.query.q}":`, error.message);
        
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to search products',
            details: error.response?.data || error.message,
            term: req.query.q
        });
    }
});

// ✅ Fetch a single product by ID
router.get('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;  
        if (!productId) {
            return res.status(400).json({ error: "Product ID is required" });
        }

        console.log(`📡 Fetching specific product: ${productId}`);
        const response = await axios.get(`https://api.commerce7.com/v1/product/${productId}`, authConfig);
        console.log(`✅ Product data received for ID: ${productId}`);
        
        res.json(response.data);
    } catch (error) {
        console.error(`❌ Error fetching product ${req.params.id}:`, error.message);
        
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch product',
            productId: req.params.id,
            details: error.response?.data || error.message
        });
    }
});

// ✅ Fetch inventory details
router.get('/inventory/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(400).json({ error: "Product ID is required" });
        }

        console.log(`📡 Fetching inventory for product: ${productId}`);
        const response = await axios.get(`https://api.commerce7.com/v1/inventory/${productId}`, authConfig);
        console.log(`✅ Inventory data received for product: ${productId}`);
        
        res.json(response.data);
    } catch (error) {
        console.error(`❌ Error fetching inventory for ${req.params.id}:`, error.message);
        
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch inventory',
            productId: req.params.id,
            details: error.response?.data || error.message
        });
    }
});

// ✅ Fetch customer club membership status
router.get('/club-status/:customerId', async (req, res) => {
    try {
        const customerId = req.params.customerId;
        if (!customerId) {
            return res.status(400).json({ error: "Customer ID is required" });
        }

        console.log(`📡 Fetching club membership for customer: ${customerId}`);
        const response = await axios.get(`https://api.commerce7.com/v1/customer/${customerId}/club-membership`, authConfig);
        console.log(`✅ Club membership data received for customer: ${customerId}`);

        if (response.data.total === 0) {
            return res.json({ message: "No active club memberships found." });
        }

        res.json(response.data);
    } catch (error) {
        console.error(`❌ Error fetching club membership for ${req.params.customerId}:`, error.message);
        
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch club membership status',
            customerId: req.params.customerId,
            details: error.response?.data || error.message
        });
    }
});

// ✅ Helper route to test connection
router.get('/test-connection', async (req, res) => {
    try {
        console.log("🔄 Testing Commerce7 API connection...");
        const response = await axios.get('https://api.commerce7.com/v1/ping', authConfig);
        console.log("✅ Commerce7 API connection successful!");
        
        res.json({ 
            status: 'success', 
            message: 'Successfully connected to Commerce7 API'
        });
    } catch (error) {
        console.error("❌ Commerce7 API connection failed:", error.message);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to connect to Commerce7 API',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;