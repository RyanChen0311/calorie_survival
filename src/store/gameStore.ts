import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  pickThreeExercises, calcExerciseCalories, getRequiredEquipment,
  type ExerciseTriple, type ExerciseType,
} from '../data/exercises'
import {
  solveDrinkCombo, generateDrinkConstraints, generateDailyCalories, reconcileConstraints,
  type DrinkCombo, type DrinkConstraints,
} from '../utils/algorithm'
import { nextDayWeight } from '../utils/body'
import { randomInt } from '../utils/random'
import { logger, errorMessage } from '../utils/logger'
import { validateSave } from './saveValidation'
import { getEnhanceRate, isLuckyGameNumber } from '../utils/enhance'
import { config } from '../config'
import {
  BASE_DAILY_STAMINA, START_WEIGHT_KG, TOTAL_DAYS,
} from '../config/constants'

export type Difficulty = 'easy' | 'normal' | 'hard'
export type Phase = 'bonus' | 'drink' | 'exercise' | 'settlement'
export type Screen = 'home' | 'game' | 'gameover' | 'result'
export type AllocationIndex = 0 | 1 | 2

export const SAVE_KEY = 'calorie-survival-save'

// 指向 config 陣列本身，遠端設定載入後自動反映
export const ENHANCE_TABLE = config.enhanceTable

export interface DayRecord {
  day: number
  money: number
  excessCalories: number
  weight: number
  burnedToday: number
  gainedCalories: number
  note: string
}

export type Allocations = [number, number, number]

export interface DayState {
  day: number
  money: number
  excessCalories: number
  weight: number
  phase: Phase

  // 每日獎金 & 強化
  bonusBase: number
  bonus: number
  enhanceLv: number        // 0=未強化，n=已強化 n 次（上限 ENHANCE_TABLE.length）

  // 強制消費
  targetCalories: number
  drinkCombo: DrinkCombo | null
  drinkConstraints: DrinkConstraints | null

  // 運動
  dailyStamina: number       // 今日可用體力上限（基礎100，可花錢補充）
  offeredExercises: ExerciseTriple
  allocations: Allocations
  burnedToday: number
  ownedEquipment: string[]   // 今日已購裝備（設計：每日重置，需重新購買）
}

export interface EnhanceResult { success: boolean; newBonus: number }

/** 會寫入 localStorage 的欄位 */
interface PersistedState {
  screen: Screen
  difficulty: Difficulty | null
  dayRecords: DayRecord[]
  current: DayState | null
  exerciseCounts: Record<string, number>  // 各運動累計次數（跨日）
  gamesStarted: number                    // 累計開局數（重來不歸零，用來判斷幸運局）
  luckyGame: boolean                      // 本局是否為幸運局（強化成功率加成）
}

interface GameState extends PersistedState {
  /** 無法繼續遊戲的錯誤（例如設定資料毀損）；不寫入存檔 */
  fatalError: string | null

  startGame:        (difficulty: Difficulty) => void
  advancePhase:     () => void
  enhanceBonus:     () => EnhanceResult
  skipExercise:     () => void
  setAllocation:    (index: AllocationIndex, value: number) => void
  buyEquipment:     (itemId: string, cost: number) => void
  replenishStamina: (stamina: number, cost: number) => void
  restartGame:      () => void
}

const INITIAL_STATE: PersistedState & Pick<GameState, 'fatalError'> = {
  screen: 'home',
  difficulty: null,
  dayRecords: [],
  current: null,
  exerciseCounts: {},
  gamesStarted: 0,
  luckyGame: false,
  fatalError: null,
}

// ── 純函式：不碰 store，方便單獨測試與除錯 ─────────────────

/** 產生新的一天。資料毀損時會 throw，由呼叫端轉成 fatalError */
function initDay(day: number, money: number, prevExcess: number, prevWeight: number): DayState {
  const { min, max } = config.bonusBaseRange
  const bonusBase    = randomInt(min, max)
  const target       = generateDailyCalories()
  const rawConstraints = generateDrinkConstraints(target)
  const drinkCombo   = solveDrinkCombo(target, rawConstraints.minCups, rawConstraints.minPrice)
  const constraints  = reconcileConstraints(rawConstraints, drinkCombo)
  const exercises    = pickThreeExercises()

  logger.debug('store', `initDay day=${day} target=${target}kcal drinkPrice=${drinkCombo.totalPrice}`)

  return {
    day, money, excessCalories: prevExcess, weight: prevWeight,
    phase: 'bonus',
    bonusBase, bonus: bonusBase, enhanceLv: 0,
    targetCalories: target, drinkCombo, drinkConstraints: constraints,
    dailyStamina: BASE_DAILY_STAMINA,
    offeredExercises: exercises,
    allocations: [0, 0, 0],
    burnedToday: 0,
    ownedEquipment: [],
  }
}

function calcBurned(exercises: ExerciseTriple, allocs: Allocations): number {
  let sum = 0
  for (let i = 0; i < exercises.length; i++) sum += calcExerciseCalories(exercises[i], allocs[i])
  return sum
}

/** bonus → drink：收下獎金 + 該難度每日補貼（config.dailyAllowance） */
function resolveBonusPhase(cur: DayState, difficulty: Difficulty | null): DayState {
  const allowance = difficulty ? (config.dailyAllowance[difficulty] ?? 0) : 0
  return { ...cur, money: cur.money + cur.bonus + allowance, phase: 'drink' }
}

/** 該運動目前階段所需裝備是否已全部購買 */
function isEquipped(cur: DayState, ex: ExerciseType, counts: Record<string, number>): boolean {
  const owned = new Set(cur.ownedEquipment)
  return getRequiredEquipment(ex, counts[ex.id] ?? 0).every(item => owned.has(item.id))
}

/**
 * exercise → settlement：扣除燃燒熱量，累計有投入體力的運動次數。
 * skip = true 時視為完全沒運動：分配歸零、不燃燒、不累計次數。
 */
function resolveExercisePhase(cur: DayState, counts: Record<string, number>, skip: boolean) {
  const base: DayState = skip
    ? { ...cur, allocations: [0, 0, 0], burnedToday: 0 }
    : cur

  const newCounts = { ...counts }
  base.offeredExercises.forEach((ex, i) => {
    if (base.allocations[i] > 0) newCounts[ex.id] = (newCounts[ex.id] ?? 0) + 1
  })
  const next: DayState = {
    ...base,
    excessCalories: base.excessCalories - base.burnedToday,
    phase: 'settlement',
  }
  return { next, newCounts }
}

/**
 * settlement：依「當日淨值 = 飲料 − 運動」更新體重並產生當日紀錄。
 * excessCalories 為遊戲開始至今的總累積（僅供顯示），不參與體重計算。
 */
function buildDayRecord(cur: DayState): DayRecord {
  const newWeight = nextDayWeight(cur.weight, cur.targetCalories - cur.burnedToday)

  const exerciseNote = cur.offeredExercises
    .map((ex, i) => cur.allocations[i] > 0 ? `${ex.name}×${cur.allocations[i]}pts` : null)
    .filter(Boolean).join('+') || '未運動'

  return {
    day: cur.day, money: cur.money, excessCalories: cur.excessCalories,
    weight: newWeight, burnedToday: cur.burnedToday,
    gainedCalories: cur.targetCalories, note: exerciseNote,
  }
}

// ── Store ─────────────────────────────────────────────────

export const useGameStore = create<GameState>()(persist((set, get) => {
  /** 記錄致命錯誤並讓 App 顯示錯誤畫面 */
  const fail = (where: string, err: unknown) => {
    logger.error('store', `${where} 失敗`, err)
    set({ fatalError: `${where}：${errorMessage(err)}` })
  }

  /** initDay 的安全包裝：失敗回傳 null */
  const safeInitDay = (...args: Parameters<typeof initDay>): DayState | null => {
    try {
      return initDay(...args)
    } catch (err) {
      fail(`建立 Day ${args[0]}`, err)
      return null
    }
  }

  return {
    ...INITIAL_STATE,

    startGame: (difficulty) => {
      const money = config.initialMoney[difficulty]
      if (money === undefined) { fail('開始遊戲', `找不到難度 ${difficulty} 的初始金額`); return }

      const firstDay = safeInitDay(1, money, 0, START_WEIGHT_KG)
      if (!firstDay) return

      const gamesStarted = get().gamesStarted + 1
      const luckyGame    = isLuckyGameNumber(gamesStarted)

      logger.debug('store', `startGame #${gamesStarted} difficulty=${difficulty} money=${money} lucky=${luckyGame}`)
      set({
        gamesStarted,
        luckyGame,
        screen: 'game',
        difficulty,
        dayRecords: [{
          day: 0, money, excessCalories: 0, weight: START_WEIGHT_KG,
          burnedToday: 0, gainedCalories: 0, note: '遊戲初始狀態',
        }],
        current: firstDay,
        exerciseCounts: {},
        fatalError: null,
      })
    },

    /** 嘗試強化：扣款 → 擲骰 → 更新 bonus；回傳動畫用資訊 */
    enhanceBonus: () => {
      const cur = get().current
      if (!cur || cur.phase !== 'bonus') return { success: false, newBonus: 0 }

      const entry = ENHANCE_TABLE[cur.enhanceLv]
      if (!entry || cur.money < entry.cost) return { success: false, newBonus: cur.bonus }

      const rate     = getEnhanceRate(entry, get().luckyGame)
      const success  = Math.random() < rate
      const newBonus = success ? Math.round(cur.bonus * entry.multi) : 0
      logger.debug('store', `enhance ${entry.label} rate=${rate} success=${success} bonus ${cur.bonus}→${newBonus}`)

      set({
        current: { ...cur, money: cur.money - entry.cost, bonus: newBonus, enhanceLv: cur.enhanceLv + 1 },
      })
      return { success, newBonus }
    },

    advancePhase: () => {
      const cur = get().current
      if (!cur) { logger.warn('store', 'advancePhase：current 為 null，忽略'); return }
      logger.debug('store', `advancePhase day=${cur.day} phase=${cur.phase}`)

      switch (cur.phase) {
        case 'bonus':
          set({ current: resolveBonusPhase(cur, get().difficulty) })
          return

        case 'drink': {
          if (!cur.drinkCombo) { fail('強制消費', '今日飲料組合遺失'); return }
          const newMoney = cur.money - cur.drinkCombo.totalPrice
          if (newMoney < 0) { set({ screen: 'gameover' }); return }
          set({
            current: {
              ...cur,
              money:          newMoney,
              excessCalories: cur.excessCalories + cur.targetCalories,
              phase:          'exercise',
            },
          })
          return
        }

        case 'exercise': {
          const { next, newCounts } = resolveExercisePhase(cur, get().exerciseCounts, false)
          set({ exerciseCounts: newCounts, current: next })
          return
        }

        case 'settlement': {
          const record     = buildDayRecord(cur)
          const dayRecords = [...get().dayRecords, record]

          if (cur.day >= TOTAL_DAYS) {
            set({ screen: 'result', dayRecords, current: null })
            return
          }
          const nextDay = safeInitDay(cur.day + 1, record.money, record.excessCalories, record.weight)
          if (!nextDay) return
          set({ dayRecords, current: nextDay })
          return
        }

        default: {
          // 存檔毀損才可能走到這裡
          const unknownPhase: never = cur.phase
          fail('advancePhase', `未知的 phase: ${String(unknownPhase)}`)
        }
      }
    },

    skipExercise: () => {
      const cur = get().current
      if (!cur || cur.phase !== 'exercise') return
      logger.debug('store', `skipExercise day=${cur.day}`)
      const { next, newCounts } = resolveExercisePhase(cur, get().exerciseCounts, true)
      set({ exerciseCounts: newCounts, current: next })
    },

    setAllocation: (index, value) => {
      const cur = get().current
      if (!cur || cur.phase !== 'exercise') return
      if (!Number.isFinite(value)) { logger.warn('store', `setAllocation 收到非數值 ${value}`); return }

      const ex = cur.offeredExercises[index]
      if (!ex) { logger.warn('store', `setAllocation index 超出範圍: ${index}`); return }
      // 規則：裝備不齊不能分配體力（UI 也會 disable，這裡是最後防線）
      if (value > 0 && !isEquipped(cur, ex, get().exerciseCounts)) {
        logger.warn('store', `setAllocation：${ex.name} 裝備未齊，拒絕分配`)
        return
      }

      const allocs: Allocations = [...cur.allocations]
      const others = allocs.reduce((s, v, i) => i === index ? s : s + v, 0)
      allocs[index] = Math.max(0, Math.min(value, cur.dailyStamina - others))

      set({ current: { ...cur, allocations: allocs, burnedToday: calcBurned(cur.offeredExercises, allocs) } })
    },

    replenishStamina: (stamina, cost) => {
      const cur = get().current
      if (!cur || cur.phase !== 'exercise') return
      if (stamina <= 0 || cost < 0 || cur.money < cost) return
      set({ current: { ...cur, money: cur.money - cost, dailyStamina: cur.dailyStamina + stamina } })
    },

    buyEquipment: (itemId, cost) => {
      const cur = get().current
      if (!cur || cur.phase !== 'exercise') return
      if (cost < 0 || cur.money < cost) return
      // 防止快速連點重複扣款
      if (cur.ownedEquipment.includes(itemId)) {
        logger.warn('store', `buyEquipment：${itemId} 已購買，忽略重複請求`)
        return
      }
      set({
        current: { ...cur, money: cur.money - cost, ownedEquipment: [...cur.ownedEquipment, itemId] },
      })
    },

    // 累計開局數不歸零，幸運局才能跨局計算
    restartGame: () => set({ ...INITIAL_STATE, gamesStarted: get().gamesStarted }),
  }
}, {
  name: SAVE_KEY,
  partialize: (s): PersistedState => ({
    screen:         s.screen,
    difficulty:     s.difficulty,
    dayRecords:     s.dayRecords,
    current:        s.current,
    exerciseCounts: s.exerciseCounts,
    gamesStarted:   s.gamesStarted,
    luckyGame:      s.luckyGame,
  }),
  // 讀檔時驗證結構，不合格就丟棄，避免渲染時出現 undefined 錯誤
  merge: (persisted, currentState) => {
    if (persisted === undefined || persisted === null) return currentState
    const reason = validateSave(persisted)
    if (reason) {
      logger.warn('store', `存檔無效已重置：${reason}`, persisted)
      return currentState
    }
    return { ...currentState, ...(persisted as PersistedState) }
  },
  onRehydrateStorage: () => (_state, err) => {
    if (err) logger.error('store', '讀取存檔失敗', err)
  },
}))
