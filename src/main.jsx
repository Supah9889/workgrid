import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed (dev mode, etc.) — app works fine without it
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)