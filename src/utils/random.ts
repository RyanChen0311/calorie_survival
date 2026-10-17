// ── 亂數工具 ──────────────────────────────────────────────
// 取代 `[...arr].sort(() => Math.random() - 0.5)`：
//   - 舊寫法 O(n log n)，且分布不均勻（比較函式不一致）
//   - Fisher–Yates 為 O(k) 且均勻

/** 回傳 [min, max] 之間的整數（含兩端） */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 隨機取一個元素；空陣列回傳 undefined */
export function pickRandom<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 原地洗牌前 k 個位置（partial Fisher–Yates）。
 * 完成後 arr[0..k-1] 為均勻抽樣結果。時間 O(k)，額外空間 O(1)。
 */
export function partialShuffleInPlace<T>(arr: T[], k: number): void {
  const n = Math.min(k, arr.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
}

/** 不放回抽 k 個（不改動原陣列）。時間 O(n)（複製）+ O(k) */
export function sample<T>(arr: readonly T[], k: number): T[] {
  const copy = arr.slice()
  partialShuffleInPlace(copy, k)
  return copy.slice(0, Math.min(k, copy.length))
}
