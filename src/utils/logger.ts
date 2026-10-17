// ── 統一 log 介面 ─────────────────────────────────────────
// 所有訊息帶 [CS][tag] 前綴，DevTools 中可用 "[CS]" 過濾。
// debug 只在開發模式輸出；warn / error 正式環境也保留，方便使用者回報問題。

const PREFIX = '[CS]'
// Node 模擬腳本（scripts/simulate.ts）沒有 Vite 注入的 import.meta.env
const IS_DEV = import.meta.env?.DEV ?? false

export const logger = {
  debug(tag: string, ...args: unknown[]) {
    if (IS_DEV) console.debug(`${PREFIX}[${tag}]`, ...args)
  },
  warn(tag: string, ...args: unknown[]) {
    console.warn(`${PREFIX}[${tag}]`, ...args)
  },
  error(tag: string, ...args: unknown[]) {
    console.error(`${PREFIX}[${tag}]`, ...args)
  },
}

/** 把任意 throw 出來的值轉成可顯示的字串 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return typeof err === 'string' ? err : JSON.stringify(err)
}
