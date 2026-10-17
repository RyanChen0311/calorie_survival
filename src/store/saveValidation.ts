// ── localStorage 存檔驗證 ─────────────────────────────────
// 舊版本存檔或被手動竄改的存檔可能缺欄位，直接套用會在渲染時出現
// `Cannot read properties of undefined`。這裡做結構檢查，不合格就丟棄存檔。

const SCREENS = ['home', 'game', 'gameover', 'result'] as const
const PHASES  = ['bonus', 'drink', 'exercise', 'settlement'] as const
const DIFFICULTIES = ['easy', 'normal', 'hard'] as const

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

function isValidExercise(v: unknown): boolean {
  return isObject(v) && typeof v.id === 'string' && isNum(v.k) && isNum(v.b)
    && Array.isArray(v.equipmentTiers)
}

function isValidDayState(v: unknown): boolean {
  if (!isObject(v)) return false
  return isNum(v.day) && isNum(v.money) && isNum(v.excessCalories) && isNum(v.weight)
    && oneOf(PHASES, v.phase)
    && isNum(v.bonusBase) && isNum(v.bonus) && isNum(v.enhanceLv)
    && isNum(v.targetCalories)
    && (v.drinkCombo === null || (isObject(v.drinkCombo) && Array.isArray(v.drinkCombo.orders)))
    && isNum(v.dailyStamina)
    && Array.isArray(v.offeredExercises) && v.offeredExercises.length === 3
    && v.offeredExercises.every(isValidExercise)
    && Array.isArray(v.allocations) && v.allocations.length === 3 && v.allocations.every(isNum)
    && isNum(v.burnedToday)
    && Array.isArray(v.ownedEquipment)
}

function isValidDayRecord(v: unknown): boolean {
  return isObject(v) && isNum(v.day) && isNum(v.money) && isNum(v.excessCalories)
    && isNum(v.weight) && isNum(v.burnedToday) && isNum(v.gainedCalories)
}

/** 回傳 null 代表存檔合法；否則回傳失敗原因（給 log 用） */
export function validateSave(v: unknown): string | null {
  if (!isObject(v))                                   return '存檔不是物件'
  if (!oneOf(SCREENS, v.screen))                      return `screen 不合法: ${String(v.screen)}`
  if (v.difficulty !== null && !oneOf(DIFFICULTIES, v.difficulty)) return 'difficulty 不合法'
  if (!Array.isArray(v.dayRecords) || !v.dayRecords.every(isValidDayRecord)) return 'dayRecords 不合法'
  if (!isObject(v.exerciseCounts))                    return 'exerciseCounts 不合法'
  // 以下為後來新增的欄位：舊存檔可以沒有（沿用預設值），有的話型別必須正確
  if (v.gamesStarted !== undefined && !isNum(v.gamesStarted)) return 'gamesStarted 不合法'
  if (v.luckyGame !== undefined && typeof v.luckyGame !== 'boolean') return 'luckyGame 不合法'
  if (v.current !== null && !isValidDayState(v.current)) return 'current 結構不合法'
  // 遊戲畫面一定要有當日狀態，否則 GameScreen 會渲染成空白
  if (v.screen === 'game' && v.current === null)      return 'screen=game 但 current 為 null'
  if (v.screen === 'result' && v.dayRecords.length === 0) return 'screen=result 但沒有紀錄'
  return null
}
