// ── Calorie Survival 自動試玩模擬 ─────────────────────────
// AI 直接操作遊戲 store（與玩家按按鈕呼叫同一組 action），用真實規則跑完整 7 天。
//
// 用法（WSL）：
//   npm run simulate                 每個難度 10000 局（三種玩家隨機混合），種子固定
//   npm run simulate -- 2000 42      每個難度 2000 局、亂數種子 42
//
// 輸出：console 報表 + scripts/simulation-result.json（完整數據）
//
// 評級門檻：依 TARGET_RATIOS 的人數比例，從混合母體的分數分布反推。
//
// 分數換算（AI 決策依據，來自 utils/scoring.ts）：
//   $1  = 1.5 分（結算金錢 × 1.5）
//   1 kg = 500 分；體重 = 淨值 ÷ 500 → 燃燒 1 kcal ≈ 1 分

import type { DayState, Difficulty } from '../src/store/gameStore'
import type { ExerciseType } from '../src/data/exercises'
import type { StaminaEvent } from '../src/data/stamina'
import type { ScoringThreshold } from '../src/config'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const GAMES = Number(process.argv[2] ?? 10000)
const SEED  = Number(process.argv[3] ?? 20261018)

if (!Number.isInteger(GAMES) || GAMES <= 0) throw new Error(`局數必須是正整數：${process.argv[2]}`)
if (!Number.isFinite(SEED)) throw new Error(`種子必須是數字：${process.argv[3]}`)

type RankKey = 'S' | 'A' | 'B' | 'C'

/** 目標人數比例（%），S+A+B+C = 100 */
const TARGET_RATIOS: Record<Difficulty, Record<RankKey, number>> = {
  easy:   { S: 10, A: 20, B: 30, C: 40 },
  normal: { S:  5, A: 15, B: 35, C: 45 },
  hard:   { S:  3, A: 13, B: 37, C: 47 },
}

// ── 1. 載入遊戲模組前的環境準備 ────────────────────────────

/** 可重現的亂數（mulberry32）：同一個種子 → 同一批結果，方便除錯 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
Math.random = mulberry32(SEED)

// Node 沒有 localStorage，zustand persist 每次 set 都會警告 → 濾掉；其他警告計數後列在報表
const warnCounts = new Map<string, number>()
console.warn = (...args: unknown[]) => {
  const msg = args.map(a => typeof a === 'string' ? a : '').join(' ')
  if (msg.includes('zustand persist')) return
  const key = msg.slice(0, 80)
  warnCounts.set(key, (warnCounts.get(key) ?? 0) + 1)
}

// 必須在攔截 console / Math.random 之後才載入（靜態 import 會被提升到最前面）
const { useGameStore, ENHANCE_TABLE } = await import('../src/store/gameStore')
const { getRequiredEquipment, calcExerciseCalories } = await import('../src/data/exercises')
const { STAMINA_EVENTS } = await import('../src/data/stamina')
const { calcScore } = await import('../src/utils/scoring')
const { getEnhanceRate } = await import('../src/utils/enhance')
const { config } = await import('../src/config')
const { TOTAL_DAYS } = await import('../src/config/constants')

// ── 2. AI 策略 ────────────────────────────────────────────

const MONEY_TO_SCORE = 1.5
const KCAL_TO_SCORE  = 1
/** 保留給明天強制消費的現金（飲料帳單通常 < $300） */
const RESERVE = 300
const MAX_LOOP_PER_GAME = 200

interface Strategy {
  id: string
  label: string
  enhance: boolean    // 是否依期望值強化獎金
  exercise: boolean   // 是否最佳化運動（含買裝備 / 補體力）
}

const STRATEGIES: Strategy[] = [
  { id: 'smart', label: '精算玩家', enhance: true,  exercise: true  },
  { id: 'safe',  label: '保守玩家', enhance: false, exercise: true  },
  { id: 'lazy',  label: '擺爛玩家', enhance: false, exercise: false },
]

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

const store = () => useGameStore.getState()
const cur   = (): DayState => {
  const c = store().current
  if (!c) throw new Error('預期 current 存在但為 null')
  return c
}

/** 強化期望值 > 直接收下 且 失敗後仍保有預留現金 → 強化（幸運局用加成後機率） */
function shouldEnhance(c: DayState): boolean {
  const entry = ENHANCE_TABLE[c.enhanceLv]
  if (!entry || c.bonus <= 0) return false
  if (c.money - entry.cost < RESERVE) return false
  const rate = getEnhanceRate(entry, store().luckyGame)
  const gain = rate * c.bonus * entry.multi - c.bonus - entry.cost
  return gain > 0
}

// ── 運動最佳化 ──
// 每種運動的熱量曲線：投入 > 0 時有固定加成 b，之後分段遞減（k、0.7k、0.5k）。
// 對「選定要做的運動組合」而言曲線是凹函數 → 依邊際效率貪婪分配即為最佳解。
// 3 種運動只有 8 種組合，全部列舉。

interface Plan {
  value: number          // 分數淨值 = 燃燒 kcal − 1.5 × 裝備花費
  alloc: number[]
  subset: number[]
}

function missingEquipment(ex: ExerciseType, count: number, owned: string[]) {
  return getRequiredEquipment(ex, count).filter(item => !owned.includes(item.id))
}

function greedyAllocate(exs: ExerciseType[], subset: number[], stamina: number): number[] | null {
  if (subset.length > stamina) return null
  const alloc = [0, 0, 0]
  for (const i of subset) alloc[i] = 1            // 每項至少 1 點才拿得到加成 b
  let remaining = stamina - subset.length

  const segments = subset.flatMap(i => [
    { i, rate: exs[i].k,       cap: 29 },
    { i, rate: exs[i].k * 0.7, cap: 30 },
    { i, rate: exs[i].k * 0.5, cap: Infinity },
  ]).sort((a, b) => b.rate - a.rate)

  for (const seg of segments) {
    if (remaining <= 0) break
    const add = Math.min(seg.cap, remaining)
    alloc[seg.i] += add
    remaining -= add
  }
  return alloc
}

function bestPlan(c: DayState, counts: Record<string, number>, stamina: number, budget: number): Plan {
  const exs = c.offeredExercises
  const equipCosts = exs.map(ex =>
    missingEquipment(ex, counts[ex.id] ?? 0, c.ownedEquipment).reduce((s, it) => s + it.cost, 0))

  let best: Plan = { value: 0, alloc: [0, 0, 0], subset: [] }
  for (let mask = 1; mask < 8; mask++) {
    const subset = [0, 1, 2].filter(i => mask & (1 << i))
    const equipCost = subset.reduce((s, i) => s + equipCosts[i], 0)
    if (equipCost > budget) continue
    const alloc = greedyAllocate(exs, subset, stamina)
    if (!alloc) continue
    const kcal  = subset.reduce((s, i) => s + calcExerciseCalories(exs[i], alloc[i]), 0)
    const value = kcal * KCAL_TO_SCORE - equipCost * MONEY_TO_SCORE
    if (value > best.value) best = { value, alloc, subset }
  }
  return best
}

function playExercise(isLastDay: boolean) {
  const c = cur()
  const counts = store().exerciseCounts
  // 最後一天沒有明天的帳單，不必預留
  const budget = c.money - (isLastDay ? 0 : RESERVE)
  if (budget <= 0) return

  // 逐次嘗試購買體力，直到沒有正收益
  let stamina = c.dailyStamina
  let spent   = 0
  const bought: StaminaEvent[] = []
  let plan = bestPlan(c, counts, stamina, budget)

  for (let iter = 0; iter < 30; iter++) {
    let pick: { ev: StaminaEvent; plan: Plan; gain: number } | null = null
    for (const ev of STAMINA_EVENTS) {
      if (spent + ev.cost > budget) continue
      const p = bestPlan(c, counts, stamina + ev.stamina, budget - spent - ev.cost)
      const gain = p.value - ev.cost * MONEY_TO_SCORE - plan.value
      if (gain > 0 && (!pick || gain > pick.gain)) pick = { ev, plan: p, gain }
    }
    if (!pick) break
    bought.push(pick.ev)
    stamina += pick.ev.stamina
    spent   += pick.ev.cost
    plan = pick.plan
  }

  if (plan.subset.length === 0) return   // 怎麼算都不划算 → 不運動

  // 實際操作 store：買裝備 → 補體力 → 分配
  const s = store()
  for (const i of plan.subset) {
    const ex = c.offeredExercises[i]
    for (const item of missingEquipment(ex, counts[ex.id] ?? 0, cur().ownedEquipment)) {
      s.buyEquipment(item.id, item.cost)
    }
  }
  for (const ev of bought) s.replenishStamina(ev.stamina, ev.cost)
  for (const i of [0, 1, 2] as const) s.setAllocation(i, plan.alloc[i])
}

// ── 3. 跑一局 ─────────────────────────────────────────────

interface GameResult {
  strategy: string
  lucky: boolean
  bankrupt: boolean
  score: number
  finalMoney: number
  finalWeight: number
  totalBurned: number
  bonusCollected: number
  enhanceTries: number
  enhanceSuccess: number
}

function playGame(difficulty: Difficulty, strategy: Strategy): GameResult {
  store().restartGame()
  store().startGame(difficulty)
  if (store().fatalError) throw new Error(`startGame 失敗：${store().fatalError}`)
  const lucky = store().luckyGame

  let bonusCollected = 0, enhanceTries = 0, enhanceSuccess = 0

  for (let loop = 0; store().screen === 'game'; loop++) {
    if (loop > MAX_LOOP_PER_GAME) throw new Error('單局迴圈次數過多，疑似卡關')
    const c = cur()

    switch (c.phase) {
      case 'bonus':
        if (strategy.enhance) {
          while (shouldEnhance(cur())) {
            enhanceTries++
            if (store().enhanceBonus().success) enhanceSuccess++
          }
        }
        bonusCollected += cur().bonus
        break
      case 'exercise':
        if (strategy.exercise) playExercise(c.day >= TOTAL_DAYS)
        break
      case 'drink':
      case 'settlement':
        break
    }
    store().advancePhase()
    if (store().fatalError) throw new Error(`遊戲錯誤：${store().fatalError}`)
  }

  const { screen, dayRecords, current } = store()
  const totalBurned = dayRecords.reduce((s, r) => s + r.burnedToday, 0)
  const base = { strategy: strategy.id, lucky, totalBurned, bonusCollected, enhanceTries, enhanceSuccess }

  if (screen === 'gameover') {
    return { ...base, bankrupt: true, score: 0, finalMoney: current?.money ?? 0, finalWeight: current?.weight ?? 0 }
  }
  const last = dayRecords[dayRecords.length - 1]
  return { ...base, bankrupt: false, score: calcScore(last.money, last.weight), finalMoney: last.money, finalWeight: last.weight }
}

// ── 4. 統計 ───────────────────────────────────────────────

const percentile = (sorted: number[], p: number) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
const mean  = (xs: number[]) => xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length
const round = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d
const pct   = (n: number, total: number) => `${round((n / Math.max(total, 1)) * 100, 1)}%`

/** 依目標比例反推門檻：S 門檻 = 前 S% 的最低分，以此類推 */
function thresholdsFor(sortedScores: number[], ratio: Record<RankKey, number>): ScoringThreshold {
  const cut = (topPct: number) => percentile(sortedScores, 1 - topPct / 100)
  return {
    S: cut(ratio.S),
    A: cut(ratio.S + ratio.A),
    B: cut(ratio.S + ratio.A + ratio.B),
  }
}

/** 破產不評級，計入 C（分數 0） */
function rankOf(r: GameResult, t: ScoringThreshold): RankKey {
  if (r.bankrupt) return 'C'
  return r.score >= t.S ? 'S' : r.score >= t.A ? 'A' : r.score >= t.B ? 'B' : 'C'
}

function rankDistribution(results: GameResult[], t: ScoringThreshold) {
  const counts: Record<RankKey, number> = { S: 0, A: 0, B: 0, C: 0 }
  for (const r of results) counts[rankOf(r, t)]++
  return Object.fromEntries((Object.keys(counts) as RankKey[]).map(k => [k, pct(counts[k], results.length)]))
}

function scoreStats(results: GameResult[]) {
  const s = results.map(r => r.score).sort((a, b) => a - b)
  return {
    mean: round(mean(s)), p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9),
    max: s[s.length - 1] ?? 0,
  }
}

function summarize(difficulty: Difficulty, results: GameResult[]) {
  const sorted    = results.map(r => r.score).sort((a, b) => a - b)
  const suggested = thresholdsFor(sorted, TARGET_RATIOS[difficulty])
  const current   = config.scoring[difficulty]

  const byStrategy = Object.fromEntries(STRATEGIES.map(st => {
    const rs    = results.filter(r => r.strategy === st.id)
    const alive = rs.filter(r => !r.bankrupt)
    const tries = rs.reduce((s, r) => s + r.enhanceTries, 0)
    const wins  = rs.reduce((s, r) => s + r.enhanceSuccess, 0)
    return [st.id, {
      label: st.label,
      games: rs.length,
      bankruptRate: pct(rs.length - alive.length, rs.length),
      score: scoreStats(rs),
      rankWithSuggested: rankDistribution(rs, suggested),
      finalWeight: round(mean(alive.map(r => r.finalWeight)), 1),
      finalMoney:  round(mean(alive.map(r => r.finalMoney))),
      totalBurned: round(mean(alive.map(r => r.totalBurned))),
      enhanceSuccessRate: tries ? pct(wins, tries) : '-',
    }]
  }))

  const lucky  = results.filter(r => r.lucky)
  const normal = results.filter(r => !r.lucky)

  return {
    games: results.length,
    target: TARGET_RATIOS[difficulty],
    currentThresholds: current,
    suggestedThresholds: suggested,
    rankWithCurrent:   rankDistribution(results, current),
    rankWithSuggested: rankDistribution(results, suggested),
    score: scoreStats(results),
    luckyGame: {
      games: lucky.length,
      meanScoreLucky:  round(mean(lucky.map(r => r.score))),
      meanScoreNormal: round(mean(normal.map(r => r.score))),
    },
    byStrategy,
  }
}

// ── 5. 執行 ───────────────────────────────────────────────

const started = Date.now()
const report = {} as Record<Difficulty, ReturnType<typeof summarize>>

for (const difficulty of DIFFICULTIES) {
  const results: GameResult[] = []
  for (let g = 0; g < GAMES; g++) {
    // 每局隨機抽一種玩家（不能用 g % 3 輪流：幸運局也是每 3 局一次，會永遠落在同一種玩家）
    const strategy = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)]
    results.push(playGame(difficulty, strategy))
  }
  report[difficulty] = summarize(difficulty, results)
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1)

console.log(`\n═══ Calorie Survival 模擬結果 ═══  每難度 ${GAMES} 局（三種玩家隨機混合）｜種子 ${SEED}｜耗時 ${elapsed}s`)

for (const d of DIFFICULTIES) {
  const r = report[d]
  console.log(`\n── ${d.toUpperCase()}（初始 $${config.initialMoney[d]}）── 目標 S:A:B:C = ${Object.values(r.target).join(':')}`)
  console.table({
    '目前門檻': { ...r.currentThresholds,   ...r.rankWithCurrent },
    '建議門檻': { ...r.suggestedThresholds, ...r.rankWithSuggested },
  })
  console.table(Object.fromEntries(Object.values(r.byStrategy).map(s => [s.label, {
    局數: s.games, 破產率: s.bankruptRate,
    平均分: s.score.mean, P10: s.score.p10, P50: s.score.p50, P90: s.score.p90,
    ...s.rankWithSuggested,
    平均體重: s.finalWeight, 平均金錢: s.finalMoney,
  }])))
  console.log(`幸運局 ${r.luckyGame.games} 局：平均分 ${r.luckyGame.meanScoreLucky}（一般局 ${r.luckyGame.meanScoreNormal}）`)
}

const suggestedScoring = Object.fromEntries(DIFFICULTIES.map(d => [d, report[d].suggestedThresholds]))
console.log('\n建議寫入 game-config.json 的 scoring：')
console.log(JSON.stringify(suggestedScoring, null, 2))

if (warnCounts.size > 0) {
  console.log('\n遊戲內警告統計：')
  for (const [msg, n] of warnCounts) console.log(`  ${n}×  ${msg}`)
}

// npm run 會把 cwd 設在專案根目錄
const outPath = join(process.cwd(), 'scripts', 'simulation-result.json')
writeFileSync(outPath, JSON.stringify({
  games: GAMES, seed: SEED, elapsedSec: Number(elapsed),
  targetRatios: TARGET_RATIOS, suggestedScoring, report,
  warnings: Object.fromEntries(warnCounts),
}, null, 2))
console.log(`\n完整數據已寫入 ${outPath}`)
