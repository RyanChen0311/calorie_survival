import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

function AnimatedValue({ value, className = '' }: { value: string | number; className?: string }) {
  return (
    <motion.span
      key={String(value)}
      initial={{ scale: 1.4 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className={`font-bold tabular-nums ${className}`}
    >
      {value}
    </motion.span>
  )
}

export default function StatusBar() {
  const current     = useGameStore(s => s.current)
  const restartGame = useGameStore(s => s.restartGame)
  const [confirm, setConfirm] = useState(false)

  if (!current) return null

  const { day, money, excessCalories, weight } = current

  const moneyClass = money < 0 ? 'text-red-400' : money < 200 ? 'text-yellow-400' : 'text-green-400'
  const calClass   = excessCalories > 500 ? 'text-orange-400' : excessCalories < 0 ? 'text-green-400' : 'text-white'
  const weightClass = weight > 65 ? 'text-orange-400' : weight < 58 ? 'text-green-400' : 'text-white'

  return (
    <div className="w-full bg-[#071e18] border-b border-white/10 text-sm">
      {/* Day 進度條 */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <span className="text-white/40 text-[10px]">DAY</span>
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
              i < day ? 'bg-green-400' : i === day - 1 ? 'bg-yellow-400' : 'bg-white/15'
            }`}
          />
        ))}
        <span className="text-white/60 text-[10px]">{day}/7</span>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setConfirm(true)}
          className="ml-1 px-2 py-0.5 rounded-md bg-white/10 text-white/60 text-[11px] font-medium shrink-0"
        >
          重來
        </motion.button>
      </div>

      {/* 確認對話框 */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-8"
            onClick={() => setConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xs bg-[#0f2d25] border border-white/20 rounded-2xl p-6 flex flex-col gap-4"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">↩</div>
                <div className="text-white font-bold text-base">重新開始？</div>
                <div className="text-white/40 text-xs mt-1">目前進度將全部清除</div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/60 text-sm font-medium"
                >
                  取消
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={restartGame}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold"
                >
                  確定重來
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 狀態表格（3欄，移除體力） */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-white/5">
            <th className="text-center text-[9px] text-white/40 font-normal py-0.5 w-1/3">💰 金錢</th>
            <th className="text-center text-[9px] text-white/40 font-normal py-0.5 w-1/3">🔥 多餘熱量</th>
            <th className="text-center text-[9px] text-white/40 font-normal py-0.5 w-1/3">⚖️ 體重</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-center py-1.5">
              <AnimatedValue value={`$${money.toLocaleString()}`} className={moneyClass} />
            </td>
            <td className="text-center py-1.5">
              <AnimatedValue value={`${excessCalories} kcal`} className={calClass} />
            </td>
            <td className="text-center py-1.5">
              <AnimatedValue value={`${weight.toFixed(1)} kg`} className={weightClass} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
