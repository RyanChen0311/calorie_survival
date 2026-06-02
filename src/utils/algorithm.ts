import { DRINKS, type Drink } from '../data/drinks'
import { config } from '../config'

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

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 每日強制消費熱量，從 config 讀取選項 */
export function generateDailyCalories(): number {
  const opts = config.dailyCalorieTargets
  return opts[Math.floor(Math.random() * opts.length)]
}

/** 飲料購買限制隨熱量目標動態縮放 */
export function generateDrinkConstraints(targetCalories: number) {
  const minCups  = targetCalories <= 400 ? 1 : 2
  const baseMin  = Math.round(targetCalories / 10)
  const minPrice = baseMin + Math.floor(Math.random() * 3) * 15
  return { minCups, minPrice: Math.max(25, minPrice) }
}

/** 隨機建構飲料組合使總熱量精準等於 targetCalories */
export function solveDrinkCombo(
  targetCalories: number,
  minCups: number,
  minPrice: number,
): DrinkCombo {
  const fillerDrink = DRINKS.find(d => d.id === 'unsweetened_green')!

  for (let attempt = 0; attempt < 120; attempt++) {
    const pool    = DRINKS.filter(d => d.id !== 'unsweetened_green' && d.calories <= targetCalories)
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const numFeatured = Math.random() < 0.4 ? 3 : 2

    const orderMap = new Map<string, DrinkOrder>()
    let remaining  = targetCalories

    for (const drink of shuffled.slice(0, numFeatured)) {
      if (remaining < drink.calories) continue
      const count = randomInt(1, Math.floor(remaining / drink.calories))
      orderMap.set(drink.id, { drink, count })
      remaining -= drink.calories * count
    }

    const fillerCount = remaining / 50
    if (!Number.isInteger(fillerCount) || fillerCount < 0 || fillerCount > 5) continue
    if (fillerCount > 0) {
      const ex = orderMap.get(fillerDrink.id)
      orderMap.set(fillerDrink.id, { drink: fillerDrink, count: (ex?.count ?? 0) + fillerCount })
    }

    const orders     = Array.from(orderMap.values())
    const totalCups  = orders.reduce((s, o) => s + o.count, 0)
    const totalPrice = orders.reduce((s, o) => s + o.drink.price * o.count, 0)

    if (totalCups >= minCups && totalPrice >= minPrice) {
      return { orders, totalCalories: targetCalories, totalPrice, totalCups }
    }
  }

  // 保底：最大可用飲料 + 無糖綠茶補齊
  const base = DRINKS.filter(d => d.calories <= targetCalories && d.id !== 'unsweetened_green')
    .sort((a, b) => b.calories - a.calories)[0]
  const fc = (targetCalories - base.calories) / 50
  return {
    orders: [
      { drink: base, count: 1 },
      ...(fc > 0 ? [{ drink: fillerDrink, count: fc }] : []),
    ],
    totalCalories: targetCalories,
    totalPrice: base.price + fc * 25,
    totalCups: 1 + fc,
  }
}
