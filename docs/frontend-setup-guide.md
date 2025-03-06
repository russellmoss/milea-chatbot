# Milea Estate Chatbot Frontend - Modern Setup Guide

## Project Requirements

I'm building a modern frontend for the Milea Estate Vineyard chatbot as described in my project documentation. Here are the key requirements:

- **Framework**: React with modern practices (hooks, functional components)
- **Styling**: Tailwind CSS with Milea Estate branding (wine reds, vineyard greens, earthy tones)
- **State Management**: React Context API for chat state
- **API Communication**: Integration with backend and Commerce7
- **Responsive Design**: Works on mobile and desktop
- **Components**: Chat widget that can be embedded in the Milea website

Please help me set up this project using current best practices, avoiding any deprecated approaches or libraries.

## Preferred Setup Approach

I want to use Vite instead of Create React App for a faster development experience and modern tooling. Please provide PowerShell commands for this approach.

## Brand Colors

Use these colors for Milea Estate branding:
- Wine Red: #722F37
- Vineyard Green: #4A5D23
- Earth Brown: #8B5A2B

## Project Structure

I'd like the following folder structure:
```
src/
├── assets/         # Images, icons, etc.
├── components/     # Reusable UI components
│   └── chat/       # Chat-specific components
├── context/        # React Context for state management
├── hooks/          # Custom React hooks
├── services/       # API services
│   ├── api.js      # Backend API integration
│   └── commerce7.js # Commerce7 integration
└── utils/          # Utility functions
```

## Required Components

Please provide code examples for:
1. A responsive chat widget component
2. Chat bubble component for messages
3. Chat input component with send button
4. Context setup for chat state management
5. API service for communication with backend
6. Basic Commerce7 integration

## Styling Approach

I prefer using Tailwind CSS with the official Tailwind plugin approach, not using any deprecated methods.

## Development Commands

Please provide PowerShell commands for:
1. Setting up a new Vite + React + Tailwind project
2. Starting the development server
3. Building for production
