// ── 音效配方 ──────────────────────────────────────────────
// 所有音效都用 Web Audio API 即時合成，不需要音檔：
//   - 不增加 bundle / PWA 快取大小，離線可用
//   - 調整音色只要改這張表，不用重新錄音
//
// 每個音效是一串 step，at = 相對觸發時間（秒）。
// 想調音量：改 gain；想調音高：改 freq；想加滑音：設 freqEnd。

export interface ToneStep {
  kind: 'tone'
  at: number             // 開始時間（秒）
  dur: number            // 長度（秒）
  freq: number           // 起始頻率 Hz
  freqEnd?: number       // 結束頻率 Hz（滑音）
  wave?: OscillatorType  // 預設 'sine'
  gain?: number          // 0~1，預設 0.5
}

export interface NoiseStep {
  kind: 'noise'
  at: number
  dur: number
  gain?: number
  lowpass?: number       // 低通濾波截止頻率 Hz，越低越悶
}

export type SfxStep = ToneStep | NoiseStep

export interface SfxRecipe {
  steps: SfxStep[]
  /** 同一音效最短重播間隔（毫秒），避免滑桿等連續操作疊音爆音 */
  throttleMs?: number
}

// 音名 → 頻率，方便閱讀
const N = {
  C3: 130.81, G3: 196.0,
  C4: 261.63, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, E6: 1318.5, G6: 1568.0,
} as const

const tone = (at: number, dur: number, freq: number, opts: Partial<ToneStep> = {}): ToneStep =>
  ({ kind: 'tone', at, dur, freq, ...opts })
const noise = (at: number, dur: number, opts: Partial<NoiseStep> = {}): NoiseStep =>
  ({ kind: 'noise', at, dur, ...opts })

export const SFX_RECIPES = {
  /** 一般按鈕 */
  tap: { throttleMs: 40, steps: [
    tone(0, 0.04, 1200, { wave: 'triangle', gain: 0.25 }),
  ]},

  /** 滑桿 / 步進 */
  tick: { throttleMs: 45, steps: [
    tone(0, 0.025, 1800, { wave: 'sine', gain: 0.15 }),
  ]},

  /** 音效開啟提示 */
  toggle: { steps: [
    tone(0,    0.06, N.E5, { wave: 'triangle', gain: 0.3 }),
    tone(0.06, 0.08, N.A5, { wave: 'triangle', gain: 0.3 }),
  ]},

  /** 首頁選擇開局 */
  gameStart: { steps: [
    tone(0,    0.1,  N.C5, { wave: 'square', gain: 0.18 }),
    tone(0.09, 0.1,  N.E5, { wave: 'square', gain: 0.18 }),
    tone(0.18, 0.1,  N.G5, { wave: 'square', gain: 0.18 }),
    tone(0.27, 0.25, N.C6, { wave: 'square', gain: 0.2 }),
  ]},

  /** 首頁開場爆發：低音「砰」+ 一串金幣叮噹（時間對齊粒子 delay 0.05~0.22s） */
  burst: { throttleMs: 150, steps: [
    noise(0, 0.12, { gain: 0.35, lowpass: 900 }),
    tone(0, 0.2, 180, { freqEnd: 60, wave: 'sine', gain: 0.5 }),
    ...[0.05, 0.08, 0.10, 0.12, 0.15, 0.18, 0.20, 0.22].map((at, i) =>
      tone(at, 0.12, [N.E6, N.B5, N.G6, N.C6, N.E6, N.G5, N.C6, N.G6][i], { wave: 'square', gain: 0.08 })),
    tone(0.25, 0.4, N.C6, { wave: 'triangle', gain: 0.2 }),
  ]},

  /** 幸運局開局（閃亮琶音） */
  lucky: { steps: [
    ...[N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].map((f, i) => tone(i * 0.06, 0.12, f, { wave: 'triangle', gain: 0.25 })),
    tone(0.36, 0.5, N.C6, { wave: 'sine', gain: 0.3 }),
    tone(0.36, 0.5, N.G6, { wave: 'sine', gain: 0.12 }),
  ]},

  /** 揭曉每日獎金（拉霸） */
  reveal: { steps: [
    ...[0, 1, 2, 3, 4, 5].map(i => tone(i * 0.045, 0.04, 600 + i * 120, { wave: 'square', gain: 0.12 })),
    tone(0.3, 0.3, N.G5, { wave: 'triangle', gain: 0.35 }),
    tone(0.3, 0.3, N.C6, { wave: 'sine',     gain: 0.2 }),
  ]},

  /** 強化成功 */
  enhanceSuccess: { steps: [
    tone(0,    0.08, N.C5, { wave: 'triangle', gain: 0.35 }),
    tone(0.07, 0.08, N.E5, { wave: 'triangle', gain: 0.35 }),
    tone(0.14, 0.08, N.G5, { wave: 'triangle', gain: 0.35 }),
    tone(0.21, 0.35, N.C6, { wave: 'triangle', gain: 0.4 }),
    tone(0.25, 0.3,  N.E6, { wave: 'sine',     gain: 0.15 }),
    tone(0.3,  0.25, N.G6, { wave: 'sine',     gain: 0.1 }),
  ]},

  /** 強化失敗（獎金歸零） */
  enhanceFail: { steps: [
    noise(0, 0.25, { gain: 0.35, lowpass: 1200 }),
    tone(0,   0.45, 220, { freqEnd: 70, wave: 'sawtooth', gain: 0.3 }),
    tone(0.05, 0.4, 110, { freqEnd: 50, wave: 'square',   gain: 0.15 }),
  ]},

  /** 收下獎金（金幣） */
  coin: { steps: [
    tone(0,    0.07, N.B5, { wave: 'square', gain: 0.2 }),
    tone(0.07, 0.3,  N.E6, { wave: 'square', gain: 0.2 }),
  ]},

  /** 空手而歸 */
  empty: { steps: [
    tone(0, 0.18, N.E4, { freqEnd: N.C4, wave: 'triangle', gain: 0.3 }),
  ]},

  /** 揭曉飲料帳單（不祥預感） */
  drinkReveal: { steps: [
    tone(0,    0.18, N.A4, { wave: 'sawtooth', gain: 0.15 }),
    tone(0.18, 0.18, N.F4, { wave: 'sawtooth', gain: 0.15 }),
    tone(0.36, 0.4,  N.C4, { freqEnd: 240, wave: 'sawtooth', gain: 0.18 }),
  ]},

  /** 強制扣款（收銀機） */
  pay: { steps: [
    noise(0, 0.05, { gain: 0.3, lowpass: 4000 }),
    tone(0.04, 0.06, 2000, { wave: 'square', gain: 0.12 }),
    tone(0.1,  0.25, 2600, { wave: 'sine',   gain: 0.25 }),
  ]},

  /** 揭曉運動（哨音） */
  whistle: { steps: [
    tone(0,    0.12, 2200, { freqEnd: 2500, wave: 'sine', gain: 0.25 }),
    tone(0.14, 0.25, 2200, { freqEnd: 2600, wave: 'sine', gain: 0.25 }),
  ]},

  /** 購買裝備 */
  buy: { throttleMs: 60, steps: [
    tone(0,    0.05, N.G5, { wave: 'square', gain: 0.15 }),
    tone(0.05, 0.12, N.D5, { wave: 'square', gain: 0.15 }),
  ]},

  /** 補充體力（咕嚕上升） */
  stamina: { throttleMs: 60, steps: [
    tone(0, 0.22, 280, { freqEnd: 900, wave: 'sine', gain: 0.35 }),
    tone(0.12, 0.12, 600, { freqEnd: 1200, wave: 'sine', gain: 0.15 }),
  ]},

  /** 開始運動 */
  exerciseStart: { steps: [
    tone(0,    0.08, N.G4, { wave: 'square', gain: 0.18 }),
    tone(0.1,  0.08, N.G4, { wave: 'square', gain: 0.18 }),
    tone(0.2,  0.3,  N.G5, { wave: 'square', gain: 0.2 }),
  ]},

  /** 結算：體重上升 */
  weightUp: { steps: [
    tone(0,    0.2, N.G4, { wave: 'triangle', gain: 0.3 }),
    tone(0.2,  0.2, 370,  { wave: 'triangle', gain: 0.3 }),
    tone(0.4,  0.5, N.F4, { freqEnd: 300, wave: 'triangle', gain: 0.3 }),
  ]},

  /** 結算：體重下降 */
  weightDown: { steps: [
    tone(0,    0.1, N.C5, { wave: 'triangle', gain: 0.3 }),
    tone(0.1,  0.1, N.E5, { wave: 'triangle', gain: 0.3 }),
    tone(0.2,  0.3, N.A5, { wave: 'triangle', gain: 0.35 }),
  ]},

  /** 結算：體重持平 */
  weightSame: { steps: [
    tone(0, 0.3, N.A4, { wave: 'sine', gain: 0.3 }),
  ]},

  /** 進入下一天 */
  nextDay: { steps: [
    tone(0,    0.15, N.E5, { wave: 'sine', gain: 0.3 }),
    tone(0.12, 0.15, N.G5, { wave: 'sine', gain: 0.3 }),
    tone(0.24, 0.3,  N.C6, { wave: 'sine', gain: 0.3 }),
  ]},

  /** 破產 */
  gameOver: { steps: [
    tone(0,    0.3, N.G4, { wave: 'sawtooth', gain: 0.18 }),
    tone(0.3,  0.3, 370,  { wave: 'sawtooth', gain: 0.18 }),
    tone(0.6,  0.3, N.F4, { wave: 'sawtooth', gain: 0.18 }),
    tone(0.9,  0.9, N.E4, { freqEnd: N.C3, wave: 'sawtooth', gain: 0.2 }),
  ]},

  /** 七天完成 */
  victory: { steps: [
    tone(0,    0.12, N.C5, { wave: 'square', gain: 0.16 }),
    tone(0.12, 0.12, N.E5, { wave: 'square', gain: 0.16 }),
    tone(0.24, 0.12, N.G5, { wave: 'square', gain: 0.16 }),
    tone(0.36, 0.25, N.C6, { wave: 'square', gain: 0.18 }),
    tone(0.62, 0.12, N.G5, { wave: 'square', gain: 0.16 }),
    tone(0.74, 0.6,  N.C6, { wave: 'square', gain: 0.2 }),
    tone(0.74, 0.6,  N.C4, { wave: 'triangle', gain: 0.25 }),
  ]},

  /** 評級印章落下 */
  stamp: { steps: [
    noise(0, 0.15, { gain: 0.5, lowpass: 600 }),
    tone(0, 0.25, 140, { freqEnd: 50, wave: 'sine', gain: 0.6 }),
    tone(0.05, 0.4, N.G3, { wave: 'triangle', gain: 0.15 }),
  ]},
} satisfies Record<string, SfxRecipe>

export type SfxId = keyof typeof SFX_RECIPES
