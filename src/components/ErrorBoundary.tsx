import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '../utils/logger'
import { SAVE_KEY, useGameStore } from '../store/gameStore'

// ── 錯誤處理畫面 ──────────────────────────────────────────
// 兩種來源共用同一個畫面：
//   1. ErrorBoundary：渲染時 throw（例如存檔資料異常）
//   2. store.fatalError：action 中捕捉到的錯誤（例如設定資料毀損）

/** 清除存檔並回首頁。localStorage 在無痕模式可能 throw，需包起來 */
export function resetSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch (err) {
    logger.warn('error', '清除存檔失敗', err)
  }
  useGameStore.getState().restartGame()
}

export function ErrorScreen({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 text-center">
      <div className="text-6xl">🛠️</div>
      <div>
        <div className="text-white font-bold text-lg mb-1">遊戲發生錯誤</div>
        <div className="text-white/40 text-xs break-all">{message}</div>
      </div>
      <button
        onClick={onReset}
        className="w-full max-w-xs bg-green-500 text-black font-bold py-3 rounded-xl text-sm"
      >
        清除存檔並回首頁
      </button>
    </div>
  )
}

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('render', error, info.componentStack)
  }

  private handleReset = () => {
    resetSave()
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen message={this.state.error.message} onReset={this.handleReset} />
    }
    return this.props.children
  }
}
