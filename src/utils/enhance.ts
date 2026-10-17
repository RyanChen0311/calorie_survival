import { config, type EnhanceEntry } from '../config'

// ── 強化 / 幸運局規則 ─────────────────────────────────────
// store、UI、模擬腳本共用，確保三邊機率一致。

/** 第 n 局（從 1 起算）是否為幸運局：n 為 every 的倍數 */
export function isLuckyGameNumber(n: number): boolean {
  const { every } = config.luckyGame
  return every > 0 && n > 0 && n % every === 0
}

/** 已開過 gamesStarted 局時，還要再開幾局才會遇到下一個幸運局（1 = 下一局就是） */
export function gamesUntilLucky(gamesStarted: number): number {
  const { every } = config.luckyGame
  if (every <= 0) return Infinity
  return every - (gamesStarted % every)
}

/** 實際成功率：幸運局加上 rateBonus，上限 100% */
export function getEnhanceRate(entry: EnhanceEntry, luckyGame: boolean): number {
  const bonus = luckyGame ? config.luckyGame.rateBonus : 0
  return Math.min(1, entry.rate + bonus)
}
