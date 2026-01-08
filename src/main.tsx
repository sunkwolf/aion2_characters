import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './utils/serviceWorker'

// 注册 Service Worker 用于图片缓存
registerServiceWorker()

createRoot(document.getElementById('root')!).render(<App />)
