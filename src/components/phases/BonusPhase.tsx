import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ENHANCE_TABLE } from '../../store/gameStore'

interface LastResult { success: boolean; newBonus: number }

function buildLadder(bonusBase: number) {
  let cumBonus = bonusBase
  return ENHANCE_TABLE.map((entry, i) => {
    cumBonus = Math.round(cumBonus * entry.multi)
    return { label: entry.label, cost: entry.cost, potBonus: cumBonus, index: i }
  })
}

export default function BonusPhase() {
  const { current, enhanceBonus, advancePhase } = useGameStore()
  const [revealed,     setRevealed]     = useState(false)
  const [isAnimating,  setIsAnimating]  = useState(false) // 防止連點；不影響按鈕顯示
  const [lastResult,   setLastResult]   = useState<LastResult | null>(null)

  if (!current) return null
  const { bonus, bonusBase, enhanceLv, money } = current

  const nextEntry = enhanceLv < ENHANCE_TABLE.length ? ENHANCE_TABLE[enhanceLv] : null
  const canAfford = nextEntry ? money >= nextEntry.cost : false
  const ladder    = buildLadder(bonusBase)

  // 純粹由 store 資料決定，和動畫狀態無關
  const showEnhance = !!nextEntry && bonus > 0

  const handleEnhance = () => {
    if (isAnimating || !nextEntry || !canAfford) return

    // 立即執行強化 → store 同步更新 → showEnhance 立刻反映新狀態
    const result = enhanceBonus()
    setLastResult({ success: result.success, newBonus: result.newBonus })

    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
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
          <div className="text-white/50 text-sm">Day {current.day} — 每日獎金</div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setRevealed(true)}
            className="w-40 h-40 rounded-3xl bg-gradient-to-br from-yellow-500 to-orange-600
                       flex flex-col items-center justify-center gap-2 shadow-lg shadow-yellow-700/30"
          >
            <div className="text-5xl">🎰</div>
            <div className="text-white font-bold text-sm">點擊揭曉</div>
          </motion.button>
          <div className="text-white/30 text-xs">今日獎金等待開獎中...</div>
        </div>
        <div className="flex-[3]" />
      </motion.div>
    )
  }

  // ── 揭曉後 ─────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 relative">

      {/* 強化結果：正中央浮現 */}
      <AnimatePresence>
        {lastResult && isAnimating && (
          <motion.div
            key={lastResult.newBonus}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute inset-0 z-20 flex items-start justify-center pt-36 pointer-events-none"
          >
            <div className={`px-8 py-5 rounded-2xl font-bold text-xl shadow-2xl text-center ${
              lastResult.success
                ? 'bg-green-900/90 text-green-300 border border-green-500/40'
                : 'bg-red-900/90 text-red-300 border border-red-500/40'
            }`}>
              {lastResult.success
                ? <>✅ 強化成功！<br/><span className="text-2xl">${lastResult.newBonus.toLocaleString()}</span></>
                : <>💥 強化失敗！<br/><span className="text-lg">獎金歸零</span></>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 內容區（不捲動） */}
      <div className="flex-1 overflow-hidden px-4 pt-2 pb-1 flex flex-col gap-2">
        <div className="text-white/50 text-sm text-center">Day {current.day} — 每日獎金</div>

        {/* 當前獎金 */}
        <div className="bg-[#0f2d25] border border-yellow-400/30 rounded-xl p-2.5 text-center">
          <div className="text-white/40 text-xs mb-0.5">當前獎金</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={bonus}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`text-4xl font-bold ${bonus === 0 ? 'text-red-400' : 'text-yellow-400'}`}
            >
              ${bonus.toLocaleString()}
            </motion.div>
          </AnimatePresence>
          {enhanceLv > 0 && (
            <div className="text-white/30 text-xs mt-0.5">
              原始 ${bonusBase} → 已強化至 {ENHANCE_TABLE[enhanceLv - 1].label}
            </div>
          )}
        </div>

        {/* 強化結果提示（短暫顯示，不阻擋按鈕） */}
        {/* 強化獎金階梯 */}
        <div className="bg-[#0f2d25] border border-white/10 rounded-xl overflow-hidden">
          <div className="text-xs text-white/40 px-3 py-1 bg-white/5 border-b border-white/10 shrink-0">
            強化獎金階梯
          </div>
          <div className="divide-y divide-white/5 overflow-hidden">
            {ladder.map((row) => {
              const completed = row.index < enhanceLv
              const isCurrent = row.index === enhanceLv
              return (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-3 py-1 transition-all
                    ${completed ? 'opacity-25' : ''}
                    ${isCurrent ? 'bg-yellow-500/10' : ''}
                  `}
                >
                  <span className={`text-sm font-bold ${
                    isCurrent ? 'text-yellow-300' : completed ? 'text-white/40' : 'text-white/70'
                  }`}>
                    {row.label}
                    {isCurrent && <span className="ml-1.5 text-xs font-normal text-yellow-400/60">← 下一階</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {enhanceLv >= ENHANCE_TABLE.length && (
          <div className="text-yellow-400 text-sm font-bold text-center">🏆 已達最高強化等級 +10</div>
        )}

        {/* 按鈕列：緊接階梯下方，與內容區同 gap-2 */}
        {showEnhance ? (
          <div className="flex flex-col gap-2">
            <motion.button
              whileTap={canAfford ? { scale: 0.95 } : {}}
              onClick={handleEnhance}
              disabled={!canAfford}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                !canAfford
                  ? 'bg-white/10 text-white/30'
                  : 'bg-purple-600 text-white active:bg-purple-700'
              }`}
            >
              {canAfford
                ? `💎 強化 ${nextEntry!.label}（$${nextEntry!.cost}）`
                : `餘額不足 $${nextEntry!.cost}`}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={advancePhase}
              className="w-full py-3 rounded-xl font-bold text-sm bg-yellow-400 text-black"
            >
              收下 ${bonus.toLocaleString()}
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={advancePhase}
            className={`w-full py-3 rounded-xl font-bold text-sm ${
              bonus > 0 ? 'bg-yellow-400 text-black' : 'bg-slate-600 text-white'
            }`}
          >
            {bonus > 0 ? `收下 $${bonus.toLocaleString()} →` : '空手而歸 →'}
          </motion.button>
        )}
      </div>
    </div>
  )
}
