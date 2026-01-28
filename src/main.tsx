import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './utils/serviceWorker'

// Register Service Worker for image caching
registerServiceWorker()

createRoot(document.getElementById('root')!).render(<App />)
