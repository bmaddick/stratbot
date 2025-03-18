/**
 * Application Entry Point
 * 
 * This file serves as the main entry point for the Cracker Barrel Strategy Bot application.
 * It initializes the React application by mounting the root component to the DOM.
 * 
 * The file uses React 18's createRoot API for concurrent rendering capabilities,
 * which provides improved performance for UI updates and better user experience
 * when streaming AI responses.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * React Application Initialization
 * 
 * Creates a React root using the DOM element with id 'root' and renders the App component.
 * The application is wrapped in StrictMode to:
 * 1. Identify potential problems in the application during development
 * 2. Warn about deprecated APIs
 * 3. Help prepare for concurrent rendering features
 * 
 * The non-null assertion (!) is used because we're certain the root element exists in index.html.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
