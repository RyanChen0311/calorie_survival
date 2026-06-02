import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

export default function DayHistoryPanel() {
  const { dayRecords, current } = useGameStore()
  const [open, setOpen] = useState(false)

  // 只在遊戲進行中且有歷史記錄時顯示
  const records = dayRecords.filter(r => r.day > 0)
  if (!current || records.length === 0) return null

  return (
    <div className="w-full">
      {/* 開關按鈕 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2
                   bg-[#071e18] border-t border-white/10 text-xs text-white/40
                   active:bg-white/5 transition-colors"
      >
        <span>📋 歷史記錄（{records.length} / 7 天）</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▲
        </motion.span>
      </button>

      {/* 展開的表格 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-[#071e18] border-t border-white/5"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-white/5 text-white/40">
                    <th className="py-1.5 px-2 text-left font-normal">Day</th>
                    <th className="py-1.5 px-2 text-right font-normal">金錢</th>
                    <th className="py-1.5 px-2 text-right font-normal">攝取</th>
                    <th className="py-1.5 px-2 text-right font-normal">消耗</th>
                    <th className="py-1.5 px-2 text-right font-normal">累積kcal</th>
                    <th className="py-1.5 px-2 text-right font-normal">體重</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const prev = i === 0 ? null : records[i - 1]
                    const weightUp   = prev && r.weight > prev.weight
                    const weightDown = prev && r.weight < prev.weight

                    return (
                      <tr key={r.day} className="border-t border-white/5">
                        {/* Day */}
                        <td className="py-1.5 px-2 text-white/50 font-bold">D{r.day}</td>

                        {/* 金錢 */}
                        <td className={`py-1.5 px-2 text-right tabular-nums font-bold ${
                          r.money < 0   ? 'text-red-400 animate-pulse' :
                          r.money < 200 ? 'text-yellow-400' : 'text-green-300'
                        }`}>
                          ${r.money.toLocaleString()}
                        </td>

                        {/* 攝取 */}
                        <td className="py-1.5 px-2 text-right text-orange-400 tabular-nums">
                          +{r.gainedCalories}
                        </td>

                        {/* 消耗 */}
                        <td className="py-1.5 px-2 text-right text-green-400 tabular-nums">
                          {r.burnedToday > 0 ? `-${r.burnedToday}` : '—'}
                        </td>

                        {/* 累積 kcal */}
                        <td className={`py-1.5 px-2 text-right tabular-nums ${
                          r.excessCalories > 500  ? 'text-red-400' :
                          r.excessCalories < 0    ? 'text-green-400' : 'text-white/60'
                        }`}>
                          {r.excessCalories >= 0 ? '+' : ''}{r.excessCalories}
                        </td>

                        {/* 體重 */}
                        <td className={`py-1.5 px-2 text-right tabular-nums font-bold ${
                          weightUp   ? 'text-red-400' :
                          weightDown ? 'text-green-400' : 'text-white/70'
                        }`}>
                          {r.weight.toFixed(1)}
                          {weightUp   && ' 🔺'}
                          {weightDown && ' 🔻'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 警示燈號說明 */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-3 py-1.5
                            text-[9px] text-white/25 border-t border-white/5">
              <span><span className="text-yellow-400">金</span> &lt;$200</span>
              <span><span className="text-red-400">金</span> &lt;$0 破產</span>
              <span><span className="text-red-400">kcal</span> &gt;500 高危</span>
              <span><span className="text-red-400">🔺</span> 體重上升</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
