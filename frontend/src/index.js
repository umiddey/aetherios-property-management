// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";  // This is your AppWrapper
import { BrowserRouter } from 'react-router-dom';  // Add this import

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>  {/* Add this wrapper */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);