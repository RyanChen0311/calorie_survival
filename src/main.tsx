import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { loadRemoteConfig } from './config'

// 立即渲染，不等 config 回應 → 啟動速度最快
// config 在背景載入；遊戲開始前通常已完成，不影響數值正確性
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
loadRemoteConfig()
