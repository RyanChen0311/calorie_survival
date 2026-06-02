import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'

export default function SettlementPhase() {
  const { current, advancePhase } = useGameStore()
  if (!current) return null

  const { weight, excessCalories, day, burnedToday, targetCalories } = current

  // 體重預測（store 在 advancePhase 後才真正更新）
  const weightDelta = excessCalories >= 0
    ? Math.floor(excessCalories / 500)
    : -Math.floor(-excessCalories / 500)
  const newWeight = Math.max(40, weight + weightDelta)
  const gained = weightDelta > 0
  const lost   = weightDelta < 0

  // 今日熱量流向
  const netToday = targetCalories - burnedToday

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center flex-1 gap-4 px-4 py-4"
    >
      <div className="text-white/50 text-xs">Day {day} 結算</div>

      {/* 今日熱量摘要 */}
      <div className="w-full bg-[#0f2d25] rounded-xl border border-white/10 overflow-hidden">
        <div className="text-[10px] text-white/40 px-3 py-2 bg-white/5 border-b border-white/10">
          今日熱量流向
        </div>
        <div className="divide-y divide-white/5">
          <Row label="🥤 飲料熱量" value={`+${targetCalories} kcal`} valueClass="text-orange-400" />
          <Row label="🏃 運動消耗" value={burnedToday > 0 ? `-${burnedToday} kcal` : '0 kcal（未運動）'}
               valueClass={burnedToday > 0 ? 'text-green-400' : 'text-white/30'} />
          <Row label="📊 今日淨值" value={`${netToday >= 0 ? '+' : ''}${netToday} kcal`}
               valueClass={netToday > 0 ? 'text-orange-400' : 'text-green-400'} />
          <Row label="📦 累積熱量" value={`${excessCalories >= 0 ? '+' : ''}${excessCalories} kcal`}
               valueClass={excessCalories >= 500 ? 'text-red-400' : excessCalories < 0 ? 'text-green-400' : 'text-white/60'} />
        </div>
      </div>

      {/* 體重計 */}
      <motion.div
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-full bg-[#0f2d25] rounded-2xl p-5 text-center border border-white/10"
      >
        <div className="text-3xl mb-2">⚖️</div>
        <div className="text-white/40 text-xs mb-2">明日體重</div>

        <motion.div
          key={newWeight}
          initial={{ y: gained ? -16 : lost ? 16 : 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
          className={`text-4xl font-bold ${gained ? 'text-red-400' : lost ? 'text-green-400' : 'text-white'}`}
        >
          {newWeight.toFixed(1)} kg
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-sm"
        >
          {gained ? (
            <span className="text-red-400">🔺 +{weightDelta} kg　累積熱量超過閾值！</span>
          ) : lost ? (
            <span className="text-green-400">🔻 {weightDelta} kg　燃燒有成！</span>
          ) : (
            <span className="text-white/40">體重維持（累積 &lt; 500 kcal）</span>
          )}
        </motion.div>

        <div className="text-[10px] text-white/20 mt-2">
          每累積 ±500 kcal → 體重 ±1 kg
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.95 }}
        onClick={advancePhase}
        className={`w-full font-bold py-3.5 rounded-xl text-sm ${
          day >= 7 ? 'bg-yellow-400 text-black' : 'bg-indigo-600 text-white'
        }`}
      >
        {day >= 7 ? '🏆 進入最終結算！' : `進入 Day ${day + 1} →`}
      </motion.button>
    </motion.div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex justify-between items-center px-3 py-2 text-xs">
      <span className="text-white/50">{label}</span>
      <span className={`font-bold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  )
}
