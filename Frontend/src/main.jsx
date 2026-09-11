import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Successful boot: re-arm the error boundary's one-time stale-chunk reload.
sessionStorage.removeItem("dp_chunk_reloaded");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
