import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme.css';
import App from './App';

// Defensive shim: ensure window.process exists to avoid runtime ReferenceError in some libs
if (typeof window !== "undefined") {
  // Only define if missing
  if (typeof window.process === "undefined") {
    window.process = { env: {} };
  } else if (typeof window.process.env === "undefined") {
    window.process.env = {};
  }
}

// Entry point - renders App with RouterRoot and applies Ocean Professional theme via Router
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
