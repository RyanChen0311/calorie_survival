import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import StatusBar from '../components/StatusBar'
import DayHistoryPanel from '../components/DayHistoryPanel'
import BonusPhase from '../components/phases/BonusPhase'
import DrinkPhase from '../components/phases/DrinkPhase'
import ExercisePhase from '../components/phases/ExercisePhase'
import SettlementPhase from '../components/phases/SettlementPhase'

const PHASE_LABELS: Record<string, string> = {
  drink:      '🥤 強制消費',
  exercise:   '🏃 今日運動',
  settlement: '⚖️ 日結算',
}

export default function GameScreen() {
  const current = useGameStore(s => s.current)
  if (!current) return null

  const { phase } = current

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 固定頂部：狀態列 */}
      <StatusBar />

      {/* 主框：帶完整矩形邊框 */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 border-x border-b border-white/15">

        {/* Phase 標籤 */}
        <div className="flex items-center justify-center py-1.5 shrink-0">
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="text-xs text-white/50 font-medium"
            >
              {PHASE_LABELS[phase]}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Phase 內容區 */}
        <div className="flex-1 overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.day}-${phase}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full"
            >
              {phase === 'bonus'      && <BonusPhase />}
              {phase === 'drink'      && <DrinkPhase />}
              {phase === 'exercise'   && <ExercisePhase />}
              {phase === 'settlement' && <SettlementPhase />}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* 固定底部：歷史記錄面板 */}
      <div className="shrink-0">
        <DayHistoryPanel />
      </div>
    </div>
  )
}
