require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const authConfig = require('../utils/commerce7Auth');

const PRODUCTS_FOLDER = path.join(__dirname, '../knowledge/products');

/**
 * Fetch all products from Commerce7 and convert to markdown
 */
async function syncWineProducts() {
  try {
    console.log('📡 Fetching all products from Commerce7...');
    
    const allProducts = await fetchAllProducts();

    console.log(`✅ Retrieved ${allProducts.length} products from Commerce7`);

    // Convert to Markdown
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
 * Convert Commerce7 products into structured markdown files
 */
async function convertProductsToMarkdown(products) {
  // Ensure the knowledge directory exists
  if (!fs.existsSync(PRODUCTS_FOLDER)) {
    fs.mkdirSync(PRODUCTS_FOLDER, { recursive: true });
    console.log(`📂 Created directory: ${PRODUCTS_FOLDER}`);
  }

  const allowedTypes = ["Wine", "General Merchandise", "Tasting", "Event"];

  for (const product of products) {
    if (!allowedTypes.includes(product.type)) continue; // Only process specified types

    const safeType = product.type.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(); // Sanitize type
    const safeTitle = product.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(); // Sanitize title
    const filename = `${safeType}_${safeTitle}-${product.id}.md`; // New naming: (type)(title)(id)
    const filePath = path.join(PRODUCTS_FOLDER, filename);

    const markdown = generateProductMarkdown(product);

    fs.writeFileSync(filePath, markdown, 'utf8');
    console.log(`📝 Created: ${filename}`);
  }
}

/**
 * Generate markdown content for a product
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