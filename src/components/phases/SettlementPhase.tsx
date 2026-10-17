import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { nextDayWeight, roundWeight } from '../../utils/body'
import { KCAL_PER_KG, START_WEIGHT_KG, TOTAL_DAYS } from '../../config/constants'

/** +0.6 / -0.4 / ±0.0 */
const fmtKg = (kg: number) => `${kg > 0 ? '+' : kg < 0 ? '' : '±'}${kg.toFixed(1)}`
import { sfx } from '../../audio/sfx'
import { useSfxOnMount } from '../../audio/useSfxOnMount'

const WEIGHT_REVEAL_MS = 300   // 與下方體重數字動畫 delay 對齊

export default function SettlementPhase() {
  const current      = useGameStore(s => s.current)
  const advancePhase = useGameStore(s => s.advancePhase)

  // 體重預測（store 在 advancePhase 後才真正更新）；與 store 共用同一個計算函式
  const netToday    = current ? current.targetCalories - current.burnedToday : 0   // 今日淨值
  const newWeight   = current ? nextDayWeight(current.weight, netToday) : 0
  const weightDelta = current ? roundWeight(newWeight - current.weight) : 0       // 與今天相比
  const gained = weightDelta > 0
  const lost   = weightDelta < 0

  // hook 必須在 early return 之前呼叫
  useSfxOnMount(current ? (gained ? 'weightUp' : lost ? 'weightDown' : 'weightSame') : null, WEIGHT_REVEAL_MS)

  if (!current) return null

  const { excessCalories, day, burnedToday, targetCalories } = current
  const totalDelta = roundWeight(newWeight - START_WEIGHT_KG)   // 相對初始體重
  const isLastDay  = day >= TOTAL_DAYS

  const handleNext = () => {
    sfx.play(isLastDay ? 'tap' : 'nextDay')
    advancePhase()
  }

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
          <Row label="📦 總累積熱量" value={`${excessCalories >= 0 ? '+' : ''}${excessCalories} kcal`}
               valueClass={excessCalories >= KCAL_PER_KG ? 'text-red-400' : excessCalories < 0 ? 'text-green-400' : 'text-white/60'} />
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
            <span className="text-red-400">🔺 {fmtKg(weightDelta)} kg　今日熱量盈餘！</span>
          ) : lost ? (
            <span className="text-green-400">🔻 {fmtKg(weightDelta)} kg　燃燒有成！</span>
          ) : (
            <span className="text-white/40">體重與今天相同</span>
          )}
        </motion.div>

        <div className="text-[11px] text-white/40 mt-1">
          相對初始 {START_WEIGHT_KG} kg：{fmtKg(totalDelta)} kg
        </div>

        <div className="text-[10px] text-white/20 mt-2">
          今日淨值每 ±{KCAL_PER_KG} kcal → 體重 ±1 kg（取到 0.1 kg）
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleNext}
        className={`w-full font-bold py-3.5 rounded-xl text-sm ${
          isLastDay ? 'bg-yellow-400 text-black' : 'bg-indigo-600 text-white'
        }`}
      >
        {isLastDay ? '🏆 進入最終結算！' : `進入 Day ${day + 1} →`}
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
