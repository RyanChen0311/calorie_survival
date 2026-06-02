import { motion } from 'framer-motion'
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
  const current = useGameStore(s => s.current)
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
      </div>

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
