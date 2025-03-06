# Milea Chatbot Project Structure

This document outlines the directory structure and files for the Milea Chatbot project, which consists of both a **backend** and a **frontend**. This structure will be referenced throughout the development process to ensure consistency and organization.

---

## 📂 **Backend Directory** (`C:\Users\russe\milea-chatbot`)

### **Primary Purpose**

The backend handles API requests, communicates with OpenAI, integrates with Commerce7, and manages chatbot logic.

### **Key Files and Folders**

```
C:\Users\russe\milea-chatbot
│-- docs/                     # Documentation files
│-- node_modules/             # Backend dependencies
│-- .env                      # Environment variables (API keys, Commerce7 credentials)
│-- package.json              # Backend dependencies and scripts
│-- package-lock.json         # Locked package versions
│-- server.js                 # Main server file for handling API requests
│-- postcss.config.js         # PostCSS configuration (for CSS processing if needed)
│-- tailwind.config.js        # TailwindCSS configuration (if needed for backend UI, unlikely)
```

---

## 📂 **Frontend Directory** (`C:\Users\russe\milea-chatbot-frontend`)

### **Primary Purpose**

The frontend is a React-based web application that provides the user interface for interacting with the chatbot.

### **Key Files and Folders**

```
C:\Users\russe\milea-chatbot-frontend
│-- public/                   # Static assets (favicons, logos, etc.)
│   │-- favicon.ico           # Site icon
│   │-- logo192.png           # Small logo
│   │-- logo512.png           # Large logo
│   │-- manifest.json         # Web app manifest
│   │-- robots.txt            # SEO-related settings
│
│-- src/                      # Main application source code
│   │-- components/           # React components
│   │   │-- chat/             # Chatbot-related components
│   │   │   │-- ChatWidget.jsx # Chatbot UI component
│   │-- App.js                # Main React component
│   │-- App.css               # Global styles for the app
│   │-- index.js              # Entry point for React
│   │-- index.css             # Global TailwindCSS styles
│
│-- node_modules/             # Frontend dependencies
│-- .gitignore                # Files to exclude from Git
│-- package.json              # Frontend dependencies and scripts
│-- package-lock.json         # Locked package versions
│-- tailwind.config.js        # TailwindCSS configuration
│-- postcss.config.js         # PostCSS configuration
```

---

## 🔥 **Future References**

This document will be updated as more features are implemented, including:

- **Commerce7 API integration**
- **Deployment strategies**
- **State management solutions (Redux, Context API)**
- **Chatbot AI improvements (Retrieval-Augmented Generation - RAG)**

This directory structure should guide ongoing development to keep the project well-organized and scalable.

