import { KCAL_PER_KG, MIN_WEIGHT_KG } from '../config/constants'

/** 四捨五入到 0.1 kg，同時消除浮點誤差（例：60.6 + 0.9 = 61.49999… → 61.5） */
export function roundWeight(kg: number): number {
  return Math.round(kg * 10) / 10
}

/**
 * 每日體重更新：明日體重 = 今日體重 + 當日熱量淨值 ÷ 500，取到 0.1 kg。
 *   淨值 = 飲料攝取 − 運動消耗
 *   60.0 kg，淨值 +300 → 60.6 kg
 *   60.6 kg，淨值 -200 → 60.2 kg
 * 每天只計算當天的淨值，不會重複計算前幾天的熱量。
 * store 結算與 SettlementPhase 預覽共用此函式，確保兩邊數字一致。
 */
export function nextDayWeight(currentWeight: number, netKcalToday: number): number {
  return Math.max(MIN_WEIGHT_KG, roundWeight(currentWeight + netKcalToday / KCAL_PER_KG))
}
