import { motion } from 'framer-motion'
import { useSettingsStore } from '../store/settingsStore'
import { sfx } from '../audio/sfx'

export default function SoundToggle({ className = '' }: { className?: string }) {
  const muted       = useSettingsStore(s => s.muted)
  const toggleMuted = useSettingsStore(s => s.toggleMuted)

  const handleClick = () => {
    toggleMuted()
    // toggleMuted 是同步的，這裡讀到的已是新狀態：剛開啟時播放提示音
    if (!useSettingsStore.getState().muted) sfx.play('toggle')
  }

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={handleClick}
      aria-label={muted ? '開啟音效' : '關閉音效'}
      className={`px-2 py-0.5 rounded-md bg-white/10 text-[13px] leading-none shrink-0 ${className}`}
    >
      {muted ? '🔇' : '🔊'}
    </motion.button>
  )
}
