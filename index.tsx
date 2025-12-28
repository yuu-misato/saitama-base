import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/* Global Error Handler for startup */
window.addEventListener('error', (event) => {
  const errorMsg = document.createElement('div');
  errorMsg.style.position = 'fixed';
  errorMsg.style.top = '0';
  errorMsg.style.left = '0';
  errorMsg.style.width = '100%';
  errorMsg.style.background = '#fee2e2';
  errorMsg.style.color = '#b91c1c';
  errorMsg.style.padding = '20px';
  errorMsg.style.zIndex = '9999';
  errorMsg.style.fontWeight = 'bold';
  errorMsg.textContent = `Application Error: ${event.message}`;
  document.body.appendChild(errorMsg);
});

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e: any) {
  rootElement.innerHTML = `<div style="padding: 20px; color: red;"><h1>Failed to mount application</h1><pre>${e.message}</pre></div>`;
  console.error("Mount error:", e);
}
