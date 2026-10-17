import { DRINKS, type Drink } from '../data/drinks'
import { config } from '../config'
import { FILLER_DRINK_ID } from '../config/constants'
import { partialShuffleInPlace, pickRandom, randomInt } from './random'
import { logger } from './logger'

export interface DrinkOrder {
  drink: Drink
  count: number
}

export interface DrinkCombo {
  orders: DrinkOrder[]
  totalCalories: number
  totalPrice: number
  totalCups: number
}

export interface DrinkConstraints {
  minCups: number
  minPrice: number
}

const MAX_ATTEMPTS     = 120
const MAX_FILLER_CUPS  = 5
const FEATURED_3_PROB  = 0.4   // 40% 機率選 3 種主飲料，否則 2 種

/** 每日強制消費熱量，從 config 讀取選項 */
export function generateDailyCalories(): number {
  const target = pickRandom(config.dailyCalorieTargets)
  if (target === undefined) throw new Error('dailyCalorieTargets 為空，無法產生每日熱量')
  return target
}

/** 飲料購買限制隨熱量目標動態縮放 */
export function generateDrinkConstraints(targetCalories: number): DrinkConstraints {
  const minCups  = targetCalories <= 400 ? 1 : 2
  const baseMin  = Math.round(targetCalories / 10)
  const minPrice = baseMin + Math.floor(Math.random() * 3) * 15
  return { minCups, minPrice: Math.max(25, minPrice) }
}

function sumOrders(orders: DrinkOrder[]) {
  let totalCups = 0
  let totalPrice = 0
  for (const o of orders) {
    totalCups  += o.count
    totalPrice += o.drink.price * o.count
  }
  return { totalCups, totalPrice }
}

/**
 * 隨機建構飲料組合使總熱量精準等於 targetCalories。
 * 時間 O(MAX_ATTEMPTS × k)，k = 主飲料數（2~3）；pool 只建一次並原地洗牌，不重複配置記憶體。
 */
export function solveDrinkCombo(
  targetCalories: number,
  minCups: number,
  minPrice: number,
): DrinkCombo {
  const filler = DRINKS.find(d => d.id === FILLER_DRINK_ID)
  if (!filler) throw new Error(`找不到基底飲料 "${FILLER_DRINK_ID}"，請檢查 drinks 設定`)

  // 主飲料候選池：排除基底飲料、熱量不超過目標
  const pool = DRINKS.filter(d => d.id !== filler.id && d.calories <= targetCalories)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const numFeatured = Math.random() < FEATURED_3_PROB ? 3 : 2
    partialShuffleInPlace(pool, numFeatured)

    const orders: DrinkOrder[] = []
    let remaining = targetCalories

    for (let i = 0; i < Math.min(numFeatured, pool.length); i++) {
      const drink = pool[i]
      if (remaining < drink.calories) continue
      const count = randomInt(1, Math.floor(remaining / drink.calories))
      orders.push({ drink, count })
      remaining -= drink.calories * count
    }

    const fillerCount = remaining / filler.calories
    if (!Number.isInteger(fillerCount) || fillerCount < 0 || fillerCount > MAX_FILLER_CUPS) continue
    if (fillerCount > 0) orders.push({ drink: filler, count: fillerCount })

    const { totalCups, totalPrice } = sumOrders(orders)
    if (totalCups >= minCups && totalPrice >= minPrice) {
      return { orders, totalCalories: targetCalories, totalPrice, totalCups }
    }
  }

  return fallbackCombo(targetCalories, filler, pool)
}

/**
 * 保底：最大可用飲料 + 基底飲料補齊。
 * 結果不保證符合 minCups / minPrice，呼叫端用 reconcileConstraints 對齊顯示。
 */
function fallbackCombo(targetCalories: number, filler: Drink, pool: Drink[]): DrinkCombo {
  let base: Drink | undefined
  for (const d of pool) if (!base || d.calories > base.calories) base = d

  // 防呆：沒有任何主飲料可用（目標熱量過低）→ 全部用基底飲料
  if (!base) {
    const count = targetCalories / filler.calories
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`無法湊出 ${targetCalories} kcal 的飲料組合`)
    }
    return {
      orders: [{ drink: filler, count }],
      totalCalories: targetCalories, totalPrice: filler.price * count, totalCups: count,
    }
  }

  const fc = (targetCalories - base.calories) / filler.calories
  return {
    orders: [
      { drink: base, count: 1 },
      ...(fc > 0 ? [{ drink: filler, count: fc }] : []),
    ],
    totalCalories: targetCalories,
    totalPrice: base.price + fc * filler.price,
    totalCups: 1 + fc,
  }
}

/**
 * 保底組合可能低於限制；把顯示用的限制下修到實際值，避免畫面寫「至少 2 杯」帳單卻只有 1 杯。
 * 正常解（符合限制）原樣回傳。
 */
export function reconcileConstraints(c: DrinkConstraints, combo: DrinkCombo): DrinkConstraints {
  if (combo.totalCups >= c.minCups && combo.totalPrice >= c.minPrice) return c
  logger.warn('drink', '使用保底組合，限制已下修', { constraints: c, combo })
  return {
    minCups:  Math.min(c.minCups,  combo.totalCups),
    minPrice: Math.min(c.minPrice, combo.totalPrice),
  }
}
