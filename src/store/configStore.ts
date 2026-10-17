import { create } from 'zustand'

// config 物件本身不是 reactive；用這個 store 通知 UI「遠端設定已處理完畢」
// （成功或失敗都會設為 true，失敗時沿用預設值）

interface ConfigState {
  loaded: boolean
  markLoaded: () => void
}

export const useConfigStore = create<ConfigState>()(set => ({
  loaded: false,
  markLoaded: () => set({ loaded: true }),
}))
