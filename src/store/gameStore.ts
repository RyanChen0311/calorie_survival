import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pickThreeExercises, calcExerciseCalories, type ExerciseType } from '../data/exercises'
import {
  solveDrinkCombo, generateDrinkConstraints, generateDailyCalories, type DrinkCombo,
} from '../utils/algorithm'
import { config } from '../config'

export type Difficulty = 'easy' | 'normal' | 'hard'
export type Phase = 'bonus' | 'drink' | 'exercise' | 'settlement'
export type Screen = 'home' | 'game' | 'gameover' | 'result'

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
  enhanceLv: number        // 0=未強化, 1–5=已強化幾次

  // 強制消費
  targetCalories: number
  drinkCombo: DrinkCombo | null
  drinkConstraints: { minCups: number; minPrice: number } | null

  // 運動
  dailyStamina: number       // 今日可用體力上限（基礎100，可花錢補充）
  offeredExercises: [ExerciseType, ExerciseType, ExerciseType]
  allocations: Allocations
  burnedToday: number
  ownedEquipment: string[]   // 今日已購裝備（每日重置）
}

interface GameState {
  screen: Screen
  difficulty: Difficulty | null
  dayRecords: DayRecord[]
  current: DayState | null

  // 裝備系統
  exerciseCounts:  Record<string, number>  // 各運動累計次數（跨日）

  startGame:     (difficulty: Difficulty) => void
  advancePhase:  () => void
  enhanceBonus:  () => { success: boolean; newBonus: number }
  setAllocation: (index: 0 | 1 | 2, value: number) => void
  buyEquipment:     (itemId: string, cost: number) => void
  replenishStamina: (stamina: number, cost: number) => void
  restartGame:      () => void
}

function rInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function initDay(day: number, money: number, prevExcess: number, prevWeight: number): DayState {
  const { min, max } = config.bonusBaseRange
  const bonusBase    = rInt(min, max)
  const target       = generateDailyCalories()
  const constraints  = generateDrinkConstraints(target)
  const drinkCombo   = solveDrinkCombo(target, constraints.minCups, constraints.minPrice)
  const exercises    = pickThreeExercises()

  return {
    day, money, excessCalories: prevExcess, weight: prevWeight,
    phase: 'bonus',
    bonusBase, bonus: bonusBase, enhanceLv: 0,
    targetCalories: target, drinkCombo, drinkConstraints: constraints,
    dailyStamina: 100,
    offeredExercises: exercises,
    allocations: [0, 0, 0],
    burnedToday: 0,
    ownedEquipment: [],
  }
}

export const useGameStore = create<GameState>()(persist((set, get) => ({
  screen: 'home',
  difficulty: null,
  dayRecords: [],
  current: null,
  exerciseCounts: {},

  startGame: (difficulty) => {
    const money = config.initialMoney[difficulty]
    set({
      screen: 'game',
      difficulty,
      dayRecords: [{ day: 0, money, excessCalories: 0, weight: 60.0, burnedToday: 0, gainedCalories: 0, note: '遊戲初始狀態' }],
      current: initDay(1, money, 0, 60.0),
    })
  },

  /** 嘗試強化：扣款 → 擲骰 → 更新 bonus；回傳動畫用資訊 */
  enhanceBonus: () => {
    const cur = get().current
    if (!cur || cur.phase !== 'bonus') return { success: false, newBonus: 0 }
    const lv = cur.enhanceLv
    if (lv >= ENHANCE_TABLE.length) return { success: false, newBonus: cur.bonus }
    const { cost, rate, multi } = ENHANCE_TABLE[lv]
    if (cur.money < cost) return { success: false, newBonus: cur.bonus }

    const success  = Math.random() < rate
    const newBonus = success ? Math.round(cur.bonus * multi) : 0
    set({
      current: {
        ...cur,
        money:    cur.money - cost,
        bonus:    newBonus,
        enhanceLv: lv + 1,
      },
    })
    return { success, newBonus }
  },

  advancePhase: () => {
    const cur = get().current
    if (!cur) return

    switch (cur.phase) {
      case 'bonus': {
        // 收下獎金 → 前往強制消費（NORMAL 每日額外補貼 $10）
        const dailyAllowance = get().difficulty === 'normal' ? 10 : 0
        const newMoney = cur.money + cur.bonus + dailyAllowance
        set({ current: { ...cur, money: newMoney, phase: 'drink' } })
        break
      }

      case 'drink': {
        if (!cur.drinkCombo) return
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
        break
      }

      case 'exercise': {
        // 更新各運動累計次數（只計有投入體力的項目）
        const newCounts = { ...get().exerciseCounts }
        cur.offeredExercises.forEach((ex, i) => {
          if (cur.allocations[i] > 0) {
            newCounts[ex.id] = (newCounts[ex.id] ?? 0) + 1
          }
        })
        set({
          exerciseCounts: newCounts,
          current: { ...cur, excessCalories: cur.excessCalories - cur.burnedToday, phase: 'settlement' },
        })
        break
      }

      case 'settlement': {
        const c  = get().current!
        const excess = c.excessCalories
        const weightDelta = excess >= 0 ? Math.floor(excess / 500) : -Math.floor(-excess / 500)
        const newWeight   = Math.max(40, c.weight + weightDelta)

        const exerciseNote = c.offeredExercises
          .map((ex, i) => c.allocations[i] > 0 ? `${ex.name}×${c.allocations[i]}pts` : null)
          .filter(Boolean).join('+') || '未運動'

        const record: DayRecord = {
          day: c.day, money: c.money, excessCalories: excess,
          weight: newWeight, burnedToday: c.burnedToday,
          gainedCalories: c.targetCalories, note: exerciseNote,
        }
        const newRecords = [...get().dayRecords, record]

        if (c.day >= 7) { set({ screen: 'result', dayRecords: newRecords, current: null }); return }
        set({ dayRecords: newRecords, current: initDay(c.day + 1, c.money, excess, newWeight) })
        break
      }
    }
  },

  setAllocation: (index, value) => {
    const cur = get().current
    if (!cur || cur.phase !== 'exercise') return
    const allocs: Allocations = [...cur.allocations] as Allocations
    const others = allocs.reduce((s, v, i) => i === index ? s : s + v, 0)
    allocs[index] = Math.max(0, Math.min(value, cur.dailyStamina - others))
    const burned  = cur.offeredExercises.reduce((sum, ex, i) => sum + calcExerciseCalories(ex, allocs[i]), 0)
    set({ current: { ...cur, allocations: allocs, burnedToday: burned } })
  },

  replenishStamina: (stamina, cost) => {
    const cur = get().current
    if (!cur || cur.money < cost) return
    set({ current: { ...cur, money: cur.money - cost, dailyStamina: cur.dailyStamina + stamina } })
  },

  buyEquipment: (itemId, cost) => {
    const cur = get().current
    if (!cur || cur.money < cost) return
    set({
      current: {
        ...cur,
        money: cur.money - cost,
        ownedEquipment: [...cur.ownedEquipment, itemId],
      },
    })
  },

  restartGame: () => set({
    screen: 'home', difficulty: null, dayRecords: [], current: null,
    exerciseCounts: {},
  }),
}), {
  name: 'calorie-survival-save',
  partialize: (s) => ({
    screen:         s.screen,
    difficulty:     s.difficulty,
    dayRecords:     s.dayRecords,
    current:        s.current,
    exerciseCounts: s.exerciseCounts,
  }),
}))
