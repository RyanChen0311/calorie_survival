// ── 遠端可維護設定 ────────────────────────────────────────
// 所有遊戲數值集中於此。
// 啟動時從 /game-config.json 拉取，失敗時使用以下預設值。
// 更新數值只需修改 public/game-config.json，不需重新部署程式碼。
// 載入完成前首頁的開局按鈕會停用（見 store/configStore.ts）。

import { logger } from '../utils/logger'
import { useConfigStore } from '../store/configStore'
import { EXERCISES_PER_DAY, FILLER_DRINK_ID } from './constants'

export interface Drink {
  id: string
  name: string
  price: number
  calories: number
  emoji: string
}

export interface EquipmentItem { id: string; name: string; emoji: string; cost: number }
export interface EquipmentTier { requiredCount: number; items: EquipmentItem[] }
export interface ExerciseConfig {
  id: string; name: string; emoji: string; k: number; b: number
  hint: string; equipmentTiers: EquipmentTier[]
}

export interface EnhanceEntry {
  cost: number
  rate: number
  multi: number
  label: string
}

export interface ScoringThreshold {
  S: number
  A: number
  B: number
}

/** 幸運局：累計第 every、2×every… 局，該局每次強化成功率 + rateBonus（上限 100%） */
export interface LuckyGameConfig {
  every: number
  rateBonus: number
}

export interface GameConfig {
  drinks: Drink[]
  exercises: ExerciseConfig[]
  enhanceTable: EnhanceEntry[]
  luckyGame: LuckyGameConfig
  initialMoney: Record<string, number>
  dailyAllowance: Record<string, number>   // 各難度每日收下獎金時的額外補貼
  bonusBaseRange: { min: number; max: number }
  dailyCalorieTargets: number[]
  scoring: Record<string, ScoringThreshold>
}

export const config: GameConfig = {
  exercises: [], // 由 exercises.ts 啟動時填入，或由遠端覆寫

  drinks: [
    { id: 'unsweetened_green', name: '無糖綠茶',    price: 25, calories:  50, emoji: '🍵' },
    { id: 'light_tea',         name: '青茶（微糖）', price: 30, calories: 100, emoji: '🍵' },
    { id: 'winter_melon',      name: '冬瓜茶',       price: 30, calories: 150, emoji: '🥤' },
    { id: 'coconut_jelly',     name: '椰果多多',     price: 45, calories: 200, emoji: '🥤' },
    { id: 'full_sugar_tea',    name: '全糖紅茶',     price: 35, calories: 250, emoji: '🍹' },
    { id: 'fresh_milk_tea',    name: '鮮奶茶',       price: 55, calories: 300, emoji: '🥛' },
    { id: 'grass_jelly',       name: '仙草奶茶',     price: 60, calories: 350, emoji: '🍶' },
    { id: 'latte_tea',         name: '紅茶拿鐵',     price: 65, calories: 400, emoji: '☕' },
    { id: 'bubble_milk_tea',   name: '珍珠奶茶',     price: 75, calories: 500, emoji: '🍹' },
    { id: 'brown_sugar_boba',  name: '黑糖珍奶',     price: 85, calories: 650, emoji: '☕' },
  ],

  enhanceTable: [
    { cost:  10, rate: 1.00, multi:  2.0, label: '+1'  },
    { cost:  25, rate: 0.85, multi:  1.5, label: '+2'  },
    { cost:  45, rate: 0.70, multi:  1.5, label: '+3'  },
    { cost:  75, rate: 0.55, multi:  2.0, label: '+4'  },
    { cost: 110, rate: 0.40, multi:  2.6, label: '+5'  },
    { cost: 160, rate: 0.28, multi:  3.0, label: '+6'  },
    { cost: 230, rate: 0.18, multi:  4.0, label: '+7'  },
    { cost: 330, rate: 0.12, multi:  5.0, label: '+8'  },
    { cost: 480, rate: 0.08, multi:  8.0, label: '+9'  },
    { cost: 700, rate: 0.04, multi: 12.0, label: '+10' },
  ],

  luckyGame: { every: 3, rateBonus: 0.15 },

  initialMoney: { easy: 5000, normal: 3000, hard: 800 },

  dailyAllowance: { easy: 0, normal: 10, hard: 0 },

  bonusBaseRange: { min: 20, max: 500 },

  dailyCalorieTargets: [300, 350, 400, 450, 500, 550, 600, 650, 700],

  scoring: {
    easy:   { S: 22000, A: 15000, B:  3000 },
    normal: { S: 18000, A: 10000, B:   800 },
    hard:   { S: 18000, A: 10000, B:   500 },
  },
}

// ── 遠端設定驗證 ──────────────────────────────────────────
// 遠端 JSON 不可信任：欄位缺漏或型別錯誤會在遊戲中途造成 undefined 錯誤。
// 每個欄位獨立驗證，錯誤的欄位沿用預設值並印出警告，其他欄位照常套用。

type Validator<T> = (v: unknown) => v is T

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum    = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isPosNum = (v: unknown): v is number => isNum(v) && v > 0
const isStr    = (v: unknown): v is string => typeof v === 'string' && v.length > 0

const isDrink: Validator<Drink> = (v): v is Drink =>
  isObject(v) && isStr(v.id) && isStr(v.name) && isPosNum(v.price) && isPosNum(v.calories)
  && typeof v.emoji === 'string'

const isEquipmentItem: Validator<EquipmentItem> = (v): v is EquipmentItem =>
  isObject(v) && isStr(v.id) && isStr(v.name) && isNum(v.cost) && v.cost >= 0

const isEquipmentTier: Validator<EquipmentTier> = (v): v is EquipmentTier =>
  isObject(v) && isNum(v.requiredCount) && Array.isArray(v.items) && v.items.every(isEquipmentItem)

const isExercise: Validator<ExerciseConfig> = (v): v is ExerciseConfig =>
  isObject(v) && isStr(v.id) && isStr(v.name) && isNum(v.k) && isNum(v.b)
  && Array.isArray(v.equipmentTiers) && v.equipmentTiers.every(isEquipmentTier)

const isEnhanceEntry: Validator<EnhanceEntry> = (v): v is EnhanceEntry =>
  isObject(v) && isNum(v.cost) && isNum(v.rate) && v.rate >= 0 && v.rate <= 1
  && isPosNum(v.multi) && isStr(v.label)

const isThreshold: Validator<ScoringThreshold> = (v): v is ScoringThreshold =>
  isObject(v) && isNum(v.S) && isNum(v.A) && isNum(v.B)

/** 整個陣列都合法且長度 >= minLength 才覆寫，否則保留預設值 */
function replaceArray<T>(
  field: string, target: T[], source: unknown, isValid: Validator<T>, minLength = 1,
): void {
  if (source === undefined) return
  if (!Array.isArray(source) || source.length < minLength || !source.every(isValid)) {
    logger.warn('config', `遠端欄位 "${field}" 格式錯誤，沿用預設值`, source)
    return
  }
  target.splice(0, target.length, ...source)
}

/** 物件逐 key 合併，只採用合法的值 */
function mergeRecord<T>(
  field: string, target: Record<string, T>, source: unknown, isValid: Validator<T>,
): void {
  if (source === undefined) return
  if (!isObject(source)) {
    logger.warn('config', `遠端欄位 "${field}" 不是物件，沿用預設值`, source)
    return
  }
  for (const [key, value] of Object.entries(source)) {
    if (isValid(value)) target[key] = value
    else logger.warn('config', `遠端欄位 "${field}.${key}" 格式錯誤，略過`, value)
  }
}

function applyRemoteConfig(remote: Record<string, unknown>): void {
  // drinks 必須包含湊熱量用的基底飲料，否則演算法無法運作
  const drinks = remote.drinks
  if (Array.isArray(drinks) && !drinks.some(d => isObject(d) && d.id === FILLER_DRINK_ID)) {
    logger.warn('config', `遠端 drinks 缺少 "${FILLER_DRINK_ID}"，沿用預設值`)
  } else {
    replaceArray('drinks', config.drinks, drinks, isDrink)
  }

  replaceArray('exercises',           config.exercises,           remote.exercises,           isExercise, EXERCISES_PER_DAY)
  replaceArray('enhanceTable',        config.enhanceTable,        remote.enhanceTable,        isEnhanceEntry)
  replaceArray('dailyCalorieTargets', config.dailyCalorieTargets, remote.dailyCalorieTargets, isPosNum)
  mergeRecord('initialMoney',   config.initialMoney,   remote.initialMoney,   isNum)
  mergeRecord('dailyAllowance', config.dailyAllowance, remote.dailyAllowance, isNum)
  mergeRecord('scoring',      config.scoring,      remote.scoring,      isThreshold)

  const lucky = remote.luckyGame
  if (lucky !== undefined) {
    if (isObject(lucky) && Number.isInteger(lucky.every) && isPosNum(lucky.every)
        && isNum(lucky.rateBonus) && lucky.rateBonus >= 0 && lucky.rateBonus <= 1) {
      config.luckyGame.every     = lucky.every
      config.luckyGame.rateBonus = lucky.rateBonus
    } else {
      logger.warn('config', '遠端欄位 "luckyGame" 格式錯誤，沿用預設值', lucky)
    }
  }

  const range = remote.bonusBaseRange
  if (range !== undefined) {
    if (isObject(range) && isNum(range.min) && isNum(range.max) && range.min <= range.max) {
      config.bonusBaseRange.min = range.min
      config.bonusBaseRange.max = range.max
    } else {
      logger.warn('config', '遠端欄位 "bonusBaseRange" 格式錯誤，沿用預設值', range)
    }
  }
}

const FETCH_TIMEOUT_MS = 5000

/** 從 /game-config.json 載入遠端設定，原地覆寫 config 物件。失敗則使用預設值。 */
export async function loadRemoteConfig(): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'game-config.json', { signal: controller.signal })
    if (!res.ok) {
      logger.warn('config', `載入遠端設定失敗 HTTP ${res.status}，使用預設值`)
      return
    }
    const remote: unknown = await res.json()
    if (!isObject(remote)) {
      logger.warn('config', '遠端設定不是 JSON 物件，使用預設值')
      return
    }
    applyRemoteConfig(remote)
    logger.debug('config', '遠端設定已套用')
  } catch (err) {
    // 離線 / 逾時 / JSON 解析失敗 → 繼續用預設值
    logger.warn('config', '載入遠端設定失敗，使用預設值', err)
  } finally {
    clearTimeout(timer)
    useConfigStore.getState().markLoaded()
  }
}
