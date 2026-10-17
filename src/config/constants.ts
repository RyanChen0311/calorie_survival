// ── 遊戲固定常數 ──────────────────────────────────────────
// 不開放遠端調整的規則數值集中於此，避免 magic number 散落各檔。

export const TOTAL_DAYS          = 7
export const START_WEIGHT_KG     = 60
export const MIN_WEIGHT_KG       = 40
export const KCAL_PER_KG         = 500   // 每累積 ±500 kcal → 體重 ±1 kg
export const BASE_DAILY_STAMINA  = 100
export const ALLOCATION_STEP     = 10    // +/- 按鈕步進
export const EXERCISES_PER_DAY   = 3

/** 補水用的基底飲料（湊熱量用），必須存在於 drinks 設定中 */
export const FILLER_DRINK_ID = 'unsweetened_green'
