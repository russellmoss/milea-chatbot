// utils/logger.js
function log(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const emoji = getEmoji(type);
    
    console.log(`${emoji} [${timestamp}] ${message}`);
    if (data) {
      console.log(data);
    }
  }
  
  function getEmoji(type) {
    const emojis = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      auth: '🔐',
      search: '🔍',
      api: '🔄',
      db: '💾',
      wine: '🍷'
    };
    
    return emojis[type] || '📝';
  }
  
  module.exports = {
    info: (message, data) => log('info', message, data),
    success: (message, data) => log('success', message, data),
    warning: (message, data) => log('warning', message, data),
    error: (message, data) => log('error', message, data),
    auth: (message, data) => log('auth', message, data),
    search: (message, data) => log('search', message, data),
    api: (message, data) => log('api', message, data),
    db: (message, data) => log('db', message, data),
    wine: (message, data) => log('wine', message, data)
  };
  