## Testing and Debugging

### Unit Testing Session Management

Here's how to implement unit tests for your session management code:

```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

const SessionManager = require('../services/SessionManager');

describe('Session Manager', () => {
  let sessionManager;
  
  beforeEach(() => {
    // Create a new instance for each test
    sessionManager = new SessionManager({
      sessionTimeout: 60000 // 1 minute for faster testing
    });
  });
  
  afterEach(() => {
    // Clean up after each test
    sessionManager.shutdown();
    sinon.restore();
  });
  
  it('should create a new session', () => {
    const session = sessionManager.createSession();
    
    expect(session).to.have.property('sessionId');
    expect(session).to.have.property('userId');
    expect(session).to.have.property('messages').that.is.an('array').that.is.empty;
    expect(session).to.have.property('createdAt').that.is.instanceOf(Date);
    expect(session).to.have.property('updatedAt').that.is.instanceOf(Date);
    expect(session).to.have.property('expiresAt').that.is.instanceOf(Date);
  });
  
  it('should retrieve an existing session', () => {
    const createdSession = sessionManager.createSession();
    const retrievedSession = sessionManager.getSession(createdSession.sessionId);
    
    expect(retrievedSession).to.not.be.null;
    expect(retrievedSession.sessionId).to.equal(createdSession.sessionId);
  });
  
  it('should return null for non-existent session', () => {
    const retrievedSession = sessionManager.getSession('non-existent-id');
    
    expect(retrievedSession).to.be.null;
  });
  
  it('should update a session', () => {
    const createdSession = sessionManager.createSession();
    const updates = {
      context: { lastTopic: 'wine tasting' }
    };
    
    const updatedSession = sessionManager.updateSession(createdSession.sessionId, updates);
    
    expect(updatedSession).to.not.be.null;
    expect(updatedSession.context).to.deep.equal(updates.context);
    expect(updatedSession.updatedAt).to.be.greaterThan(createdSession.updatedAt);
  });
  
  it('should add a message to a session', () => {
    const createdSession = sessionManager.createSession();
    const message = {
      role: 'user',
      content: 'Hello, world!'
    };
    
    const result = sessionManager.addMessage(createdSession.sessionId, message);
    
    expect(result).to.be.true;
    
    const updatedSession = sessionManager.getSession(createdSession.sessionId);
    expect(updatedSession.messages).to.have.lengthOf(1);
    expect(updatedSession.messages[0].role).to.equal('user');
    expect(updatedSession.messages[0].content).to.equal('Hello, world!');
  });
  
  it('should expire sessions after timeout', () => {
    // Create a session
    const createdSession = sessionManager.createSession();
    
    // Check that it exists
    expect(sessionManager.getSession(createdSession.sessionId)).to.not.be.null;
    
    // Advance time beyond session timeout
    const clock = sinon.useFakeTimers(Date.now());
    clock.tick(61000); // 61 seconds
    
    // Clean expired sessions
    sessionManager.cleanExpiredSessions();
    
    // Session should be gone
    expect(sessionManager.getSession(createdSession.sessionId)).to.be.null;
  });
  
  it('should get sessions for a user', () => {
    const userId = 'test-user-id';
    
    // Create 3 sessions for the user
    const session1 = sessionManager.createSession({ userId });
    const session2 = sessionManager.createSession({ userId });
    const session3 = sessionManager.createSession({ userId });
    
    // Create a session for another user
    sessionManager.createSession({ userId: 'another-user' });
    
    const userSessions = sessionManager.getUserSessions(userId);
    
    expect(userSessions).to.have.lengthOf(3);
    expect(userSessions.map(s => s.sessionId)).to.include(session1.sessionId);
    expect(userSessions.map(s => s.sessionId)).to.include(session2.sessionId);
    expect(userSessions.map(s => s.sessionId)).to.include(session3.sessionId);
  });
  
  it('should delete a session', () => {
    const createdSession = sessionManager.createSession();
    
    const result = sessionManager.deleteSession(createdSession.sessionId);
    
    expect(result).to.be.true;
    expect(sessionManager.getSession(createdSession.sessionId)).to.be.null;
  });
});
```

### Integration Testing with Supertest

Test your Express API endpoints:

```javascript
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../app'); // Your Express app

describe('Session Management API', () => {
  let sessionId;
  let csrfToken;
  
  // Helper to get cookies from response
  const getCookieValue = (res, cookieName) => {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return null;
    
    const cookie = cookies.find(c => c.startsWith(`${cookieName}=`));
    if (!cookie) return null;
    
    return cookie.split(';')[0].split('=')[1];
  };
  
  before(async () => {
    // Initial request to get session and CSRF token
    const res = await request(app)
      .get('/api/chat/csrf');
    
    sessionId = getCookieValue(res, 'chatSessionId');
    csrfToken = res.body.csrfToken;
  });
  
  it('should create a new session when none exists', async () => {
    const res = await request(app)
      .get('/api/chat/history');
    
    // Should set a session cookie
    const newSessionId = getCookieValue(res, 'chatSessionId');
    expect(newSessionId).to.not.be.null;
    
    // Should return empty history
    expect(res.body).to.have.property('messages');
    expect(res.body.messages).to.be.an('array').that.is.empty;
  });
  
  it('should add a message to the session', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Cookie', [`chatSessionId=${sessionId}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        message: 'Hello, Milea Estate Vineyard!',
        _csrf: csrfToken
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('message');
    expect(res.body).to.have.property('sessionId').that.equals(sessionId);
  });
  
  it('should get chat history for a session', async () => {
    const res = await request(app)
      .get('/api/chat/history')
      .set('Cookie', [`chatSessionId=${sessionId}`]);
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('messages');
    expect(res.body.messages).to.be.an('array');
    expect(res.body.messages.length).to.be.at.least(2); // User + Assistant
    
    // Check last message content
    const lastUserMessage = res.body.messages.find(m => m.role === 'user');
    expect(lastUserMessage.content).to.equal('Hello, Milea Estate Vineyard!');
  });
  
  it('should reject requests without CSRF token', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Cookie', [`chatSessionId=${sessionId}`])
      .send({
        message: 'This should fail'
      });
    
    expect(res.status).to.equal(403);
    expect(res.body).to.have.property('error').that.includes('CSRF');
  });
  
  it('should clear chat history', async () => {
    const res = await request(app)
      .delete('/api/chat/history')
      .set('Cookie', [`chatSessionId=${sessionId}`])
      .set('X-CSRF-Token', csrfToken);
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success').that.equals(true);
    
    // Verify history is cleared
    const historyRes = await request(app)
      .get('/api/chat/history')
      .set('Cookie', [`chatSessionId=${sessionId}`]);
    
    expect(historyRes.body.messages).to.be.an('array').that.is.empty;
  });
  
  it('should handle user authentication', async () => {
    // This test assumes you have a mock for Commerce7 authentication
    
    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', [`chatSessionId=${sessionId}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'test@example.com',
        password: 'testpassword',
        _csrf: csrfToken
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success').that.equals(true);
    expect(res.body).to.have.property('customer');
    
    // Should set auth cookie
    const authCookie = getCookieValue(res, 'commerce7Token');
    expect(authCookie).to.not.be.null;
  });
});
```

### Debugging Session Issues

Add this utility for troubleshooting session problems:

```javascript
/**
 * Session diagnostic tool for troubleshooting
 */
class SessionDiagnostics {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }
  
  /**
   * Run diagnostics on a session
   * @param {string} sessionId - Session ID to diagnose
   * @returns {Object} - Diagnostic results
   */
  async diagnoseSession(sessionId) {
    try {
      // Check if session exists
      const session = await this.sessionManager.getSession(sessionId);
      
      if (!session) {
        return {
          exists: false,
          error: 'Session not found',
          possibleCauses: [
            'Session ID is invalid',
            'Session has expired',
            'Session was manually deleted'
          ],
          suggestions: [
            'Check session cookie value',
            'Create a new session',
            'Check server logs for session cleanup operations'
          ]
        };
      }
      
      // Check session properties
      const issues = [];
      
      // Check expiration
      const now = new Date();
      const expiresIn = session.expiresAt - now;
      
      if (expiresIn < 0) {
        issues.push({
          type: 'expiration',
          severity: 'high',
          message: 'Session is expired but not cleaned up',
          details: `Expired ${-expiresIn / 1000} seconds ago`
        });
      } else if (expiresIn < 300000) { // 5 minutes
        issues.push({
          type: 'expiration',
          severity: 'low',
          message: 'Session will expire soon',
          details: `Expires in ${expiresIn / 1000} seconds`
        });
      }
      
      // Check message count
      if (session.messages.length > 50) {
        issues.push({
          type: 'messages',
          severity: 'medium',
          message: 'High message count might cause performance issues',
          details: `${session.messages.length} messages`,
          suggestion: 'Consider trimming old messages'
        });
      }
      
      // Check authentication
      if (session.isAuthenticated && !session.commerce7CustomerId) {
        issues.push({
          type: 'authentication',
          severity: 'high',
          message: 'Session marked as authenticated but missing customer ID',
          suggestion: 'Re-authenticate user'
        });
      }
      
      // Check context size
      const contextSize = JSON.stringify(session.context).length;
      if (contextSize > 10000) {
        issues.push({
          type: 'context',
          severity: 'medium',
          message: 'Large context size might cause performance issues',
          details: `Context size: ${contextSize} bytes`,
          suggestion: 'Consider trimming unnecessary context data'
        });
      }
      
      return {
        exists: true,
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        messageCount: session.messages.length,
        isAuthenticated: session.isAuthenticated,
        issues: issues.length > 0 ? issues : null,
        status: issues.length > 0 ? 
          (issues.some(i => i.severity === 'high') ? 'unhealthy' : 'warning') : 
          'healthy'
      };
    } catch (error) {
      console.error('Error diagnosing session:', error);
      
      return {
        exists: false,
        error: error.message,
        details: error.stack,
        suggestions: [
          'Check session manager configuration',
          'Verify database connectivity',
          'Review server logs for errors'
        ]
      };
    }
  }
  
  /**
   * Create a diagnostic route for Express
   * @returns {Function} - Express route handler
   */
  createDiagnosticRoute() {
    return async (req, res) => {
      try {
        const sessionId = req.params.sessionId || req.chatSession?.sessionId;
        
        if (!sessionId) {
          return res.status(400).json({
            error: 'Session ID is required'
          });
        }
        
        const diagnostics = await this.diagnoseSession(sessionId);
        res.json(diagnostics);
      } catch (error) {
        console.error('Diagnostic route error:', error);
        res.status(500).json({
          error: 'Error running diagnostics',
          details: error.message
        });
      }
    };
  }
}

// Usage in Express app
// app.get('/api/debug/session/:sessionId?', isAdmin, new SessionDiagnostics(session## Security Considerations

Implement these security measures to protect session data and customer information:

### Session Data Protection

```javascript
/**
 * Security utilities for session management
 */
class SessionSecurity {
  /**
   * Sanitize session data for client-side use
   * @param {Object} session - Full session object
   * @returns {Object} - Sanitized session for client
   */
  static sanitizeForClient(session) {
    if (!session) return null;
    
    // Create a safe version with only necessary data
    return {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      isAuthenticated: session.isAuthenticated,
      // Include only necessary message data
      messages: session.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      // Minimal customer info if authenticated
      customerInfo: session.isAuthenticated ? {
        name: session.commerce7CustomerName,
        wineClubMember: session.commerce7Customer?.wineClubMember
      } : null
    };
  }
  
  /**
   * Validate session ID format
   * @param {string} sessionId - Session ID to validate
   * @returns {boolean} - Is valid
   */
  static isValidSessionId(sessionId) {
    // Check if it's a valid UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(sessionId);
  }
  
  /**
   * Create CSRF token for session
   * @param {string} sessionId - Session ID
   * @returns {string} - CSRF token
   */
  static createCsrfToken(sessionId) {
    const timestamp = Date.now();
    const secret = process.env.CSRF_SECRET || 'milea-estate-csrf-secret';
    
    // In production, use a proper crypto library
    return Buffer.from(`${sessionId}:${timestamp}:${secret}`).toString('base64');
  }
  
  /**
   * Verify CSRF token
   * @param {string} token - CSRF token
   * @param {string} sessionId - Session ID
   * @returns {boolean} - Is valid
   */
  static verifyCsrfToken(token, sessionId) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [tokenSessionId, timestamp, secret] = decoded.split(':');
      
      // Check session ID match
      if (tokenSessionId !== sessionId) {
        return false;
      }
      
      // Check token age (max 1 hour)
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      if (tokenAge > 3600000) {
        return false;
      }
      
      // Check secret
      const expectedSecret = process.env.CSRF_SECRET || 'milea-estate-csrf-secret';
      return secret === expectedSecret;
    } catch (error) {
      return false;
    }
  }
}
```

### CSRF Protection Middleware

```javascript
/**
 * CSRF protection middleware
 * @returns {Function} Express middleware
 */
function csrfProtection() {
  return (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Check for CSRF token
    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!csrfToken) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }
    
    // Get session ID
    const sessionId = req.chatSession?.sessionId;
    
    if (!sessionId) {
      return res.status(403).json({ error: 'Session not found' });
    }
    
    // Verify token
    if (!SessionSecurity.verifyCsrfToken(csrfToken, sessionId)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    next();
  };
}
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

/**
 * Create rate limiting middleware
 * @returns {Function} Express middleware
 */
function chatRateLimiting() {
  // Rate limit for chat endpoints
  const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many chat requests, please try again later' }
  });
  
  // Rate limit for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later' }
  });
  
  return {
    chatLimiter,
    authLimiter
  };
}
```

### Data Encryption

```javascript
const crypto = require('crypto');

/**
 * Encryption utilities for sensitive data
 */
class Encryption {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY || 'milea-estate-encryption-key-32-chars';
    
    // In production, ensure key is proper length for algorithm
    if (this.secretKey.length < 32) {
      console.warn('Warning: Encryption key is too short for AES-256');
    }
  }
  
  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   * @returns {Object} - Encrypted data with iv and auth tag
   */
  encrypt(text) {
    try {
      // Generate initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm, 
        Buffer.from(this.secretKey.slice(0, 32)), 
        iv
      );
      
      // Encrypt data
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag (for GCM mode)
      const authTag = cipher.getAuthTag().toString('hex');
      
      return {
        iv: iv.toString('hex'),
        encrypted,
        authTag
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt sensitive data
   * @param {Object} data - Encrypted data with iv and auth tag
   * @returns {string} - Decrypted text
   */
  decrypt(data) {
    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.secretKey.slice(0, 32)),
        Buffer.from(data.iv, 'hex')
      );
      
      // Set auth tag (for GCM mode)
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      // Decrypt data
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Encrypt sensitive fields in an object
   * @param {Object} obj - Object with sensitive data
   * @param {Array} sensitiveFields - Fields to encrypt
   * @returns {Object} - Object with encrypted fields
   */
  encryptFields(obj, sensitiveFields) {
    const result = { ...obj };
    
    for (const field of sensitiveFields) {
      if (result[field]) {
        result[`${field}_encrypted`] = this.encrypt(result[field]);
        delete result[field];
      }
    }
    
    return result;
  }
  
  /**
   * Decrypt sensitive fields in an object
   * @param {Object} obj - Object with encrypted data
   * @returns {Object} - Object with decrypted fields
   */
  decryptFields(obj) {
    const result = { ...obj };
    const encryptedFields = Object.keys(result).filter(key => key.endsWith('_encrypted'));
    
    for (const field of encryptedFields) {
      const originalField = field.replace('_encrypted', '');
      result[originalField] = this.decrypt(result[field]);
      delete result[field];
    }
    
    return result;
  }
}
```# Session Management - Milea Estate Vineyard Chatbot

> [AI DEVELOPMENT GUIDE] This document provides comprehensive instructions and code examples for implementing session management in the Milea Estate Vineyard chatbot. Use this as a reference when implementing user sessions, authentication, and chat history features.

## Table of Contents

1. [Overview](#overview)
2. [Session Tracking Implementation](#session-tracking-implementation)
3. [User Authentication and Identification](#user-authentication-and-identification)
4. [Chat History Management](#chat-history-management)
5. [Integration with Commerce7](#integration-with-commerce7)
6. [Security Considerations](#security-considerations)
7. [Complete Implementation Examples](#complete-implementation-examples)
8. [Testing and Debugging](#testing-and-debugging)

## Overview

Session management is a critical component of the Milea Estate Vineyard chatbot that enables:

- **Conversation Continuity**: Allowing multi-turn conversations with context awareness
- **User Recognition**: Identifying returning users for personalized experiences
- **Commerce7 Integration**: Associating chat sessions with customer data in Commerce7
- **Analytics**: Tracking conversation flows and user engagement
- **Transaction Support**: Enabling wine purchases and reservations with user context

This guide covers the implementation of these features using Express.js, Firebase, and Commerce7 APIs, with a focus on secure, scalable approaches suitable for a production chatbot.

## Session Tracking Implementation

### Basic Session Structure

First, let's define a basic session data structure:

```javascript
/**
 * Session data structure
 * @typedef {Object} ChatSession
 * @property {string} sessionId - Unique session identifier
 * @property {string} [userId] - Anonymous or authenticated user ID
 * @property {string} [commerce7CustomerId] - Commerce7 customer ID if available
 * @property {Array} messages - Array of chat messages
 * @property {Object} context - Session context data
 * @property {Date} createdAt - Session creation timestamp
 * @property {Date} updatedAt - Last session update timestamp
 * @property {string} [source] - Traffic source (website, email, etc.)
 * @property {string} [deviceType] - User device type
 * @property {boolean} isAuthenticated - Whether user is authenticated
 */
```

### In-Memory Session Management (Development)

For development and small-scale deployment, an in-memory session store is simple to implement:

```javascript
const { v4: uuidv4 } = require('uuid');

/**
 * In-memory session manager
 */
class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.sessionTimeout = options.sessionTimeout || 1800000; // 30 minutes
    this.maxSessionsPerUser = options.maxSessionsPerUser || 5;
    
    // Set up session cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredSessions();
    }, 300000); // Clean every 5 minutes
  }
  
  /**
   * Create a new session
   * @param {Object} sessionData - Initial session data
   * @returns {Object} - Created session
   */
  createSession(sessionData = {}) {
    const sessionId = sessionData.sessionId || uuidv4();
    const now = new Date();
    
    const session = {
      sessionId,
      userId: sessionData.userId || `anon_${uuidv4()}`,
      messages: sessionData.messages || [],
      context: sessionData.context || {},
      createdAt: now,
      updatedAt: now,
      source: sessionData.source || 'website',
      deviceType: sessionData.deviceType || 'unknown',
      isAuthenticated: !!sessionData.commerce7CustomerId,
      commerce7CustomerId: sessionData.commerce7CustomerId || null,
      expiresAt: new Date(now.getTime() + this.sessionTimeout)
    };
    
    this.sessions.set(sessionId, session);
    
    return session;
  }
  
  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session or null if not found
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    // Update expiration time
    session.expiresAt = new Date(new Date().getTime() + this.sessionTimeout);
    session.updatedAt = new Date();
    
    return session;
  }
  
  /**
   * Update a session
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} - Updated session or null if not found
   */
  updateSession(sessionId, updates) {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Apply updates
    Object.assign(session, updates, {
      updatedAt: new Date(),
      expiresAt: new Date(new Date().getTime() + this.sessionTimeout)
    });
    
    return session;
  }
  
  /**
   * Add a message to a session
   * @param {string} sessionId - Session ID
   * @param {Object} message - Message to add
   * @returns {boolean} - Success status
   */
  addMessage(sessionId, message) {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Prepare message object
    const messageObj = {
      id: uuidv4(),
      role: message.role || 'user',
      content: message.content,
      timestamp: new Date()
    };
    
    // Add sources if it's an assistant message
    if (message.role === 'assistant' && message.sources) {
      messageObj.sources = message.sources;
    }
    
    // Add the message
    session.messages.push(messageObj);
    session.updatedAt = new Date();
    session.expiresAt = new Date(new Date().getTime() + this.sessionTimeout);
    
    return true;
  }
  
  /**
   * Get sessions for a user
   * @param {string} userId - User ID
   * @returns {Array} - User sessions
   */
  getUserSessions(userId) {
    const userSessions = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }
    
    return userSessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  /**
   * Delete a session
   * @param {string} sessionId - Session ID to delete
   * @returns {boolean} - Success status
   */
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }
  
  /**
   * Clean expired sessions
   */
  cleanExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired sessions`);
    }
  }
  
  /**
   * Get total active sessions count
   * @returns {number} - Active sessions count
   */
  getActiveSessionsCount() {
    return this.sessions.size;
  }
  
  /**
   * Shutdown the session manager
   */
  shutdown() {
    clearInterval(this.cleanupInterval);
  }
}

// Export session manager
module.exports = SessionManager;
```

### Persistent Session Storage (Production)

For production use, a persistent storage solution is necessary. Here's an implementation using Firebase Firestore:

```javascript
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

/**
 * Firestore session manager for production
 */
class FirestoreSessionManager {
  constructor(options = {}) {
    // Initialize Firebase if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    
    this.db = admin.firestore();
    this.sessionsCollection = options.collection || 'chatSessions';
    this.sessionTimeout = options.sessionTimeout || 1800000; // 30 minutes
    this.maxSessionsPerUser = options.maxSessionsPerUser || 5;
  }
  
  /**
   * Create a new session
   * @param {Object} sessionData - Initial session data
   * @returns {Promise<Object>} - Created session
   */
  async createSession(sessionData = {}) {
    const sessionId = sessionData.sessionId || uuidv4();
    const now = new Date();
    
    const session = {
      sessionId,
      userId: sessionData.userId || `anon_${uuidv4()}`,
      messages: sessionData.messages || [],
      context: sessionData.context || {},
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      source: sessionData.source || 'website',
      deviceType: sessionData.deviceType || 'unknown',
      isAuthenticated: !!sessionData.commerce7CustomerId,
      commerce7CustomerId: sessionData.commerce7CustomerId || null,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + this.sessionTimeout))
    };
    
    // Save to Firestore
    await this.db.collection(this.sessionsCollection).doc(sessionId).set(session);
    
    // Convert timestamps back to dates for consistent API
    return this._convertTimestamps(session);
  }
  
  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} - Session or null if not found
   */
  async getSession(sessionId) {
    try {
      const doc = await this.db.collection(this.sessionsCollection).doc(sessionId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const session = this._convertTimestamps(doc.data());
      
      // Check if session is expired
      if (new Date() > session.expiresAt) {
        // Delete expired session
        await this.deleteSession(sessionId);
        return null;
      }
      
      // Update expiration time
      const updates = {
        updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(new Date().getTime() + this.sessionTimeout))
      };
      
      await this.db.collection(this.sessionsCollection).doc(sessionId).update(updates);
      
      // Apply updates to returned session
      session.updatedAt = new Date();
      session.expiresAt = new Date(new Date().getTime() + this.sessionTimeout);
      
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
  
  /**
   * Update a session
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} - Updated session or null if not found
   */
  async updateSession(sessionId, updates) {
    try {
      // Check if session exists
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return null;
      }
      
      // Prepare updates
      const firestoreUpdates = { ...updates };
      
      // Convert Date objects to Firestore Timestamps
      for (const [key, value] of Object.entries(firestoreUpdates)) {
        if (value instanceof Date) {
          firestoreUpdates[key] = admin.firestore.Timestamp.fromDate(value);
        }
      }
      
      // Add timestamp updates
      firestoreUpdates.updatedAt = admin.firestore.Timestamp.fromDate(new Date());
      firestoreUpdates.expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(new Date().getTime() + this.sessionTimeout)
      );
      
      // Update in Firestore
      await this.db.collection(this.sessionsCollection).doc(sessionId).update(firestoreUpdates);
      
      // Return updated session
      return {
        ...session,
        ...updates,
        updatedAt: new Date(),
        expiresAt: new Date(new Date().getTime() + this.sessionTimeout)
      };
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  }
  
  /**
   * Add a message to a session
   * @param {string} sessionId - Session ID
   * @param {Object} message - Message to add
   * @returns {Promise<boolean>} - Success status
   */
  async addMessage(sessionId, message) {
    try {
      // Get session to make sure it exists and is not expired
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return false;
      }
      
      // Prepare message object
      const messageObj = {
        id: uuidv4(),
        role: message.role || 'user',
        content: message.content,
        timestamp: admin.firestore.Timestamp.fromDate(new Date())
      };
      
      // Add sources if it's an assistant message
      if (message.role === 'assistant' && message.sources) {
        messageObj.sources = message.sources;
      }
      
      // Update Firestore using array union
      await this.db.collection(this.sessionsCollection).doc(sessionId).update({
        messages: admin.firestore.FieldValue.arrayUnion(messageObj),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(new Date().getTime() + this.sessionTimeout))
      });
      
      return true;
    } catch (error) {
      console.error('Error adding message:', error);
      return false;
    }
  }
  
  /**
   * Get sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - User sessions
   */
  async getUserSessions(userId) {
    try {
      const snapshot = await this.db.collection(this.sessionsCollection)
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(this.maxSessionsPerUser)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const sessions = [];
      const now = new Date();
      
      snapshot.forEach(doc => {
        const session = this._convertTimestamps(doc.data());
        
        // Only include non-expired sessions
        if (session.expiresAt > now) {
          sessions.push(session);
        }
      });
      
      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }
  
  /**
   * Delete a session
   * @param {string} sessionId - Session ID to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteSession(sessionId) {
    try {
      await this.db.collection(this.sessionsCollection).doc(sessionId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
  
  /**
   * Clean expired sessions
   * @returns {Promise<number>} - Number of cleaned sessions
   */
  async cleanExpiredSessions() {
    try {
      const now = admin.firestore.Timestamp.fromDate(new Date());
      
      const snapshot = await this.db.collection(this.sessionsCollection)
        .where('expiresAt', '<', now)
        .limit(100) // Process in batches
        .get();
      
      if (snapshot.empty) {
        return 0;
      }
      
      const batch = this.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
      return 0;
    }
  }
  
  /**
   * Convert Firestore timestamps to Date objects
   * @private
   * @param {Object} session - Session with Firestore timestamps
   * @returns {Object} - Session with Date objects
   */
  _convertTimestamps(session) {
    const converted = { ...session };
    
    // Convert Firestore Timestamps to Date objects
    for (const [key, value] of Object.entries(converted)) {
      if (value && typeof value.toDate === 'function') {
        converted[key] = value.toDate();
      }
    }
    
    // Convert timestamp in messages
    if (Array.isArray(converted.messages)) {
      converted.messages = converted.messages.map(msg => {
        const convertedMsg = { ...msg };
        if (convertedMsg.timestamp && typeof convertedMsg.timestamp.toDate === 'function') {
          convertedMsg.timestamp = convertedMsg.timestamp.toDate();
        }
        return convertedMsg;
      });
    }
    
    return converted;
  }
}

module.exports = FirestoreSessionManager;
```

### Express.js Middleware

Integrate session management into Express.js with middleware:

```javascript
/**
 * Session middleware for Express
 * @param {Object} sessionManager - Session manager instance
 * @returns {Function} - Express middleware
 */
function sessionMiddleware(sessionManager) {
  return async (req, res, next) => {
    try {
      // Check for session ID in cookie, header, or query param
      let sessionId = req.cookies?.chatSessionId || 
                     req.headers['x-chat-session-id'] || 
                     req.query.sessionId;
      
      let session = null;
      
      // Try to get existing session
      if (sessionId) {
        session = await sessionManager.getSession(sessionId);
      }
      
      // Create new session if none exists
      if (!session) {
        // Get user info from request
        const source = req.headers['referer'] || 'direct';
        const deviceType = req.headers['user-agent'] ? 
          detectDeviceType(req.headers['user-agent']) : 'unknown';
          
        // Create session
        session = await sessionManager.createSession({
          source,
          deviceType
        });
        
        sessionId = session.sessionId;
        
        // Set session cookie
        res.cookie('chatSessionId', sessionId, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      
      // Attach session to request
      req.chatSession = session;
      
      next();
    } catch (error) {
      console.error('Session middleware error:', error);
      next(error);
    }
  };
}

/**
 * Detect device type from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} - Device type
 */
function detectDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua)) {
    return 'mobile';
  } else if (/tablet|ipad/.test(ua)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

module.exports = { sessionMiddleware };
```

## User Authentication and Identification

### Anonymous User Tracking

Track anonymous users for consistent experiences:

```javascript
/**
 * Anonymous user tracking middleware
 * @returns {Function} - Express middleware
 */
function anonymousUserMiddleware() {
  return (req, res, next) => {
    try {
      // Check if user already has an ID cookie
      let userId = req.cookies?.chatUserId;
      
      // Generate new user ID if none exists
      if (!userId) {
        userId = `anon_${uuidv4()}`;
        
        // Set user ID cookie
        res.cookie('chatUserId', userId, {
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      
      // Update session with user ID if not already set
      if (req.chatSession && req.chatSession.userId.startsWith('anon_') && req.chatSession.userId !== userId) {
        req.chatSession.userId = userId;
      }
      
      // Attach user ID to request
      req.anonymousUserId = userId;
      
      next();
    } catch (error) {
      console.error('Anonymous user middleware error:', error);
      next(error);
    }
  };
}
```

### Commerce7 Authentication Integration

Integrate with Commerce7 for customer authentication:

```javascript
const axios = require('axios');

/**
 * Commerce7 authentication service
 */
class Commerce7AuthService {
  constructor(options = {}) {
    this.clientId = options.clientId || process.env.COMMERCE7_CLIENT_ID;
    this.clientSecret = options.clientSecret || process.env.COMMERCE7_CLIENT_SECRET;
    this.apiUrl = options.apiUrl || 'https://api.commerce7.com/v1';
    this.tokenCache = null;
    this.tokenExpiry = null;
  }
  
  /**
   * Get Commerce7 access token
   * @returns {Promise<string>} - Access token
   */
  async getAccessToken() {
    // Return cached token if valid
    if (this.tokenCache && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.tokenCache;
    }
    
    try {
      // Request new token
      const response = await axios.post('https://api.commerce7.com/v1/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      });
      
      // Cache token
      this.tokenCache = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Subtract 1 minute for safety
      
      return this.tokenCache;
    } catch (error) {
      console.error('Error getting Commerce7 access token:', error);
      throw new Error('Failed to authenticate with Commerce7');
    }
  }
  
  /**
   * Get customer by email
   * @param {string} email - Customer email
   * @returns {Promise<Object>} - Customer data
   */
  async getCustomerByEmail(email) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.apiUrl}/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          email
        }
      });
      
      if (response.data.customers && response.data.customers.length > 0) {
        return response.data.customers[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting customer by email:', error);
      return null;
    }
  }
  
  /**
   * Verify customer login
   * @param {string} email - Customer email
   * @param {string} password - Customer password
   * @returns {Promise<Object|null>} - Customer data or null if invalid
   */
  async verifyCustomerLogin(email, password) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(`${this.apiUrl}/customers/login`, {
        email,
        password
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.customerId) {
        // Get full customer data
        const customerResponse = await axios.get(`${this.apiUrl}/customers/${response.data.customerId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        return customerResponse.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error verifying customer login:', error);
      return null;
    }
  }
  
  /**
   * Get customer by ID
   * @param {string} customerId - Commerce7 customer ID
   * @returns {Promise<Object>} - Customer data
   */
  async getCustomerById(customerId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.apiUrl}/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      return null;
    }
  }
}

/**
 * Commerce7 authentication middleware
 * @param {Object} authService - Commerce7 auth service instance
 * @param {Object} sessionManager - Session manager instance
 * @returns {Function} - Express middleware
 */
function commerce7AuthMiddleware(authService, sessionManager) {
  return async (req, res, next) => {
    try {
      // Check for Commerce7 token in cookie or header
      const commerce7Token = req.cookies?.commerce7Token || req.headers['x-commerce7-token'];
      
      if (!commerce7Token) {
        // No token, continue as anonymous
        return next();
      }
      
      // Verify token and get customer ID
      const [customerId, tokenSignature] = commerce7Token.split(':');
      
      if (!customerId || !tokenSignature) {
        // Invalid token format
        res.clearCookie('commerce7Token');
        return next();
      }
      
      // Get customer data
      const customer = await authService.getCustomerById(customerId);
      
      if (!customer) {
        // Invalid customer ID
        res.clearCookie('commerce7Token');
        return next();
      }
      
      // Attach customer to request
      req.commerce7Customer = customer;
      
      // Update session with customer data if session exists
      if (req.chatSession) {
        await sessionManager.updateSession(req.chatSession.sessionId, {
          commerce7CustomerId: customer.id,
          isAuthenticated: true,
          commerce7CustomerName: `${customer.firstName} ${customer.lastName}`,
          commerce7CustomerEmail: customer.email
        });
        
        // Update session in request
        req.chatSession.commerce7CustomerId = customer.id;
        req.chatSession.isAuthenticated = true;
        req.chatSession.commerce7CustomerName = `${customer.firstName} ${customer.lastName}`;
        req.chatSession.commerce7CustomerEmail = customer.email;
      }
      
      next();
    } catch (error) {
      console.error('Commerce7 auth middleware error:', error);
      // Continue as anonymous on error
      next();
    }
  };
}
```

### Login/Logout Endpoints

Implement authentication endpoints:

```javascript
const express = require('express');
const router = express.Router();

/**
 * Setup authentication routes
 * @param {Object} authService - Commerce7 auth service
 * @param {Object} sessionManager - Session manager
 * @returns {Object} - Express router
 */
function setupAuthRoutes(authService, sessionManager) {
  // Login endpoint
  router.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Verify credentials with Commerce7
      const customer = await authService.verifyCustomerLogin(email, password);
      
      if (!customer) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Create Commerce7 token (customerId:signature)
      // Note: In a production app, use a proper token signing/verification method
      const commerce7Token = `${customer.id}:${createTokenSignature(customer.id)}`;
      
      // Set auth cookie
      res.cookie('commerce7Token', commerce7Token, {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Update current session with customer info
      if (req.chatSession) {
        await sessionManager.updateSession(req.chatSession.sessionId, {
          commerce7CustomerId: customer.id,
          isAuthenticated: true,
          commerce7CustomerName: `${customer.firstName} ${customer.lastName}`,
          commerce7CustomerEmail: customer.email
        });
      }
      
      // Return success
      res.json({
        success: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });
  
  // Logout endpoint
  router.post('/api/auth/logout', async (req, res) => {
    try {
      // Clear auth cookie
      res.clearCookie('commerce7Token');
      
      // Update current session
      if (req.chatSession) {
        await sessionManager.updateSession(req.chatSession.sessionId, {
          commerce7CustomerId: null,
          isAuthenticated: false,
          commerce7CustomerName: null,
          commerce7CustomerEmail: null
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });
  
  // Get current user info
  router.get('/api/auth/me', (req, res) => {
    if (req.commerce7Customer) {
      const customer = req.commerce7Customer;
      
      res.json({
        authenticated: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email
        }
      });
    } else {
      res.json({
        authenticated: false,
        anonymousId: req.anonymousUserId
      });
    }
  });
  
  return router;
}

/**
 * Create a simple token signature
 * Note: In production, use a proper signing method with JWT
 * @param {string} customerId - Commerce7 customer ID
 * @returns {string} - Token signature
 */
function createTokenSignature(customerId) {
  const timestamp = Date.now().toString();
  const secret = process.env.TOKEN_SECRET || 'milea-vineyard-secret';
  
  // Simple HMAC-like function for example purposes only
  // In production, use a proper crypto library
  return Buffer.from(`${customerId}:${timestamp}:${secret}`).toString('base64');
}

module.exports = { setupAuthRoutes };
```