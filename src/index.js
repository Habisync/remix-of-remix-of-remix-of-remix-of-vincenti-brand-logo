import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ PWA Service Worker registered:', registration.scope);
        // Check for updates
        setInterval(() => registration.update(), 60000);
      })
      .catch((error) => console.log('SW registration failed:', error));
  });
}

// PWA Install prompt handler
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Dispatch custom event for app to show install UI
  window.dispatchEvent(new CustomEvent('pwa-installable'));
});

// Expose install function globally
window.installPWA = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      console.log(choiceResult.outcome === 'accepted' ? '✅ PWA installed' : 'Install declined');
      deferredPrompt = null;
    });
  }
};
