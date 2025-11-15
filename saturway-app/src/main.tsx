import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { mockTelegramEnv } from './mock'

// Включаем mock для локального просмотра
if (import.meta.env.DEV) {
  mockTelegramEnv();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
