import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 玩家偏好設定，與遊戲存檔分開存放：重來遊戲不會清掉音效設定

interface SettingsState {
  muted: boolean
  toggleMuted: () => void
}

export const useSettingsStore = create<SettingsState>()(persist(
  (set) => ({
    muted: false,
    toggleMuted: () => set(s => ({ muted: !s.muted })),
  }),
  {
    name: 'calorie-survival-settings',
    partialize: (s) => ({ muted: s.muted }),
    merge: (persisted, current) => {
      const muted = (persisted as { muted?: unknown } | null)?.muted
      return typeof muted === 'boolean' ? { ...current, muted } : current
    },
  },
))
