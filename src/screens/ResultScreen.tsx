import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { calcScore, getRankInfo } from '../utils/scoring'

export default function ResultScreen() {
  const { dayRecords, difficulty, restartGame } = useGameStore()
  const last = dayRecords[dayRecords.length - 1]
  if (!last) return null

  const { money, weight } = last
  const moneyBonus   = Math.round(money * 1.5)
  const weightDelta  = weight - 60
  const weightPenalty = weightDelta * 500
  const score = calcScore(money, weight)
  const rank  = getRankInfo(score, difficulty ?? 'normal')

  const diffLabel = difficulty === 'easy' ? '簡單' : difficulty === 'normal' ? '普通' : '困難'

  const handleShare = () => {
    const text = `我在 Calorie Survival（${diffLabel}模式）活過了7天！獲得${rank.label}【${rank.description}】評價！得分：${score}`
    navigator.clipboard.writeText(text).catch(() => {})
    alert('已複製到剪貼簿！')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col flex-1 min-h-0 px-4 py-4 gap-3"
    >
      {/* 標題 */}
      <div className="text-center shrink-0">
        <div className="text-white/50 text-xs mb-0.5">7 天挑戰完成</div>
        <h2 className="text-lg font-bold text-white">最終結算報告</h2>
      </div>

      {/* 計分明細 */}
      <div className="shrink-0 bg-[#0f2d25]/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
        <ScoreLine
          label="結算金錢加成"
          formula={`$${money.toLocaleString()} × 1.5`}
          value={`+${moneyBonus.toLocaleString()}`}
          color="text-green-400"
          delay={0.3}
        />
        <ScoreLine
          label={weightDelta >= 0 ? '體重增幅懲罰' : '體重減少獎勵'}
          formula={`(${weight.toFixed(1)} − 60) kg × 500`}
          value={weightPenalty >= 0 ? `-${weightPenalty.toLocaleString()}` : `+${Math.abs(weightPenalty).toLocaleString()}`}
          color={weightPenalty > 0 ? 'text-red-400' : 'text-green-400'}
          delay={0.9}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6, type: 'spring', stiffness: 200 }}
          className="flex items-center justify-between px-4 py-3 bg-white/5 border-t border-white/20"
        >
          <span className="font-bold text-white text-base">TOTAL SCORE</span>
          <span className={`text-3xl font-bold ${
            score >= 5000 ? 'text-yellow-400' : score >= 2000 ? 'text-sky-400' : score >= 500 ? 'text-white' : 'text-red-400'
          }`}>
            {score.toLocaleString()}
          </span>
        </motion.div>
      </div>

      {/* Rank 印章 */}
      <motion.div
        initial={{ scale: 3, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 2.0, type: 'spring', stiffness: 250, damping: 15 }}
        className="shrink-0 flex flex-row items-center justify-center gap-3"
      >
        <div className="text-5xl">{rank.emoji}</div>
        <div>
          <div className="text-2xl font-bold" style={{ color: rank.color }}>{rank.label}</div>
          <div className="text-white/70 text-sm">【{rank.description}】</div>
        </div>
      </motion.div>

      {/* 7 天紀錄表 — flex-1 讓它佔剩餘空間，內部捲動 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4 }}
        className="flex-1 min-h-0 flex flex-col bg-[#0f2d25] rounded-xl border border-white/10 overflow-hidden"
      >
        <div className="shrink-0 text-xs text-white/50 px-3 py-2 bg-white/5">7 天紀錄</div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-[#0f2d25]">
              <tr className="text-white/40 border-b border-white/10">
                <th className="py-1.5 px-2 text-left">Day</th>
                <th className="py-1.5 px-2 text-right">金錢</th>
                <th className="py-1.5 px-2 text-right">多餘熱量</th>
                <th className="py-1.5 px-2 text-right">燃燒</th>
                <th className="py-1.5 px-2 text-right">體重</th>
              </tr>
            </thead>
            <tbody>
              {dayRecords.map(r => (
                <tr key={r.day} className="border-t border-white/5">
                  <td className="py-1.5 px-2 text-white/50">D{r.day}</td>
                  <td className={`py-1.5 px-2 text-right ${r.money < 200 ? 'text-yellow-400' : 'text-white/80'}`}>
                    ${r.money.toLocaleString()}
                  </td>
                  <td className={`py-1.5 px-2 text-right ${r.excessCalories > 500 ? 'text-orange-400' : 'text-white/80'}`}>
                    {r.excessCalories}
                  </td>
                  <td className="py-1.5 px-2 text-right text-green-400">
                    {r.burnedToday > 0 ? `-${r.burnedToday}` : '0'}
                  </td>
                  <td className={`py-1.5 px-2 text-right ${r.weight > 62 ? 'text-orange-400' : r.weight < 60 ? 'text-green-400' : 'text-white/80'}`}>
                    {r.weight.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 按鈕 — shrink-0 讓它永遠在底部 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6 }}
        className="shrink-0 flex gap-3"
      >
        <motion.button whileTap={{ scale: 0.95 }} onClick={restartGame}
          className="flex-1 bg-green-500 text-black font-bold py-3 rounded-xl text-sm">
          再戰一回
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleShare}
          className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">
          分享戰果
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function ScoreLine({ label, formula, value, color, delay }: {
  label: string; formula: string; value: string; color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-between px-4 py-2 border-b border-white/5"
    >
      <div>
        <div className="text-white/50 text-[10px]">{label}</div>
        <div className="text-white/70 text-xs">{formula}</div>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3 }}
        className={`text-xl font-bold ${color}`}
      >
        {value}
      </motion.span>
    </motion.div>
  )
}
