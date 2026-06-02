/**
 * Calorie Survival — 三難度 × 10 回合模擬腳本
 * 執行: node simulate.mjs
 */

// ── 資料常數 ────────────────────────────────────────────
const DRINKS = [
  { id: 'unsweetened_green', price: 25, calories: 50  },
  { id: 'light_tea',         price: 30, calories: 100 },
  { id: 'winter_melon',      price: 30, calories: 150 },
  { id: 'coconut_jelly',     price: 45, calories: 200 },
  { id: 'full_sugar_tea',    price: 35, calories: 250 },
  { id: 'fresh_milk_tea',    price: 55, calories: 300 },
  { id: 'grass_jelly',       price: 60, calories: 350 },
  { id: 'latte_tea',         price: 65, calories: 400 },
  { id: 'bubble_milk_tea',   price: 75, calories: 500 },
  { id: 'brown_sugar_boba',  price: 85, calories: 650 },
]

const ENHANCE_TABLE = [
  { cost: 10,  rate: 1.00, multi: 2.0  },
  { cost: 25,  rate: 0.85, multi: 1.5  },
  { cost: 45,  rate: 0.70, multi: 1.5  },
  { cost: 75,  rate: 0.55, multi: 2.0  },
  { cost: 110, rate: 0.40, multi: 2.6  },
  { cost: 160, rate: 0.28, multi: 3.0  },
  { cost: 230, rate: 0.18, multi: 4.0  },
  { cost: 330, rate: 0.12, multi: 5.0  },
  { cost: 480, rate: 0.08, multi: 8.0  },
  { cost: 700, rate: 0.04, multi: 12.0 },
]

// 期望值 = rate × multi，正期望值的前三階（≥1.0）
const ENHANCE_EV = ENHANCE_TABLE.map(e => e.rate * e.multi)
// +1=2.0, +2=1.275, +3=1.05, +4=1.10, +5=1.04 → 前5正期望

// 裝備費用調降35%後的新數據
const EXERCISES = [
  { id: 'jump_rope',       k: 6.5, b: 5,   equip: [{ cost: 120 }, { cost: 50  }] },
  { id: 'swimming',        k: 6.0, b: 8,   equip: [{ cost: 60  }, { cost: 25  }, { cost: 100 }] },
  { id: 'boxing',          k: 6.0, b: 8,   equip: [{ cost: 130 }, { cost: 50  }] },
  { id: 'rock_climbing',   k: 5.8, b: 5,   equip: [{ cost: 145 }, { cost: 50  }] },
  { id: 'hiking',          k: 5.5, b: 10,  equip: [{ cost: 145 }, { cost: 50  }] },
  { id: 'jogging',         k: 5.0, b: 15,  equip: [{ cost: 120 }, { cost: 50  }] },
  { id: 'cycling',         k: 5.0, b: 15,  equip: [{ cost: 100 }, { cost: 50  }] },
  { id: 'badminton',       k: 4.5, b: 20,  equip: [{ cost: 100 }, { cost: 35  }] },
  { id: 'basketball',      k: 4.5, b: 18,  equip: [{ cost: 80  }, { cost: 65  }] },
  { id: 'martial_arts',    k: 4.5, b: 18,  equip: [{ cost: 120 }, { cost: 50  }] },
  { id: 'surfing',         k: 4.5, b: 15,  equip: [{ cost: 120 }, { cost: 40  }] },
  { id: 'dance',           k: 4.0, b: 28,  equip: [{ cost: 100 }, { cost: 40  }] },
  { id: 'weight_training', k: 4.0, b: 25,  equip: [{ cost: 120 }, { cost: 35  }] },
  { id: 'volleyball',      k: 4.0, b: 28,  equip: [{ cost: 80  }, { cost: 40  }] },
  { id: 'tennis',          k: 4.0, b: 22,  equip: [{ cost: 130 }, { cost: 35  }] },
  { id: 'aerobics',        k: 3.5, b: 50,  equip: [{ cost: 80  }, { cost: 40  }] },
  { id: 'walking',         k: 3.0, b: 75,  equip: [{ cost: 100 }] },
  { id: 'pilates',         k: 2.0, b: 95,  equip: [{ cost: 50  }, { cost: 50  }] },
  { id: 'yoga',            k: 1.5, b: 115, equip: [{ cost: 50  }, { cost: 25  }] },
  { id: 'meditation',      k: 0.5, b: 50,  equip: [{ cost: 35  }] },
]

const INITIAL_MONEY = { easy: 5000, normal: 3000, hard: 800 }

// ── 工具函式 ───────────────────────────────────────────
// 獎金下限從 0 調整為 20
function rInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function rBonusBase() { return rInt(20, 500) }

function calcCalories(ex, x) {
  if (x <= 0) return 0
  const t1 = Math.min(x, 30)
  const t2 = Math.max(0, Math.min(x - 30, 30))
  const t3 = Math.max(0, x - 60)
  return Math.round(t1 * ex.k + t2 * ex.k * 0.7 + t3 * ex.k * 0.5 + ex.b)
}

function calcScore(money, weight) {
  return Math.round(money * 1.5 - (weight - 60) * 500)
}

const RANK_THRESHOLDS = {
  easy:   { S: 22000, A: 15000, B: 3000 },
  normal: { S: 18000, A: 10000, B:  800 },
  hard:   { S: 18000, A: 10000, B:  500 },
}

function getRank(score, difficulty) {
  const t = RANK_THRESHOLDS[difficulty]
  if (score >= t.S) return 'S'
  if (score >= t.A) return 'A'
  if (score >= t.B) return 'B'
  return 'C'
}

function generateDailyCalories() {
  const opts = [300, 350, 400, 450, 500, 550, 600, 650, 700]
  return opts[Math.floor(Math.random() * opts.length)]
}

function generateDrinkConstraints(target) {
  const minCups  = target <= 400 ? 1 : 2
  const baseMin  = Math.round(target / 10)
  const minPrice = baseMin + Math.floor(Math.random() * 3) * 15
  return { minCups, minPrice: Math.max(25, minPrice) }
}

function solveDrinkCost(targetCalories, minPrice) {
  // 簡化：直接用比例估算飲料費用
  // 最低成本飲料: 無糖綠茶 $25/50kcal = $0.5/kcal
  // 平均飲料: 約 $0.15–0.35/kcal
  // 實際會找到最便宜組合，估算用 0.2/kcal + 隨機波動
  const baseCost = Math.round(targetCalories * 0.18)
  const actual = Math.max(minPrice, baseCost + rInt(-15, 30))
  return actual
}

function pickThreeExercises() {
  const shuffled = [...EXERCISES].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1], shuffled[2]]
}

// ── AI 策略 ────────────────────────────────────────────

/**
 * Bonus 策略：對每一強化階計算期望值，
 * 正期望值（EV>1）且金錢夠用就強化；累積至 EV<1 或餘額不足停止。
 */
function simulateBonus(money, bonusBase) {
  let bonus = bonusBase
  let lv = 0

  for (let i = 0; i < ENHANCE_TABLE.length; i++) {
    const { cost, rate, multi } = ENHANCE_TABLE[i]
    const ev = rate * multi
    if (ev < 1.0) break        // 負期望值，停手
    if (money < cost) break    // 錢不夠
    money -= cost
    const success = Math.random() < rate
    bonus = success ? Math.round(bonus * multi) : 0
    lv++
    if (bonus === 0) break     // 歸零，不繼續
  }

  money += bonus
  return { money, bonus, enhanceLv: lv }
}

/**
 * Exercise 策略：
 * 1. 對三種運動依 k 值排序，優先購買高 k 值運動的裝備
 * 2. 若買得起裝備就做，否則跳過
 * 3. 體力分配：高效區為主（前30pts），次項補剩餘
 */
function simulateExercise(money, exercises, exerciseCounts) {
  // 依 k 值排序（高到低）
  const sorted = [...exercises]
    .map((ex, i) => ({ ex, idx: i }))
    .sort((a, b) => b.ex.k - a.ex.k)

  const allocations = [0, 0, 0]
  let stamina = 100
  let totalBurned = 0
  let equipCost = 0

  for (const { ex, idx } of sorted) {
    const count = exerciseCounts[ex.id] ?? 0
    // 計算所需裝備費用（tier 0 基礎 + 額外）
    const baseCost = ex.equip.reduce((s, e) => s + e.cost, 0)
    // tier1 at count>=2, tier2 at count>=5 (simplified: just use base for simulation)
    const neededCost = baseCost

    if (money - equipCost < neededCost) continue  // 買不起，跳過
    equipCost += neededCost

    // 分配體力：儘量在高效區(0-30)，剩餘視情況加
    const pts = Math.min(stamina, 40)  // 每項最多40，鼓勵分散
    if (pts <= 0) break
    allocations[idx] = pts
    stamina -= pts
    totalBurned += calcCalories(ex, pts)
  }

  money -= equipCost

  return { money: Math.max(0, money), allocations, burnedToday: totalBurned, equipCost }
}

const DAILY_INCOME = { easy: 0, normal: 10, hard: 0 }

// ── 單日模擬 ──────────────────────────────────────────
function simulateDay(day, money, excessCalories, weight, exerciseCounts, difficulty) {
  // 每日收入（NORMAL 專屬補貼 $30）
  money += DAILY_INCOME[difficulty] ?? 0

  const bonusBase = rBonusBase()
  const targetCal = generateDailyCalories()
  const constraints = generateDrinkConstraints(targetCal)

  // Bonus Phase
  const bonusResult = simulateBonus(money, bonusBase)
  money = bonusResult.money

  // Drink Phase
  const drinkCost = solveDrinkCost(targetCal, constraints.minPrice)
  money -= drinkCost
  if (money < 0) return null  // 破產 → 遊戲結束
  excessCalories += targetCal

  // Exercise Phase
  const exercises = pickThreeExercises()
  const exResult = simulateExercise(money, exercises, exerciseCounts)
  money = exResult.money
  excessCalories -= exResult.burnedToday

  // 更新運動次數
  exercises.forEach((ex, i) => {
    if (exResult.allocations[i] > 0) {
      exerciseCounts[ex.id] = (exerciseCounts[ex.id] ?? 0) + 1
    }
  })

  // Settlement Phase
  const weightDelta = excessCalories >= 0
    ? Math.floor(excessCalories / 500)
    : -Math.floor(-excessCalories / 500)
  weight = Math.max(40, weight + weightDelta)

  return {
    day, money, excessCalories, weight,
    bonus: bonusResult.bonus,
    enhanceLv: bonusResult.enhanceLv,
    drinkCost,
    drinkCalories: targetCal,
    equipCost: exResult.equipCost,
    burnedToday: exResult.burnedToday,
    weightDelta,
  }
}

// ── 單回合模擬（7 天）────────────────────────────────────
function simulateRound(difficulty) {
  let money = INITIAL_MONEY[difficulty]
  let excessCalories = 0
  let weight = 60.0
  const exerciseCounts = {}
  const days = []

  for (let day = 1; day <= 7; day++) {
    const result = simulateDay(day, money, excessCalories, weight, exerciseCounts, difficulty)
    if (!result) {
      // 破產
      days.push({ day, money: 0, excessCalories, weight, bankrupted: true })
      break
    }
    money = result.money
    excessCalories = result.excessCalories
    weight = result.weight
    days.push(result)
  }

  const score = calcScore(money, weight)
  return { difficulty, days, finalMoney: money, finalWeight: weight, finalExcess: excessCalories, score, rank: getRank(score, difficulty) }
}

// ── 主程式：三難度 × 10 回合 ──────────────────────────────
const DIFFICULTIES = ['easy', 'normal', 'hard']
const ROUNDS = 100

const allResults = {}

for (const diff of DIFFICULTIES) {
  allResults[diff] = []
  for (let r = 0; r < ROUNDS; r++) {
    allResults[diff].push(simulateRound(diff))
  }
}

// ── 輸出結果 ──────────────────────────────────────────────
console.log('='.repeat(80))
console.log('  Calorie Survival 模擬報告  ─  三難度 × 100 回合')
console.log('='.repeat(80))

for (const diff of DIFFICULTIES) {
  const results = allResults[diff]
  console.log(`\n${'─'.repeat(72)}`)
  console.log(`  難度：${diff.toUpperCase()}  （初始金錢：$${INITIAL_MONEY[diff].toLocaleString()}）`)
  console.log('─'.repeat(72))

  // 每回合摘要
  console.log('\n  【每回合最終數據】')
  console.log(`  ${'回'.padEnd(4)} ${'最終金錢'.padStart(10)} ${'體重kg'.padStart(8)} ${'多餘熱量'.padStart(10)} ${'得分'.padStart(8)} ${'評級'}`)
  console.log('  ' + '─'.repeat(50))

  for (let r = 0; r < ROUNDS; r++) {
    const res = results[r]
    const bankruptDay = res.days.find(d => d.bankrupted)
    const bankrupt = bankruptDay ? `(Day${bankruptDay.day}破產)` : ''
    console.log(
      `  ${String(r + 1).padEnd(4)} ` +
      `${('$' + res.finalMoney.toLocaleString()).padStart(10)} ` +
      `${res.finalWeight.toFixed(1).padStart(8)} ` +
      `${res.finalExcess.toLocaleString().padStart(10)} ` +
      `${res.score.toLocaleString().padStart(8)} ` +
      `  ${res.rank}  ${bankrupt}`
    )
  }

  // 統計摘要
  const scores   = results.map(r => r.score)
  const moneys   = results.map(r => r.finalMoney)
  const weights  = results.map(r => r.finalWeight)
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
  const min = arr => Math.min(...arr)
  const max = arr => Math.max(...arr)
  const rankCount = { S: 0, A: 0, B: 0, C: 0 }
  results.forEach(r => rankCount[r.rank]++)

  console.log('\n  【統計摘要】')
  console.log(`  得分  — 平均: ${Math.round(avg(scores)).toLocaleString()}  最低: ${min(scores).toLocaleString()}  最高: ${max(scores).toLocaleString()}`)
  console.log(`  金錢  — 平均: $${Math.round(avg(moneys)).toLocaleString()}  最低: $${min(moneys).toLocaleString()}  最高: $${max(moneys).toLocaleString()}`)
  console.log(`  體重  — 平均: ${avg(weights).toFixed(1)}kg  最低: ${min(weights).toFixed(1)}kg  最高: ${max(weights).toFixed(1)}kg`)
  const pct = n => Math.round(n / ROUNDS * 100) + '%'
  console.log(`  評級分佈 — S:${pct(rankCount.S)}  A:${pct(rankCount.A)}  B:${pct(rankCount.B)}  C:${pct(rankCount.C)}`)

  // 詳細逐日數據（最高分回合 & 最低分回合）
  const sorted = [...results].sort((a, b) => b.score - a.score)
  for (const [label, res] of [['最高分', sorted[0]], ['最低分', sorted[ROUNDS-1]]]) {
    console.log(`\n  【${label} 回合（得分 ${res.score.toLocaleString()}）逐日數據】`)
    console.log(`  ${'日'.padEnd(4)} ${'金錢'.padStart(8)} ${'獎金'.padStart(7)} ${'強化'.padStart(5)} ${'飲料費'.padStart(7)} ${'裝備費'.padStart(7)} ${'燃燒kcal'.padStart(9)} ${'體重'.padStart(6)} ${'多餘熱量'.padStart(10)}`)
    console.log('  ' + '─'.repeat(70))
    res.days.forEach(d => {
      if (d.bankrupted) { console.log(`  Day${d.day}  ─── 破產 ───`); return }
      console.log(
        `  Day${d.day}  ` +
        `${('$'+d.money.toLocaleString()).padStart(8)} ` +
        `${('$'+d.bonus.toLocaleString()).padStart(7)} ` +
        `${('+'+d.enhanceLv).padStart(5)} ` +
        `${('$'+d.drinkCost.toLocaleString()).padStart(7)} ` +
        `${('$'+d.equipCost.toLocaleString()).padStart(7)} ` +
        `${d.burnedToday.toLocaleString().padStart(9)} ` +
        `${d.weight.toFixed(1).padStart(6)}kg ` +
        `${d.excessCalories.toLocaleString().padStart(10)}`
      )
    })
  }
}

// ── 跨難度比較 ─────────────────────────────────────────────
console.log(`\n${'='.repeat(72)}`)
console.log(`  跨難度比較（${ROUNDS} 回合平均）`)
console.log('─'.repeat(72))
console.log(`  ${'難度'.padEnd(8)} ${'平均得分'.padStart(10)} ${'平均金錢'.padStart(10)} ${'平均體重'.padStart(10)} ${'S率'.padStart(6)} ${'A率'.padStart(6)} ${'B率'.padStart(6)} ${'C率'.padStart(6)}`)
console.log('  ' + '─'.repeat(62))
for (const diff of DIFFICULTIES) {
  const results = allResults[diff]
  const scores  = results.map(r => r.score)
  const moneys  = results.map(r => r.finalMoney)
  const weights = results.map(r => r.finalWeight)
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
  const rankCount = { S: 0, A: 0, B: 0, C: 0 }
  results.forEach(r => rankCount[r.rank]++)
  console.log(
    `  ${diff.toUpperCase().padEnd(8)} ` +
    `${Math.round(avg(scores)).toLocaleString().padStart(10)} ` +
    `${('$' + Math.round(avg(moneys)).toLocaleString()).padStart(10)} ` +
    `${avg(weights).toFixed(1).padStart(9)}kg ` +
    `${(Math.round(rankCount.S/ROUNDS*100) + '%').padStart(6)} ` +
    `${(Math.round(rankCount.A/ROUNDS*100) + '%').padStart(6)} ` +
    `${(Math.round(rankCount.B/ROUNDS*100) + '%').padStart(6)} ` +
    `${(Math.round(rankCount.C/ROUNDS*100) + '%').padStart(6)}`
  )
}
console.log('='.repeat(72))
