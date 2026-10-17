import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { loadRemoteConfig } from './config'
import { sfx } from './audio/sfx'
import { logger } from './utils/logger'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('找不到 #root 元素，請檢查 index.html')

// 立即渲染，不等 config 回應 → 啟動速度最快
// config 在背景載入；遊戲開始前通常已完成，不影響數值正確性
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

sfx.installUnlockListener()
loadRemoteConfig().catch(err => logger.error('config', '未預期的錯誤', err))
