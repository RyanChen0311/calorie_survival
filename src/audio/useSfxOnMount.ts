import { useEffect } from 'react'
import { sfx, type SfxId } from './sfx'

/**
 * 元件掛載後（可延遲）播放一次音效。
 * 用 setTimeout + cleanup 而非直接 play：StrictMode 開發模式會 mount → unmount → mount，
 * 第一次的 timer 會被清掉，因此不會重複播放。
 * id 傳 null 表示不播放。
 */
export function useSfxOnMount(id: SfxId | null, delayMs = 0): void {
  useEffect(() => {
    if (!id) return
    const timer = setTimeout(() => sfx.play(id), delayMs)
    return () => clearTimeout(timer)
  }, [id, delayMs])
}
