# Milea Estate Vineyard Query Classification Rules

## Overview

The query classification system determines the type and intent of user queries, directing them to the appropriate domain handlers. Classification is performed in a priority-based sequence, with specific patterns taking precedence over general patterns. This document outlines the complete classification rule set, examples, and edge cases.

## Classification Flow

The classification process follows this flow:

1. **Direct Wine Pattern Matching**: Check for specific wine patterns first
2. **Domain-Specific Classifications**: Check for various domain types in order of priority
3. **Generic Wine Classification**: Check for generic wine terms
4. **Fallback Classification**: Default to general query classification

## Classification Hierarchy

The classification system follows this hierarchy (in order of precedence):

| Priority | Query Type | Subtype Options | Handler |
|----------|------------|-----------------|---------|
| 1 | Specific Wine Patterns | `specific` | `wineHandler.js` |
| 2 | Business Hours | `general` | `businessHoursHandler.js` |
| 3 | Wine Club | `general` | `clubHandler.js` |
| 4 | Loyalty Program | `general` | `loyaltyHandler.js` |
| 5 | Wine Production | `general` | `wine_productionHandler.js` |
| 6 | Sustainability | `general` | `sustainabilityHandler.js` |
| 7 | Visiting | `visiting-hours`, `visiting-directions`, `visiting-reservations`, `visiting-accommodations`, `visiting-attractions`, `visiting-experiences`, `visiting-general` | `visitingHandler.js` |
| 8 | Generic Wine | `generic`, `price` | `wineHandler.js` |
| 9 | Merchandise | `general` | `merchandiseHandler.js` |
| 10 | General (Fallback) | `general` | `generalHandler.js` |

## Classification Functions

The classification system is comprised of several specialized functions:

```javascript
// Main classification function
function classifyQuery(query)

// Domain detection functions
function isBusinessHoursQuery(query)
function isWineClubQuery(query)
function isLoyaltyProgramQuery(query)
function isWineProductionQuery(query)
function isSustainabilityQuery(query)
function isVisitingQuery(query)
function isLikelyWineQuery(query)
function isMerchandiseQuery(query)

// Wine-specific detection
function identifySpecificWinePattern(query)
```

## Detailed Classification Rules

### 1. Specific Wine Pattern Detection

The system first checks for specific wine patterns using sophisticated pattern detection:

```javascript
function identifySpecificWinePattern(query) {
  const queryLower = query.toLowerCase();
  
  // Define wine pattern matching rules with variations and synonyms
  const winePatterns = [
    {
      name: 'reserve cabernet franc',
      pattern: 'reserve-cabernet-franc',
      matchers: [
        {terms: ['reserve', 'cab', 'franc'], proximity: 3},
        {terms: ['reserve', 'cabernet', 'franc'], proximity: 4},
        {regex: /\breserve\s+cab(ernet)?\s+franc\b/}
      ]
    },
    // Other wine patterns...
  ];

  // Check patterns with sophisticated matching
}
```

The wine pattern matching includes:
- **Regex Matching**: Precise pattern matching with regular expressions
- **Term Proximity**: Checks for terms within a specific proximity
- **Special Cases**: Handles cases like "Proceedo" without variants

#### Confirmed Wine List

The system maintains a list of confirmed wines for validation:

```javascript
const confirmedWines = [
  {term: 'reserve cabernet franc', pattern: 'reserve-cabernet-franc'},
  {term: 'farmhouse cabernet franc', pattern: 'farmhouse-cabernet-franc'},
  {term: 'farmhouse cab franc', pattern: 'farmhouse-cabernet-franc'},
  {term: 'queen of the meadow', pattern: 'queen-of-the-meadow'},
  {term: 'four seasons', pattern: 'four-seasons'},
  {term: 'proceedo white', pattern: 'proceedo-white'},
  {term: 'proceedo rosé', pattern: 'proceedo-rose'},
  {term: 'proceedo rose', pattern: 'proceedo-rose'},
  {term: 'sang\'s cabernet franc', pattern: 'sangs-cabernet-franc'},
  {term: 'hudson heritage chambourcin', pattern: 'hudson-heritage-chambourcin'},
  {term: 'farmhouse chardonnay', pattern: 'farmhouse-chardonnay'},
  {term: 'reserve chardonnay', pattern: 'reserve-chardonnay'},
  {term: 'chardonnay', pattern: 'chardonnay'},
  {term: 'four seasons reserve rosé', pattern: 'four-seasons-reserve-ros'},
  {term: 'queen of the meadow rosé', pattern: 'queen-of-the-meadow-ros'}
];
```

### 2. Business Hours Queries

Detects queries about business hours or open status:

```javascript
function isBusinessHoursQuery(query) {
  const hoursPatterns = [
    'hour', 'open', 'closed', 'close', 'opening time', 'closing time',
    'when are you open', 'when do you open', 'when do you close',
    'what time', 'what days', 'open today', 'closed today',
    'are you open', 'schedule', 'open now', 'currently open'
  ];
  
  return hoursPatterns.some(pattern => query.includes(pattern));
}
```

### 3. Wine Club Queries

Detects queries related to the wine club:

```javascript
function isWineClubQuery(query) {
  return (
    (query.includes("club") || query.includes("membership")) &&
    (query.includes("wine") || query.includes("join") || query.includes("milea"))
  );
}
```

### 4. Loyalty Program Queries

Detects queries related to the Milea Miles loyalty program:

```javascript
function isLoyaltyProgramQuery(query) {
  const loyaltyTerms = [
    'milea miles', 'miles', 'loyalty', 'rewards', 'points', 'reward', 
    'redeem', 'earn points', 'point system', 'rewards program'
  ];
  
  return loyaltyTerms.some(term => query.includes(term));
}
```

### 5. Wine Production Queries

Detects queries about wine production processes:

```javascript
function isWineProductionQuery(query) {
  const wineProductionTerms = [
    'wine production', 'how is wine made', 'winemaking', 'make wine',
    'fermentation', 'grape harvest', 'bottling', 'vineyard process',
    'grow grapes', 'winery operations', 'vineyard management',
    'wine processing', 'how do you make', 'production process'
  ];
  
  return wineProductionTerms.some(term => query.includes(term));
}
```

### 6. Sustainability Queries

Detects queries about sustainability practices:

```javascript
function isSustainabilityQuery(query) {
  const sustainabilityTerms = [
    'sustainability', 'sustainable', 'organic', 'eco-friendly',
    'environmentally friendly', 'green practices', 'carbon footprint',
    'pesticides', 'chemical', 'farming practices', 'regenerative',
    'natural farming', 'conservation', 'soil health', 'compost',
    'biodiversity', 'ecosystem'
  ];
  
  return sustainabilityTerms.some(term => query.includes(term));
}
```

### 7. Visiting Queries

Detects and subcategorizes queries related to visiting:

```javascript
function isVisitingQuery(query) {
  const visitingTerms = [
    'visit', 'visiting', 'hours', 'open', 'directions', 'location', 'address',
    'reservation', 'book', 'tasting', 'tour', 'appointment', 'tastings',
    'accommodations', 'hotels', 'stay', 'where to stay', 'attractions',
    'nearby', 'things to do', 'when can i', 'how do i get', 'where is',
    'need a reservation', 'need reservation', 'reservations required', 'require reservation'
  ];
  
  return visitingTerms.some(term => query.includes(term));
}
```

Visiting queries are further classified into subtypes:

```javascript
function classifyVisitingQueryType(query) {
  if (query.includes('hour') || query.includes('open') || query.includes('when')) {
    return 'visiting-hours';
  } else if (query.includes('direction') || query.includes('address') || 
            query.includes('location') || query.includes('where')) {
    return 'visiting-directions';
  } else if (query.includes('reservation') || query.includes('book') || 
            query.includes('appointment')) {
    return 'visiting-reservations';
  } else if (query.includes('hotel') || query.includes('stay') || 
            query.includes('accommodations')) {
    return 'visiting-accommodations';
  } else if (query.includes('attractions') || query.includes('things to do') || 
            query.includes('nearby')) {
    return 'visiting-attractions';
  } else if (query.includes('experience') || query.includes('tasting')) {
    return 'visiting-experiences';
  } else {
    return 'visiting-general';
  }
}
```

### 8. Generic Wine Queries

Detects generic wine-related queries:

```javascript
function isLikelyWineQuery(query) {
  const wineTerms = [
    'rose', 'rosé', 'red', 'white', 'wine', 'bottle', 'vineyard', 'vintage',
    'chardonnay', 'riesling', 'cabernet', 'franc', 'merlot', 'pinot noir',
    'sauvignon', 'syrah', 'blend', 'proceedo', 'chambourcin', 'muscat',
    'tasting', 'sweet', 'dry', 'tannic', 'full-bodied', 'light-bodied'
  ];
  
  return wineTerms.some(term => query.includes(term));
}
```

Generic wine types for classification:

```javascript
const genericWineTypes = [
  'rose', 'rosé', 'chardonnay', 'cabernet', 'franc', 'riesling', 
  'merlot', 'pinot', 'noir', 'sauvignon', 'blanc', 'red', 'white',
  'blaufränkisch', 'blaufrankisch', 'grüner', 'gruner', 'veltliner'
];
```

Wine price queries are detected using patterns:

```javascript
const pricePatterns = [
  /how much (is|does) .+ cost/i,
  /price of .+/i,
  /cost of .+/i,
  /how much .+/i
];

if (pricePatterns.some(pattern => pattern.test(query)) && isLikelyWineQuery(queryLower)) {
  return {
    type: 'wine',
    subtype: 'price',
    isSpecificWine: false,
    wineTerms: []
  };
}
```

### 9. Merchandise Queries

Detects queries about merchandise products:

```javascript
function isMerchandiseQuery(query) {
  const merchandiseTerms = [
    'merchandise', 'shirt', 'clothing', 'glass', 'glasses', 'souvenir',
    'gift', 'shop', 'store', 'purchase', 'buy', 'merch', 'apparel'
  ];
  
  return merchandiseTerms.some(term => query.includes(term));
}
```

### 10. General Queries (Fallback)

If no other classification matches, the query is classified as a general query:

```javascript
return {
  type: 'general',
  subtype: 'general'
};
```

## Classification Return Structure

The classification function returns a structured object with query information:

```javascript
// Example return for a specific wine
{
  type: 'wine',
  subtype: 'specific',
  isSpecificWine: true,
  specificWine: 'reserve cabernet franc',
  winePattern: 'reserve-cabernet-franc',
  wineTerms: ['reserve', 'cabernet', 'franc'],
  isConfirmedWine: true
}

// Example return for a visiting query
{
  type: 'visiting',
  subtype: 'visiting-directions',
  isSpecificWine: false,
  wineTerms: []
}
```

## Special Case: Rosé Wine Queries

Special handling for rosé wine queries:

```javascript
if (queryLower.match(/\bros[eé]\b/) || 
    queryLower.includes("rosé wine") || 
    queryLower.includes("rose wine")) {
  logger.wine(`Rosé wine specific query detected: "${query}"`);
  return {
    type: 'wine',
    subtype: 'specific',
    isSpecificWine: true,
    specificWine: 'proceedo rosé', // Default to a known rosé
    winePattern: 'proceedo-rose',
    wineTerms: ['proceedo', 'rosé', 'rose'],
    isConfirmedWine: true
  };
}
```

## Special Case: Proceedo Wine Queries

Special handling for generic "Proceedo" queries without variant specification:

```javascript
if (queryLower.includes('proceedo') && 
    !queryLower.includes('white') && 
    !queryLower.includes('rosé') &&
    !queryLower.includes('rose')) {
  logger.wine(`Generic Proceedo query detected: "${query}"`);
  return {
    type: 'wine',
    subtype: 'specific',
    isSpecificWine: true,
    specificWine: 'proceedo',
    winePattern: 'proceedo',
    wineTerms: ['proceedo'],
    isConfirmedWine: true,
    isGenericProceedo: true
  };
}
```

## Query Classification Examples

### Wine Queries

| Query Example | Classification Type | Subtype | Notes |
|--------------|-------------------|---------|-------|
| "Tell me about Reserve Cabernet Franc" | `wine` | `specific` | Direct wine match |
| "What's the Farmhouse Cabernet Franc like?" | `wine` | `specific` | Direct wine match |
| "Do you have a Proceedo Rosé?" | `wine` | `specific` | Direct wine match |
| "I'm interested in your Cabernet Franc wines" | `wine` | `generic` | Generic wine type |
| "How much is the Reserve Cabernet Franc?" | `wine` | `price` | Wine price query |
| "What does your rosé taste like?" | `wine` | `specific` | Special rosé handling |
| "Tell me about your Proceedo" | `wine` | `specific` | Generic Proceedo handling |

### Visiting Queries

| Query Example | Classification Type | Subtype | Notes |
|--------------|-------------------|---------|-------|
| "What are your hours?" | `visiting` | `visiting-hours` | Hours subtype |
| "How do I get to your vineyard?" | `visiting` | `visiting-directions` | Directions subtype |
| "Do I need a reservation for tasting?" | `visiting` | `visiting-reservations` | Reservations subtype |
| "Where should I stay when visiting?" | `visiting` | `visiting-accommodations` | Accommodations subtype |
| "What attractions are near the vineyard?" | `visiting` | `visiting-attractions` | Attractions subtype |
| "What tasting experiences do you offer?" | `visiting` | `visiting-experiences` | Experiences subtype |
| "I want to visit your vineyard" | `visiting` | `visiting-general` | General visiting |

### Other Domain Queries

| Query Example | Classification Type | Subtype | Notes |
|--------------|-------------------|---------|-------|
| "Are you open today?" | `business-hours` | `general` | Business hours query |
| "Tell me about your wine club" | `club` | `general` | Wine club query |
| "How many Milea Miles do I have?" | `loyalty` | `general` | Loyalty program query |
| "How do you make your wine?" | `wine_production` | `general` | Wine production query |
| "What sustainable practices do you use?" | `sustainability` | `general` | Sustainability query |
| "Do you sell merchandise?" | `merchandise` | `general` | Merchandise query |
| "Who owns the vineyard?" | `general` | `general` | General fallback query |

## Edge Cases and Special Handling

### 1. Multiple Domain Matches

When a query could match multiple domains, priority order determines classification:

- **Example**: "What are your wine club hours?"
  - Contains "hours" (visiting/business hours)
  - Contains "wine club" (club)
  - **Classification**: `club` (higher priority than visiting)

### 2. Ambiguous Wine References

Handling for wine references that could be ambiguous:

- **Example**: "Tell me about your cabernet"
  - Could refer to multiple cabernet wines
  - **Classification**: `wine` with `subtype: 'generic'` and `wineTerms: ['cabernet']`
  - The wine handler will determine if clarification is needed

### 3. Misspelled Wine Names

Handling for common misspellings and variations:

- **Example**: "Do you have a procedo rose?"
  - Misspelled "proceedo"
  - **Classification**: Detected by fuzzy matching in `identifySpecificWinePattern`

### 4. Mixed Intent Queries

Handling for queries with mixed intents:

- **Example**: "I want to visit and buy some Reserve Cabernet Franc"
  - Contains visiting intent
  - Contains specific wine reference
  - **Classification**: `wine` (specific wine has higher priority)

## Classification Logic Debugging

For debugging classification issues, the system includes detailed logging:

```javascript
logger.wine(`Specific wine pattern detected: "${specificWine.name}" in query: "${query}"`);
logger.info(`Wine club query detected: "${query}"`);
logger.wine(`Reserve Cab Franc pattern match: ${query}`);
```

## Conclusion

The query classification system uses a comprehensive, rule-based approach with priority ordering to direct queries to the appropriate domain handlers. Wine queries receive special attention with sophisticated pattern matching and variant handling, reflecting their importance to the business. The system is designed to handle a wide range of query variations and edge cases while maintaining consistent classification behavior.