// ── 遠端可維護設定 ────────────────────────────────────────
// 所有遊戲數值集中於此。
// 啟動時從 /game-config.json 拉取，失敗時使用以下預設值。
// 更新數值只需修改 public/game-config.json，不需重新部署程式碼。

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

export interface GameConfig {
  drinks: Drink[]
  exercises: ExerciseConfig[]
  enhanceTable: EnhanceEntry[]
  initialMoney: Record<string, number>
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

  initialMoney: { easy: 5000, normal: 3000, hard: 800 },

  bonusBaseRange: { min: 20, max: 500 },

  dailyCalorieTargets: [300, 350, 400, 450, 500, 550, 600, 650, 700],

  scoring: {
    easy:   { S: 22000, A: 15000, B:  3000 },
    normal: { S: 18000, A: 10000, B:   800 },
    hard:   { S: 18000, A: 10000, B:   500 },
  },
}

/** 從 /game-config.json 載入遠端設定，原地覆寫 config 物件。失敗則靜默使用預設值。 */
export async function loadRemoteConfig(): Promise<void> {
  try {
    const res = await fetch('/game-config.json')
    if (!res.ok) return
    const remote: Partial<GameConfig> = await res.json()
    if (remote.drinks)              config.drinks.splice(0, Infinity, ...remote.drinks)
    if (remote.exercises)           config.exercises.splice(0, Infinity, ...remote.exercises)
    if (remote.enhanceTable)        config.enhanceTable.splice(0, Infinity, ...remote.enhanceTable)
    if (remote.dailyCalorieTargets) config.dailyCalorieTargets.splice(0, Infinity, ...remote.dailyCalorieTargets)
    if (remote.initialMoney)        Object.assign(config.initialMoney, remote.initialMoney)
    if (remote.bonusBaseRange)      Object.assign(config.bonusBaseRange, remote.bonusBaseRange)
    if (remote.scoring)             Object.assign(config.scoring, remote.scoring)
  } catch {
    // 網路失敗，繼續用預設值
  }
}
