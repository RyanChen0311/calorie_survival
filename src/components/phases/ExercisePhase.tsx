import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore, type AllocationIndex } from '../../store/gameStore'
import {
  calcExerciseCalories, getEfficiencyZone, getRequiredEquipment,
  type EfficiencyZone, type ExerciseType,
} from '../../data/exercises'
import { STAMINA_EVENTS, type StaminaEvent } from '../../data/stamina'
import { ALLOCATION_STEP } from '../../config/constants'
import { sfx } from '../../audio/sfx'

const ZONE_LABEL: Record<EfficiencyZone, string> = { high: '高效', mid: '遞減', low: '低效' }
const ZONE_TEXT:  Record<EfficiencyZone, string> = { high: 'text-green-400', mid: 'text-yellow-400', low: 'text-orange-400' }

export default function ExercisePhase() {
  const {
    current, exerciseCounts, setAllocation, advancePhase, skipExercise, buyEquipment, replenishStamina,
  } = useGameStore(useShallow(s => ({
    current:          s.current,
    exerciseCounts:   s.exerciseCounts,
    setAllocation:    s.setAllocation,
    advancePhase:     s.advancePhase,
    skipExercise:     s.skipExercise,
    buyEquipment:     s.buyEquipment,
    replenishStamina: s.replenishStamina,
  })))
  const [revealed, setRevealed] = useState(false)

  // 卡片內多次查詢是否已購，轉成 Set：O(1) 查詢
  const ownedEquipment = current?.ownedEquipment
  const ownedSet = useMemo(() => new Set(ownedEquipment ?? []), [ownedEquipment])

  if (!current) return null
  const { offeredExercises, allocations, burnedToday, dailyStamina, money } = current
  const totalUsed = allocations.reduce((s, v) => s + v, 0)
  const remaining = dailyStamina - totalUsed
  const usedPct   = dailyStamina > 0 ? Math.min((totalUsed / dailyStamina) * 100, 100) : 0

  const handleReveal = () => {
    sfx.play('whistle')
    setRevealed(true)
  }

  const handleReplenish = (ev: StaminaEvent) => {
    sfx.play('stamina')
    replenishStamina(ev.stamina, ev.cost)
  }

  const handleBuy = (itemId: string, cost: number) => {
    sfx.play('buy')
    buyEquipment(itemId, cost)
  }

  const handleAllocate = (index: AllocationIndex, value: number) => {
    if (value !== allocations[index]) sfx.play('tick')
    setAllocation(index, value)
  }

  const handleStart = () => {
    sfx.play(burnedToday > 0 ? 'exerciseStart' : 'tap')
    advancePhase()
  }

  const handleSkip = () => {
    sfx.play('tap')
    skipExercise()   // 已分配的體力會歸零，不燃燒、不累計次數
  }

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
            onClick={handleReveal}
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
            animate={{ width: `${usedPct}%` }}
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

      <StaminaShop money={money} onReplenish={handleReplenish} />

      {/* 3 種運動卡片 */}
      <div className="flex flex-col gap-3">
        {offeredExercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            index={i as AllocationIndex}
            allocation={allocations[i]}
            count={exerciseCounts[ex.id] ?? 0}
            ownedSet={ownedSet}
            money={money}
            remaining={remaining}
            dailyStamina={dailyStamina}
            onAllocate={handleAllocate}
            onBuy={handleBuy}
          />
        ))}
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
          onClick={handleStart}
          className={`w-full font-bold py-3.5 rounded-xl text-sm transition-colors ${
            burnedToday > 0 ? 'bg-green-500 text-black' : 'bg-sky-700/60 text-white/60'
          }`}
        >
          {burnedToday > 0 ? `開始運動，消耗 ${burnedToday} kcal →` : '開始運動 →'}
        </motion.button>
        <button
          onClick={handleSkip}
          className="text-xs text-white/25 py-1 text-center"
        >
          跳過運動
        </button>
      </div>
    </motion.div>
  )
}

// ── 補充體力菜單 ─────────────────────────────────────────

function StaminaShop({ money, onReplenish }: {
  money: number
  onReplenish: (ev: StaminaEvent) => void
}) {
  return (
    <div className="bg-[#0f2d25] rounded-xl border border-white/10 overflow-hidden shrink-0">
      <div className="text-xs text-white/40 px-3 py-1.5 bg-white/5 border-b border-white/10">
        補充體力（花費金錢恢復體力上限）
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/5">
        {STAMINA_EVENTS.map(ev => {
          const afford = money >= ev.cost
          return (
            <button
              key={ev.name}
              onClick={() => onReplenish(ev)}
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
  )
}

// ── 單一運動卡片 ─────────────────────────────────────────

function ExerciseCard({
  ex, index, allocation: x, count, ownedSet, money, remaining, dailyStamina, onAllocate, onBuy,
}: {
  ex: ExerciseType
  index: AllocationIndex
  allocation: number
  count: number
  ownedSet: ReadonlySet<string>
  money: number
  remaining: number
  dailyStamina: number
  onAllocate: (index: AllocationIndex, value: number) => void
  onBuy: (itemId: string, cost: number) => void
}) {
  const kcal     = calcExerciseCalories(ex, x)
  const zone     = getEfficiencyZone(x)
  const required = getRequiredEquipment(ex, count)
  const equipped = required.every(item => ownedSet.has(item.id))

  // 滑桿上限 = 當日體力（補充後可 > 100）；實際可分配量仍由 store 依剩餘體力限制
  const sliderMax = Math.max(dailyStamina, 1)
  const fillPct   = Math.min((x / sliderMax) * 100, 100)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
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
            const owned  = ownedSet.has(item.id)
            const afford = money >= item.cost
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
                      onClick={() => onBuy(item.id, item.cost)}
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

      {/* 滑桿 + 步進按鈕：裝備不齊時 disabled（同時擋觸控與鍵盤） */}
      <div className={`flex items-center gap-2 px-3 pb-3 ${!equipped ? 'opacity-30' : ''}`}>
        <button
          onClick={() => onAllocate(index, x - ALLOCATION_STEP)}
          disabled={!equipped || x <= 0}
          className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold text-sm disabled:opacity-30 active:bg-white/20"
        >-</button>

        <div className="flex-1">
          <input
            type="range" min={0} max={sliderMax} step={1} value={x}
            disabled={!equipped}
            onChange={e => onAllocate(index, Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #38bdf8 ${fillPct}%, #ffffff20 ${fillPct}%)`,
            }}
          />
        </div>

        <button
          onClick={() => onAllocate(index, x + ALLOCATION_STEP)}
          disabled={!equipped || remaining <= 0}
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
}
