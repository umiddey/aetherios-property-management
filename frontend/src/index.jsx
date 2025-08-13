/*
 * ==================================================================================
 * FRONTEND ENTRY POINT - WHERE THE REACT APPLICATION STARTS
 * ==================================================================================
 * 
 * This is the main entry point for our React application. When the browser loads
 * our website, this file gets executed and starts the entire React application.
 * 
 * FLOW: index.html loads this file → this file renders App.jsx → App starts the app
 * 
 * KEY CONCEPTS:
 * - React: A JavaScript library for building user interfaces
 * - ReactDOM: The bridge between React and the browser's DOM (webpage elements)
 * - JSX: JavaScript + XML syntax that looks like HTML but runs as JavaScript
 * - Components: Reusable pieces of UI (like LEGO blocks for webpages)
 */

// ==================================================================================
// IMPORTS - Loading external code libraries and our own components
// ==================================================================================

// Import the main React library - this gives us the ability to create components and use JSX
import React from "react";

// Import ReactDOM - this is React's tool for manipulating the actual webpage DOM
// The "/client" part is for React 18's new concurrent features (better performance)
import ReactDOM from "react-dom/client";

// Import global CSS styles - this applies styling to our entire application
// The "./" means "look in the same folder as this file"
import "./index.css";

// Import our main App component - this contains our entire application
// When we write "from './App'", React automatically looks for App.jsx or App.js
import App from "./App";

// Import BrowserRouter from react-router-dom - this enables URL routing (different pages)
// NOTE: This import is actually unused in this file, but left here from earlier development
import { BrowserRouter } from 'react-router-dom';

// ==================================================================================
// REACT APPLICATION STARTUP
// ==================================================================================

/*
 * STEP 1: Find the HTML element where we'll inject our React app
 * 
 * document.getElementById("root") finds the <div id="root"></div> in index.html
 * This is where our entire React application will be rendered
 */
const root = ReactDOM.createRoot(document.getElementById("root"));

/*
 * STEP 2: Render our React application into the webpage
 * 
 * root.render() takes our React components and converts them into actual HTML
 * that the browser can display
 */
root.render(
  /*
   * React.StrictMode is a development tool that helps catch bugs
   * - It runs components twice to detect side effects
   * - It warns about deprecated React features
   * - It only runs in development, not in production
   * - Think of it as "strict mode" for React development
   */
  <React.StrictMode>
      {/* 
       * <App /> is JSX syntax for rendering our App component
       * This is equivalent to calling React.createElement(App)
       * Everything inside App.jsx will be rendered here
       */}
      <App />
  </React.StrictMode>,
);

/*
 * ==================================================================================
 * WHAT HAPPENS NEXT?
 * ==================================================================================
 * 
 * 1. This code runs and finds the <div id="root"> in index.html
 * 2. It creates a React "root" that can render components
 * 3. It renders the <App /> component inside React.StrictMode
 * 4. The App component (defined in App.jsx) takes over and renders the entire application
 * 5. Users see the login page or dashboard depending on their authentication status
 * 
 * DEBUGGING TIPS:
 * - If you see a blank page, check the browser console for errors
 * - If React can't find the "root" element, check that index.html has <div id="root">
 * - If imports fail, check that file paths are correct (case-sensitive on some systems)
 */