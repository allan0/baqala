// ================================================
// frontend/src/main.jsx - TELEGRAM MVP ENTRY POINT
// ================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);

// Optional: Telegram WebApp global readiness
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  console.log('%c🚀 Baqala Telegram Mini App initialized', 'color:#00f5d4; font-weight:900');
}
