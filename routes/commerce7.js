const express = require('express');
const axios = require('axios');
const { authConfig } = require('../config/commerce7');
const logger = require('../utils/logger');

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

// =====================================================
// ========== WINE CLUB SIGNUP FUNCTIONALITY ==========
// =====================================================

/**
 * Handle wine club signup submissions
 * This endpoint creates or updates a customer profile and adds a club membership
 */
router.post('/club-signup', async (req, res) => {
  try {
    const clubSignupData = req.body;
    
    logger.info(`Processing wine club signup for ${clubSignupData.firstName} ${clubSignupData.lastName}`);
    
    // Search for existing customer by email
    const existingCustomer = await findCustomerByEmail(clubSignupData.email);
    
    let customerId;
    if (existingCustomer) {
      // Update existing customer
      logger.info(`Updating existing customer: ${existingCustomer.id}`);
      customerId = existingCustomer.id;
      await updateCustomer(customerId, clubSignupData);
    } else {
      // Create new customer
      logger.info('Creating new customer');
      const newCustomer = await createCustomer(clubSignupData);
      customerId = newCustomer.id;
    }
    
    // Handle addresses
    await processAddresses(customerId, clubSignupData.addresses);
    
    // Handle club membership
    const clubMembership = await createClubMembership(customerId, clubSignupData.clubMembership);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Wine club signup successful',
      customerId: customerId,
      clubMembership: clubMembership
    });
    
  } catch (error) {
    logger.error('Error processing wine club signup:', error);
    
    // Determine appropriate error response
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Error processing wine club signup';
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage
    });
  }
});

/**
 * Find a customer by email in Commerce7
 * @param {string} email - Customer email address
 * @returns {Promise<Object|null>} - Customer object if found, null otherwise
 */
async function findCustomerByEmail(email) {
  try {
    const response = await axios.get(
      `https://api.commerce7.com/v1/customer?q=${encodeURIComponent(email)}`,
      authConfig
    );
    
    if (response.data.customers && response.data.customers.length > 0) {
      return response.data.customers[0];
    }
    
    return null;
  } catch (error) {
    logger.error('Error searching for customer:', error);
    return null;
  }
}

/**
 * Create a new customer in Commerce7
 * @param {Object} customerData - Customer information
 * @returns {Promise<Object>} - Created customer object
 */
async function createCustomer(customerData) {
  try {
    const payload = {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      metaData: {
        source: 'wine_club_chatbot'
      }
    };
    
    const response = await axios.post(
      'https://api.commerce7.com/v1/customer',
      payload,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error creating customer:', error);
    throw error;
  }
}

/**
 * Update an existing customer in Commerce7
 * @param {string} customerId - Customer ID
 * @param {Object} customerData - Updated customer information
 * @returns {Promise<Object>} - Updated customer object
 */
async function updateCustomer(customerId, customerData) {
  try {
    const payload = {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      phone: customerData.phone,
      metaData: {
        source: 'wine_club_chatbot_update'
      }
    };
    
    const response = await axios.put(
      `https://api.commerce7.com/v1/customer/${customerId}`,
      payload,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error updating customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Process and manage customer addresses
 * @param {string} customerId - Customer ID
 * @param {Array} addresses - Addresses to process
 * @returns {Promise<Array>} - Processed addresses
 */
async function processAddresses(customerId, addresses) {
  try {
    // Get existing addresses
    const existingAddresses = await getCustomerAddresses(customerId);
    
    // Process each address
    const results = [];
    for (const address of addresses) {
      // Check if same address type exists
      const existingAddress = existingAddresses.find(addr => addr.type === address.type);
      
      if (existingAddress) {
        // Update existing address
        results.push(await updateCustomerAddress(customerId, existingAddress.id, address));
      } else {
        // Create new address
        results.push(await createCustomerAddress(customerId, address));
      }
    }
    
    return results;
  } catch (error) {
    logger.error(`Error processing addresses for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Get a customer's addresses
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Customer addresses
 */
async function getCustomerAddresses(customerId) {
  try {
    const response = await axios.get(
      `https://api.commerce7.com/v1/customer/${customerId}/address`,
      authConfig
    );
    
    return response.data.addresses || [];
  } catch (error) {
    logger.error(`Error getting addresses for customer ${customerId}:`, error);
    return [];
  }
}

/**
 * Create a new address for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} addressData - Address information
 * @returns {Promise<Object>} - Created address
 */
async function createCustomerAddress(customerId, addressData) {
  try {
    const response = await axios.post(
      `https://api.commerce7.com/v1/customer/${customerId}/address`,
      addressData,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error creating address for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Update an existing customer address
 * @param {string} customerId - Customer ID
 * @param {string} addressId - Address ID
 * @param {Object} addressData - Updated address information
 * @returns {Promise<Object>} - Updated address
 */
async function updateCustomerAddress(customerId, addressId, addressData) {
  try {
    const response = await axios.put(
      `https://api.commerce7.com/v1/customer/${customerId}/address/${addressId}`,
      addressData,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error updating address ${addressId} for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Create a club membership for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} membershipData - Club membership information
 * @returns {Promise<Object>} - Created club membership
 */
async function createClubMembership(customerId, membershipData) {
  try {
    const payload = {
      clubId: membershipData.clubId,
      status: 'Pending',
      deliveryOption: membershipData.deliveryMethod === 'pickup' ? 'Pickup' : 'Ship',
      metaData: {
        source: 'chatbot_signup'
      }
    };
    
    const response = await axios.post(
      `https://api.commerce7.com/v1/customer/${customerId}/club-membership`,
      payload,
      authConfig
    );
    
    return response.data;
  } catch (error) {
    logger.error(`Error creating club membership for customer ${customerId}:`, error);
    throw error;
  }
}

// ✅ GET a specific club by ID
router.get('/club/:id', async (req, res) => {
  try {
    const clubId = req.params.id;
    logger.info(`Fetching club details for ID: ${clubId}`);
    
    const response = await axios.get(
      `https://api.commerce7.com/v1/club/${clubId}`,
      authConfig
    );
    
    res.json(response.data);
  } catch (error) {
    logger.error(`Error fetching club details: ${error.message}`);
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch club details',
      details: error.response?.data || error.message
    });
  }
});

// ✅ GET all clubs
router.get('/club', async (req, res) => {
  try {
    logger.info('Fetching all clubs');
    
    const response = await axios.get(
      'https://api.commerce7.com/v1/club',
      authConfig
    );
    
    res.json(response.data);
  } catch (error) {
    logger.error(`Error fetching clubs: ${error.message}`);
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch clubs',
      details: error.response?.data || error.message
    });
  }
});

// ✅ Search for customer by email
router.get('/customer/search', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    logger.info(`Searching for customer with email: ${email}`);
    
    const response = await axios.get(
      `https://api.commerce7.com/v1/customer?q=${encodeURIComponent(email)}`,
      authConfig
    );
    
    res.json(response.data);
  } catch (error) {
    logger.error(`Error searching for customer: ${error.message}`);
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to search for customer',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;