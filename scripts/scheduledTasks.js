// scheduledTasks.js
require('dotenv').config();
const cron = require('node-cron');
const { syncWineProducts } = require('./syncCommerce7Products');
const path = require('path');
const fs = require('fs');

// Log file setup
const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Redirect console output to a log file for a specific function
 * @param {Function} fn - The function to run with logging
 * @param {string} logName - Name for the log file
 */
async function runWithLogging(fn, logName) {
  const logFile = path.join(LOG_DIR, `${logName}-${new Date().toISOString().split('T')[0]}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Save original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  // Redirect console output to log file
  console.log = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    logStream.write(`[${new Date().toISOString()}] ${message}\n`);
    originalConsoleLog.apply(console, args); // Still log to console
  };
  
  console.error = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    logStream.write(`[${new Date().toISOString()}] ERROR: ${message}\n`);
    originalConsoleError.apply(console, args); // Still log to console
  };
  
  try {
    console.log(`Starting scheduled task: ${logName}`);
    await fn();
    console.log(`Completed scheduled task: ${logName}`);
  } catch (error) {
    console.error(`Error in scheduled task ${logName}:`, error);
  } finally {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Close log stream
    logStream.end();
  }
}

// Schedule the product sync to run at 2 AM every day
// NOTE FOR DEPLOYMENT: This scheduling works in any environment (local or deployed)
cron.schedule('0 2 * * *', () => {
  runWithLogging(syncWineProducts, 'product-sync');
});

// Also schedule knowledge base initialization to run after product sync
// This ensures vectors are updated with the new product information
cron.schedule('30 2 * * *', () => {
  runWithLogging(
    () => require('./initializeKnowledgeBase'), 
    'knowledge-base-init'
  );
});

console.log('✅ Scheduled tasks initialized');
console.log('📅 Product sync will run at 2:00 AM daily');
console.log('📅 Knowledge base update will run at 2:30 AM daily');

// DEVELOPMENT: For testing purposes, you can trigger immediate execution
if (process.env.NODE_ENV === 'development' && process.env.RUN_TASKS_IMMEDIATELY === 'true') {
  console.log('🧪 Development mode: Running tasks immediately for testing');
  setTimeout(() => runWithLogging(syncWineProducts, 'product-sync-test'), 1000);
  setTimeout(() => runWithLogging(
    () => require('./initializeKnowledgeBase'), 
    'knowledge-base-init-test'
  ), 5000);
}

/* 
DEPLOYMENT NOTES:
1. For a server that stays running 24/7 (like a VPS or dedicated server):
   - This script works as-is
   - Start with: `node scheduledTasks.js` or use PM2: `pm2 start scheduledTasks.js`

2. For serverless environments (AWS Lambda, Google Cloud Functions, etc.):
   - Use the cloud provider's scheduling service instead of node-cron
   - AWS: CloudWatch Events/EventBridge
   - Google Cloud: Cloud Scheduler
   - Azure: Timer Triggers with Azure Functions

3. Container deployment (Docker):
   - Add this script to your container startup
   - Ensure logs are persisted using volumes if needed
*/

// Keep the process running
// NOTE: Remove this line if using PM2 or similar process manager in production
if (process.env.NODE_ENV !== 'development') {
  console.log('💡 Process will remain running to execute scheduled tasks');
  // Prevent the Node.js process from exiting
  setInterval(() => {}, 60000);
}

module.exports = {
  runWithLogging // Export for potential manual triggering
};