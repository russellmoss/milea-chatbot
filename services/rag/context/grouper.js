// services/rag/context/grouper.js
const logger = require('../../../utils/logger');

/**
 * Group documents by type (e.g., wine vintages)
 * @param {Array} scoredDocs - Documents with scores and metadata
 * @param {Object} queryInfo - Query classification
 * @returns {Object} - Grouped documents
 */
function groupDocuments(scoredDocs, queryInfo) {
  // For wine queries, group by vintages
  if (queryInfo.type === 'wine') {
    return groupWineDocuments(scoredDocs, queryInfo);
  }
  
  // For other query types, return standard grouping
  return {
    primaryDoc: scoredDocs.length > 0 ? scoredDocs[0].doc : null,
    otherDocs: scoredDocs.slice(1).map(item => item.doc),
    otherVintages: []
  };
}

/**
 * Group wine documents by wine type and vintage
 * @param {Array} scoredDocs - Scored wine documents
 * @param {Object} queryInfo - Query classification
 * @returns {Object} - Grouped wine documents
 */
function groupWineDocuments(scoredDocs, queryInfo) {
  // For generic wine queries, check for multiple matching wines
  if (queryInfo.subtype === 'generic' && scoredDocs.length > 1) {
    // Extract unique wine names (excluding vintages)
    const uniqueWines = [];
    const seenWineNames = new Set();
    
    for (const item of scoredDocs) {
      // Skip items without proper names
      if (!item.wineName) continue;
      
      // Normalize wine name for comparison and de-duplication
      // Only use the basic wine name - strip vintage year and "glass" suffix
      const normalizedName = item.wineName
        .toLowerCase()
        .replace(/\b(19|20)\d{2}\b/, '') // Remove vintage year
        .replace(/\s+glass$/, '')        // Remove "glass" suffix
        .trim();
      
      // Create a cleaner display name without duplicate information
      const displayName = item.wineName
        .replace(/farmhouse\s+cab(ernet)?\s+franc\s+glass/i, 'Farmhouse Cabernet Franc (Glass)')
        .replace(/\s+glass$/i, ' (Glass)');
      
      // Skip duplicates - using normalized name for comparison
      if (seenWineNames.has(normalizedName)) continue;
      
      // Add to unique wines list
      uniqueWines.push({
        name: displayName,    // Cleaner display name for the user
        vintage: item.vintage,
        isAvailable: item.isAvailable,
        doc: item.doc
      });
      
      seenWineNames.add(normalizedName);
    }
    
    // If we have multiple unique wines, return them
    if (uniqueWines.length > 1) {
      logger.wine(`Found ${uniqueWines.length} unique wine names for generic wine query`);
      return {
        uniqueWines,
        multipleWines: true
      };
    }
  }
  
  // For specific wine queries or if we only found one wine, group by vintage
  const wineGroups = {};
  
  for (const item of scoredDocs) {
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
  
  // Find the wine group with the highest scored document
  let primaryDoc = null;
  let otherVintages = [];
  
  if (Object.keys(wineGroups).length > 0 && scoredDocs.length > 0) {
    const topItemSource = scoredDocs[0].doc.metadata.source.toLowerCase();
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
        
        // Handle NV (Non-Vintage) vs numeric year comparison
        if (a.vintage === 'NV' && typeof b.vintage === 'number') {
          return 1; // Numeric years come before NV
        }
        if (b.vintage === 'NV' && typeof a.vintage === 'number') {
          return -1; // Numeric years come before NV
        }
        
        // Both are numbers, compare normally
        if (typeof a.vintage === 'number' && typeof b.vintage === 'number') {
          return b.vintage - a.vintage; // Newer vintages first
        }
        
        // Default - keep original order
        return 0;
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
  
  return {
    primaryDoc,
    otherVintages,
    wineGroups
  };
}

module.exports = {
  groupDocuments,
  groupWineDocuments
};