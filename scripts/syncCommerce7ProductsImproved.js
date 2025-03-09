// scripts/syncCommerce7ProductsImproved.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const authConfig = require('../utils/commerce7Auth');
const { formatCommerce7Markdown } = require('./wine-formatter');

// Base knowledge folder
const KNOWLEDGE_BASE = path.join(__dirname, '../knowledge');

// Product type to folder mapping
const FOLDER_MAPPING = {
  'Wine': 'wine',
  'General Merchandise': 'merchandise',
  'Tasting': 'tasting',
  'Event': 'event'
};

/**
 * Fetch all products from Commerce7 and convert to markdown
 */
async function syncWineProducts() {
  try {
    console.log('📡 Fetching all products from Commerce7...');
    
    const allProducts = await fetchAllProducts();

    console.log(`✅ Retrieved ${allProducts.length} products from Commerce7`);

    // Convert to Markdown with improved formatting
    await convertProductsToMarkdown(allProducts);

    console.log('✅ Products synced successfully!');
  } catch (error) {
    console.error('❌ Error syncing products:', error);
  }
}

/**
 * Fetch all products from Commerce7 without filters
 */
async function fetchAllProducts() {
  let allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`📄 Fetching products page ${page}...`);
      
      const response = await axios.get(
        'https://api.commerce7.com/v1/product',
        {
          ...authConfig,
          params: {
            page,
            limit: 50 // No filtering, just pagination
          }
        }
      );
      
      const products = response.data.products || [];
      allProducts = [...allProducts, ...products];

      console.log(`✅ Retrieved ${products.length} products from page ${page}`);
      
      // Stop fetching if no more products
      if (products.length === 0) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error.response ? error.response.data : error.message);
      hasMore = false;
    }
  }

  return allProducts;
}

/**
 * Check if a product should be included based on its type and status
 * @param {Object} product - The product to check
 * @returns {boolean} - Whether the product should be included
 */
function shouldIncludeProduct(product) {
  const { type, adminStatus, webStatus } = product;

  switch (type) {
    case 'Wine':
    case 'Event':
      // Only include available/available products
      return adminStatus === 'Available' && webStatus === 'Available';
    
    case 'General Merchandise':
      // Include available/available OR available/not available
      return adminStatus === 'Available' && 
             (webStatus === 'Available' || webStatus === 'Not Available');
    
    case 'Tasting':
      // Include all tasting products
      return true;
    
    default:
      // Exclude other product types
      return false;
  }
}

/**
 * Convert Commerce7 products into structured markdown files in type-specific folders
 */
async function convertProductsToMarkdown(products) {
  const processedCount = {
    included: 0,
    excluded: 0
  };
  
  // Track products by type for logging
  const typeStats = {};
  
  // Process each product
  for (const product of products) {
    // Skip if not one of our allowed types or doesn't meet availability criteria
    if (!FOLDER_MAPPING[product.type] || !shouldIncludeProduct(product)) {
      processedCount.excluded++;
      
      // Track excluded product by type for stats
      typeStats[product.type] = typeStats[product.type] || { included: 0, excluded: 0 };
      typeStats[product.type].excluded++;
      
      continue;
    }
    
    // Get the appropriate folder for this product type
    const folderName = FOLDER_MAPPING[product.type];
    const folderPath = path.join(KNOWLEDGE_BASE, folderName);
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`📂 Created directory: ${folderPath}`);
    }
    
    // Create sanitized filename
    const safeType = product.type.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const safeTitle = product.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = `${safeType}_${safeTitle}-${product.id}.md`;
    const filePath = path.join(folderPath, filename);
    
    // Generate markdown with improved formatting
    let markdown;
    if (product.type === 'Wine') {
      // Use enhanced formatter for Wine products
      markdown = formatCommerce7Markdown(product, null);
    } else {
      // Use standard formatter for other products
      markdown = generateProductMarkdown(product);
    }
    
    fs.writeFileSync(filePath, markdown, 'utf8');
    
    console.log(`📝 Created: ${folderName}/${filename}`);
    
    // Update stats
    processedCount.included++;
    typeStats[product.type] = typeStats[product.type] || { included: 0, excluded: 0 };
    typeStats[product.type].included++;
  }
  
  // Log summary statistics
  console.log('📊 Sync Statistics:');
  console.log(`   Total products processed: ${processedCount.included + processedCount.excluded}`);
  console.log(`   Included in knowledge base: ${processedCount.included}`);
  console.log(`   Excluded from knowledge base: ${processedCount.excluded}`);
  console.log('   Breakdown by product type:');
  
  for (const [type, stats] of Object.entries(typeStats)) {
    console.log(`     - ${type}: ${stats.included} included, ${stats.excluded} excluded`);
  }
}

/**
 * Standard product markdown generator for non-wine products
 */
function generateProductMarkdown(product) {
  let priceText = 'Price unavailable';
  if (product.variants?.length > 0 && product.variants[0].price) {
    priceText = `$${(product.variants[0].price / 100).toFixed(2)}`;
  }

  return `# ${product.title}

## Product Information
- **Type**: ${product.type}
- **Price**: ${priceText}
- **Status**: ${product.adminStatus} / ${product.webStatus}
- **Created**: ${new Date(product.createdAt).toLocaleDateString()}
- **Updated**: ${new Date(product.updatedAt).toLocaleDateString()}

## Description
${product.content || 'No description available.'}

${product.teaser ? `## Quick Overview\n${product.teaser}` : ''}

## Details
${product.metaData ? formatMetaData(product.metaData) : 'No additional details available.'}
`;
}

/**
 * Format product metadata into markdown
 */
function formatMetaData(metaData) {
  return Object.entries(metaData)
    .map(([key, value]) => `- **${key.replace(/_/g, ' ')}**: ${value}`)
    .join('\n');
}

// Run script
if (require.main === module) {
  syncWineProducts();
}

module.exports = { syncWineProducts };
