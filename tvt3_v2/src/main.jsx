import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Tự động tải lại trang khi có phiên bản mới được deploy làm thay đổi hash file assets
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = parseInt(sessionStorage.getItem('vite_preload_reload_ts') || '0', 10);
  const now = Date.now();
  if (now - lastReload > 10000) {
    sessionStorage.setItem('vite_preload_reload_ts', now.toString());
    window.location.reload();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const errorMsg = event.reason?.message || event.reason?.toString() || '';
  if (
    errorMsg.includes('Failed to fetch dynamically imported module') ||
    errorMsg.includes('Importing a module script failed') ||
    errorMsg.includes('error loading dynamically imported module')
  ) {
    event.preventDefault();
    const lastReload = parseInt(sessionStorage.getItem('vite_preload_reload_ts') || '0', 10);
    const now = Date.now();
    if (now - lastReload > 10000) {
      sessionStorage.setItem('vite_preload_reload_ts', now.toString());
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
