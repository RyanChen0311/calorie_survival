import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'

export default function DrinkPhase() {
  const { current, advancePhase } = useGameStore()
  const [revealed, setRevealed] = useState(false)

  if (!current || !current.drinkCombo || !current.drinkConstraints) return null
  const { drinkCombo, drinkConstraints, targetCalories } = current

  // 熱量顏色
  const calColor = targetCalories >= 600 ? 'text-red-400' : targetCalories >= 500 ? 'text-orange-400' : 'text-yellow-400'

  // ── 點擊揭曉前 ─────────────────────────────────────────
  if (!revealed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center flex-1 px-4"
      >
        <div className="flex-[2]" />
        <div className="flex flex-col items-center gap-6">
          <div className="text-white/50 text-xs">黑心飲料店來了</div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setRevealed(true)}
            className="w-44 h-44 rounded-3xl bg-gradient-to-br from-red-700 to-rose-900
                       flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-900/40"
          >
            <div className="text-5xl">🥤</div>
            <div className="text-white font-bold text-sm">查看今日帳單</div>
            <div className="text-red-300 text-xs">（點擊揭曉）</div>
          </motion.button>
          <div className="text-white/30 text-xs">強制消費事件，無法逃避</div>
        </div>
        <div className="flex-[3]" />
      </motion.div>
    )
  }

  // ── 揭曉後 ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col flex-1 gap-3 px-4 py-3"
    >
      <div className="text-center">
        <div className="text-white/50 text-xs mb-0.5">黑心飲料店強制消費</div>
        <div className="text-white/30 text-[10px]">
          至少 {drinkConstraints.minCups} 杯 ｜ 至少 ${drinkConstraints.minPrice}
        </div>
      </div>

      {/* 熱量醒目標示 */}
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 250 }}
          className="flex items-center justify-center gap-3 bg-[#0f2d25] border border-red-400/30 rounded-xl py-3"
        >
          <span className="text-2xl">🔥</span>
          <span className={`text-3xl font-bold ${calColor}`}>+{targetCalories} kcal</span>
        </motion.div>
      </AnimatePresence>

      {/* 飲料明細 */}
      <div className="bg-[#0f2d25] rounded-xl overflow-hidden border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-red-900/40 text-white/60">
              <th className="text-left py-2 px-3">品項</th>
              <th className="text-right py-2 px-2">杯</th>
              <th className="text-right py-2 px-2">金額</th>
              <th className="text-right py-2 px-3">熱量</th>
            </tr>
          </thead>
          <tbody>
            {drinkCombo.orders.map((order, i) => (
              <motion.tr
                key={order.drink.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="border-t border-white/5"
              >
                <td className="py-2 px-3 text-white">{order.drink.emoji} {order.drink.name}</td>
                <td className="py-2 px-2 text-right text-white/60">{order.count}</td>
                <td className="py-2 px-2 text-right text-red-400">-${order.drink.price * order.count}</td>
                <td className="py-2 px-3 text-right text-orange-400">{order.drink.calories * order.count}</td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-white/5 border-t border-white/20">
              <td className="py-2 px-3 font-bold text-white text-[11px]">合計</td>
              <td className="py-2 px-2 text-right text-white/60">{drinkCombo.totalCups} 杯</td>
              <td className="py-2 px-2 text-right text-red-400 font-bold">-${drinkCombo.totalPrice}</td>
              <td className="py-2 px-3 text-right font-bold" style={{ color: '#fb923c' }}>+{targetCalories}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.95 }}
        onClick={advancePhase}
        className="w-full bg-red-600 text-white font-bold py-3 rounded-xl text-sm"
      >
        強制扣款 -${drinkCombo.totalPrice} →
      </motion.button>
    </motion.div>
  )
}
