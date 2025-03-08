# Milea Chatbot Authentication and Personalized Information Flow

This documentation explains how the Milea Estate Vineyard chatbot handles authenticated queries, such as retrieving loyalty points, and provides guidance on extending these capabilities to support additional personalized information requests.

## Overview

The chatbot provides both general information about Milea Estate Vineyard (wines, events, visiting information) and personalized information for authenticated customers. When a user asks a personalized question (like "What are my loyalty points?"), the system:

1. Detects that authentication is required
2. Prompts the user to log in if not already authenticated
3. Retrieves customer-specific information from Commerce7
4. Returns a personalized response

## Authentication Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  useMessages.js │     │useAuthentication│     │  apiService.js  │
│                 │     │       .js       │     │                 │
│  Detects auth   │────►│  Handles login  │────►│  Makes API call │
│  requirement    │     │  process        │     │  to server      │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │                 │              │
         │              │   auth.js       │              │
         └──────────────┤   (Backend)     │◄─────────────┘
                        │                 │
                        │   Validates     │
                        │   credentials   │
                        │                 │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │   Commerce7     │
                        │   API           │
                        │                 │
                        └─────────────────┘
```

## Key Components

### 1. Frontend Components

#### useMessages.js
- **Purpose**: Main hook managing chat messages and user interactions
- **Authentication Role**: 
  - Detects if a query requires authentication using `requiresAuthentication()`
  - Manages login form visibility with `setShowLoginForm()`
  - Handles login success/failure callbacks
  - Stores pending questions while waiting for authentication

#### useAuthentication.js
- **Purpose**: Manages authentication state and processes
- **Authentication Role**:
  - Stores auth token, customer data, and login credentials
  - Makes login API request via `login()` function
  - Handles token storage in localStorage
  - Provides logout functionality
  - Fetches customer data with token

#### useCustomerQueries.js
- **Purpose**: Processes customer-specific queries
- **Authentication Role**:
  - Determines if a query requires authentication
  - Formulates responses based on customer data
  - Contains specialized handlers for different query types (loyalty points, orders, etc.)

#### apiService.js
- **Purpose**: Centralizes API communication
- **Authentication Role**:
  - Makes authenticated requests to backend APIs
  - Includes auth token in request headers
  - Handles auth errors (e.g., 401 Unauthorized)
  - Provides specific methods for commerce7 data retrieval

### 2. Backend Components

#### auth.js
- **Purpose**: Handles authentication requests
- **Role**:
  - Validates user credentials against Commerce7
  - Retrieves customer information
  - Creates authentication token
  - Returns customer details with token

#### extractCustomerId.js
- **Purpose**: Middleware to extract customer ID from requests
- **Role**:
  - Parses authentication token
  - Extracts customer ID for other routes to use

#### commerce7.js
- **Purpose**: Configures Commerce7 API connection
- **Role**:
  - Stores API credentials
  - Provides authentication configuration for API requests

## How Loyalty Points Retrieval Works

When a user asks "What are my loyalty points?", the following sequence occurs:

1. **Query Detection**: 
   - In `useMessages.js`, the message is analyzed using `requiresAuthentication()`
   - The function in `useCustomerQueries.js` identifies keywords like "loyalty," "points," or "miles"

2. **Authentication Check**:
   - If the user is not logged in (`authToken` is null), show login form and save pending question
   - If logged in, proceed to retrieve loyalty information

3. **Loyalty Information Retrieval**:
   - `processAuthenticatedQuestion()` in `useCustomerQueries.js` handles the query
   - First checks if loyalty points exist in current customer data
   - If not available, makes an API call to retrieve them

4. **Response Generation**:
   - Formats a response like "You currently have X Milea Miles (loyalty points)."
   - Includes fallback handling for when data can't be retrieved

## Adding New Personalized Functionality

To extend the chatbot with additional personalized features, follow these steps:

### 1. Identify Query Type

Add detection patterns in `useCustomerQueries.js` to identify new query types:

```javascript
// Example: Adding detection for purchase history queries
function requiresAuthentication(text) {
  const textLower = text.toLowerCase();
  
  // Existing detection logic...
  
  // Add new detection patterns
  if (textLower.includes("purchase history") || 
      textLower.includes("my orders") || 
      textLower.includes("what have i bought")) {
    return true;
  }
  
  return false;
}
```

### 2. Implement Query Handler

Add a new handler function in `processAuthenticatedQuestion()`:

```javascript
// Example: Adding purchase history handler
async function processAuthenticatedQuestion(question, customerInfo) {
  if (!customerInfo) {
    return "I'm having trouble accessing your account information. Please try logging in again.";
  }
  
  const questionLower = question.toLowerCase();
  
  // Existing handlers...
  
  // Purchase history handler
  if (questionLower.includes("purchase history") || 
      questionLower.includes("my orders") || 
      questionLower.includes("what have i bought")) {
    try {
      // Use customer ID to fetch order history
      const customerId = customerInfo.id;
      const token = localStorage.getItem("commerce7Token");
      
      const response = await fetch(`/api/customer/orders?customerId=${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Format the order history data into a readable response
        return formatOrderHistory(data.orders);
      } else {
        return "I'm having trouble retrieving your order history right now. Please try again later.";
      }
    } catch (error) {
      console.error("Error fetching order history:", error);
      return "I'm having trouble retrieving your order history right now. Please try again later.";
    }
  }
  
  // Helper function to format order history
  function formatOrderHistory(orders) {
    if (!orders || orders.length === 0) {
      return "You don't have any orders in your history yet.";
    }
    
    const recentOrders = orders.slice(0, 3); // Show 3 most recent orders
    
    let response = `Here are your ${recentOrders.length} most recent orders:\n\n`;
    
    recentOrders.forEach((order, index) => {
      const date = new Date(order.orderDate).toLocaleDateString();
      const total = (order.total / 100).toFixed(2);
      
      response += `${index + 1}. Order #${order.orderNumber} - ${date} - $${total}\n`;
      response += `   Items: ${order.items.map(item => item.productTitle).join(", ")}\n\n`;
    });
    
    if (orders.length > 3) {
      response += `You have ${orders.length - 3} more orders in your history.`;
    }
    
    return response;
  }
}
```

### 3. Add Backend API Endpoint

Create a new route to handle the required data fetching:

```javascript
// routes/customers.js
router.get("/orders", extractCustomerId, async (req, res) => {
  try {
    const customerId = req.customerId;
    
    if (!customerId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Commerce7 API config
    const apiConfig = {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.C7_APP_ID + ':' + process.env.C7_SECRET_KEY).toString('base64')}`,
        'Tenant': process.env.C7_TENANT_ID,
        'Content-Type': 'application/json'
      }
    };
    
    // Fetch orders from Commerce7
    const response = await axios.get(
      `https://api.commerce7.com/v1/order?customerId=${customerId}`,
      apiConfig
    );
    
    // Return the orders data
    res.json({
      orders: response.data.orders || []
    });
  } catch (error) {
    logger.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch order history" });
  }
});
```

### 4. Add API Service Function

Update `apiService.js` to include the new API call:

```javascript
/**
 * Fetch customer order history
 * @returns {Promise<Object>} - Order history data
 */
export const fetchOrderHistory = async () => {
  try {
    const response = await api.get("/api/customer/orders");
    return response.data;
  } catch (error) {
    console.error("Error fetching order history:", error);
    throw new Error("Failed to fetch order history");
  }
};
```

### 5. Test the New Functionality

Test the new feature by asking relevant questions in different authentication states.

## Examples of Additional Personalized Features

Here are some ideas for additional personalized features you can implement:

### Wine Club Membership Status
- Query detection: "my wine club", "my membership", "club benefits"
- Data needed: Club membership status, tier, benefits, next shipment date
- Commerce7 endpoint: `/v1/customer/{id}/club-membership`

### Upcoming Reservations
- Query detection: "my reservations", "my bookings", "upcoming visits"
- Data needed: Reservation dates, types, guest counts
- Commerce7 endpoint: `/v1/reservation?customerId={id}`

### Shipping Information
- Query detection: "my shipping", "track my order", "shipping status"
- Data needed: Recent orders, tracking numbers, shipping statuses
- Commerce7 endpoint: `/v1/order?customerId={id}`

### Account Details
- Query detection: "my account", "update my info", "change my address"
- Data needed: Name, address, phone, email
- Commerce7 endpoint: `/v1/customer/{id}`

### Purchase Recommendations
- Query detection: "what wines should I try", "recommend wines for me"
- Data needed: Purchase history, wine preferences
- Commerce7 endpoints: `/v1/order?customerId={id}` combined with product data

## Best Practices

When extending personalized functionality:

1. **Handle Authentication Gracefully**:
   - Clearly indicate when authentication is needed
   - Store pending questions for after authentication
   - Provide helpful responses for authentication failures

2. **Implement Fallbacks**:
   - Always include fallback responses when data retrieval fails
   - Have multiple data retrieval strategies (e.g., check local data first)

3. **Respect Privacy**:
   - Only access customer data when explicitly requested
   - Be careful about displaying sensitive information
   - Clear authentication state on logout and window close

4. **Optimize Performance**:
   - Cache retrieved data where appropriate
   - Minimize API calls when possible
   - Use loading indicators for longer requests

5. **Maintain Security**:
   - Never expose API credentials in frontend code
   - Properly validate authentication in all backend routes
   - Implement rate limiting on authentication endpoints

6. **Implement Error Handling**:
   - Log errors server-side for debugging
   - Provide user-friendly error messages
   - Gracefully handle network failures and timeouts

By following this guide, you can extend the Milea Estate Vineyard chatbot with additional personalized features that enhance the customer experience by providing account-specific information in a convenient, conversational format.