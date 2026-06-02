import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { calcExerciseCalories, getEfficiencyZone, getRequiredEquipment } from '../../data/exercises'

const ZONE_LABEL   = { high: '高效', mid: '遞減', low: '低效' }
const ZONE_TEXT    = { high: 'text-green-400', mid: 'text-yellow-400', low: 'text-orange-400' }

const STAMINA_EVENTS = [
  { emoji: '🪑', name: '坐下休息',   stamina: 10,  cost: 25  },
  { emoji: '🥤', name: '喝補給飲料', stamina: 15,  cost: 35  },
  { emoji: '🍱', name: '吃飯',       stamina: 20,  cost: 45  },
  { emoji: '🍵', name: '泡茶放鬆',   stamina: 25,  cost: 55  },
  { emoji: '💆', name: '按摩',       stamina: 35,  cost: 75  },
  { emoji: '😴', name: '睡一覺',     stamina: 50,  cost: 100 },
  { emoji: '🛁', name: '泡澡',       stamina: 75,  cost: 140 },
  { emoji: '💉', name: '專業護理',   stamina: 100, cost: 175 },
]

export default function ExercisePhase() {
  const { current, setAllocation, advancePhase, buyEquipment, replenishStamina, exerciseCounts } = useGameStore()
  const [revealed, setRevealed] = useState(false)

  if (!current) return null
  const { offeredExercises, allocations, burnedToday, ownedEquipment, dailyStamina } = current
  const totalUsed = allocations.reduce((s, v) => s + v, 0)
  const remaining = dailyStamina - totalUsed

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
          <div className="text-white/50 text-xs">今日可選運動</div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setRevealed(true)}
            className="w-44 h-44 rounded-3xl bg-gradient-to-br from-sky-700 to-blue-900
                       flex flex-col items-center justify-center gap-2 shadow-lg shadow-sky-900/40"
          >
            <div className="text-5xl">🏃</div>
            <div className="text-white font-bold text-sm">查看今日運動</div>
            <div className="text-sky-300 text-xs">（點擊揭曉）</div>
          </motion.button>
          <div className="text-white/30 text-xs">3 種運動等待你分配體力</div>
        </div>
        <div className="flex-[3]" />
      </motion.div>
    )
  }

  // ── 揭曉後：分配介面 ───────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col flex-1 px-4 py-3 gap-3 overflow-y-auto"
    >
      {/* 頂部總覽 */}
      <div className="bg-[#0f2d25] rounded-xl p-3 border border-white/10 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/50">
            今日體力
            <motion.span key={dailyStamina} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
              className="text-sky-300 font-bold ml-1"
            >{dailyStamina} pts</motion.span>
          </span>
          <span className={`text-xs font-bold ${remaining > 0 ? 'text-sky-400' : 'text-green-400'}`}>
            剩餘 {remaining} pts
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <motion.div
            animate={{ width: `${Math.min((totalUsed / dailyStamina) * 100, 100)}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-2 rounded-full bg-sky-400"
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-white/40">預計消耗熱量</span>
          <motion.span
            key={burnedToday}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400 }}
            className="text-lg font-bold text-green-400"
          >
            -{burnedToday} kcal
          </motion.span>
        </div>
      </div>

      {/* 補充體力菜單 */}
      <div className="bg-[#0f2d25] rounded-xl border border-white/10 overflow-hidden shrink-0">
        <div className="text-xs text-white/40 px-3 py-1.5 bg-white/5 border-b border-white/10">
          補充體力（花費金錢恢復體力上限）
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/5">
          {STAMINA_EVENTS.map(ev => {
            const afford = current.money >= ev.cost
            return (
              <button
                key={ev.name}
                onClick={() => replenishStamina(ev.stamina, ev.cost)}
                disabled={!afford}
                className={`flex items-center gap-2 px-3 py-2 bg-[#0f2d25] transition-colors text-left
                  ${afford ? 'active:bg-white/10' : 'opacity-40'}`}
              >
                <span className="text-lg shrink-0">{ev.emoji}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white/80 truncate">{ev.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-sky-400 font-bold">+{ev.stamina} pts</span>
                    <span className="text-[10px] text-white/30">${ev.cost}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3 種運動卡片 */}
      <div className="flex flex-col gap-3">
        {offeredExercises.map((ex, i) => {
          const x           = allocations[i]
          const kcal        = calcExerciseCalories(ex, x)
          const zone        = getEfficiencyZone(x)
          const count       = exerciseCounts[ex.id] ?? 0
          const required    = getRequiredEquipment(ex, count)
          const missing     = required.filter(item => !ownedEquipment.includes(item.id))
          const equipped    = missing.length === 0
          const canAfford   = (item: { cost: number }) => current.money >= item.cost

          return (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-[#0f2d25] rounded-xl border transition-colors ${
                x > 0 ? 'border-sky-400/40' : equipped ? 'border-white/10' : 'border-orange-400/30'
              }`}
            >
              {/* 標題 */}
              <div className="flex items-center justify-between p-3 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ex.emoji}</span>
                  <div>
                    <div className="font-bold text-white text-sm">{ex.name}</div>
                    <div className="text-white/40 text-[10px]">{ex.hint}</div>
                  </div>
                </div>
                <div className="text-right">
                  <motion.div
                    key={kcal}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={`text-base font-bold ${x > 0 ? 'text-green-400' : 'text-white/30'}`}
                  >
                    {x > 0 ? `-${kcal} kcal` : '0 kcal'}
                  </motion.div>
                  {x > 0 && (
                    <div className={`text-[10px] font-bold ${ZONE_TEXT[zone]}`}>
                      {ZONE_LABEL[zone]}
                    </div>
                  )}
                </div>
              </div>

              {/* 裝備區 */}
              <div className="mx-3 mb-2 rounded-lg bg-black/20 border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/5">
                  <span className="text-[10px] text-white/40">所需裝備</span>
                  {equipped
                    ? <span className="text-[10px] text-green-400 font-bold">✓ 裝備齊全</span>
                    : <span className="text-[10px] text-orange-400">購買以下裝備才可運動</span>
                  }
                </div>
                <div className="divide-y divide-white/5">
                  {required.map(item => {
                    const owned = ownedEquipment.includes(item.id)
                    const afford = canAfford(item)
                    return (
                      <div key={item.id} className="flex items-center justify-between px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{item.emoji}</span>
                          <span className={`text-xs ${owned ? 'text-white/30 line-through' : 'text-white/70'}`}>
                            {item.name}
                          </span>
                        </div>
                        {owned
                          ? <span className="text-[10px] text-green-400 font-bold">✓ 已購</span>
                          : (
                            <button
                              onClick={() => buyEquipment(item.id, item.cost)}
                              disabled={!afford}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                                afford
                                  ? 'bg-yellow-500/20 text-yellow-300 active:bg-yellow-500/40'
                                  : 'bg-white/5 text-white/20'
                              }`}
                            >
                              ${item.cost.toLocaleString()}
                            </button>
                          )
                        }
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 效率進度條 */}
              {x > 0 && (
                <div className="flex gap-0.5 mx-3 mb-2">
                  {Array.from({ length: 10 }, (_, j) => {
                    const threshold = (j + 1) * 10
                    const filled = x >= threshold
                    const color  = threshold <= 30 ? 'bg-green-400' : threshold <= 60 ? 'bg-yellow-400' : 'bg-orange-500'
                    return <div key={j} className={`flex-1 h-1 rounded-full ${filled ? color : 'bg-white/10'}`} />
                  })}
                </div>
              )}

              {/* 滑桿 + 步進按鈕 */}
              <div className={`flex items-center gap-2 px-3 pb-3 ${!equipped ? 'opacity-30 pointer-events-none' : ''}`}>
                <button
                  onClick={() => setAllocation(i as 0 | 1 | 2, x - 10)}
                  disabled={x <= 0}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-sm disabled:opacity-30 active:bg-white/20"
                >-</button>

                <div className="flex-1">
                  <input
                    type="range" min={0} max={100} value={x}
                    onChange={e => setAllocation(i as 0 | 1 | 2, Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #38bdf8 ${x}%, #ffffff20 ${x}%)`,
                    }}
                  />
                </div>

                <button
                  onClick={() => setAllocation(i as 0 | 1 | 2, x + 10)}
                  disabled={remaining <= 0}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-sm disabled:opacity-30 active:bg-white/20"
                >+</button>

                <span className="w-10 text-center text-sm font-bold text-sky-400 tabular-nums">{x}</span>
              </div>

              {!equipped && (
                <div className="text-center text-[10px] text-orange-400/70 pb-2">
                  購齊裝備後才能分配體力
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* 策略提示 */}
      <div className="text-[10px] text-white/30 text-center leading-relaxed shrink-0">
        綠色 = 高效區(0–30) ｜ 黃色 = 遞減區(31–60) ｜ 橘色 = 低效區(61+)<br/>
        分散投入多種運動，效益通常優於集中單一
      </div>

      {/* 底部按鈕 */}
      <div className="flex flex-col gap-2 shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={advancePhase}
          className={`w-full font-bold py-3.5 rounded-xl text-sm transition-colors ${
            burnedToday > 0 ? 'bg-green-500 text-black' : 'bg-sky-700/60 text-white/60'
          }`}
        >
          {burnedToday > 0 ? `開始運動，消耗 ${burnedToday} kcal →` : '開始運動 →'}
        </motion.button>
        <button
          onClick={advancePhase}
          className="text-xs text-white/25 py-1 text-center"
        >
          跳過運動
        </button>
      </div>
    </motion.div>
  )
}
