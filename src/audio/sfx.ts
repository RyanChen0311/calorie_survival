// ── 音效引擎 ──────────────────────────────────────────────
// 用法：import { sfx } from '../audio/sfx'; sfx.play('coin')
//
// 設計重點：
//   - AudioContext 延遲到第一次使用者手勢才建立（iOS / Chrome 自動播放政策）
//   - 任何錯誤都只記 log，不會讓遊戲中斷；不支援 Web Audio 的瀏覽器自動靜音
//   - 每個節點播完即 stop()，由瀏覽器回收，不會累積記憶體
//   - 除錯：DevTools console 輸入 __sfx.play('coin') 可直接試聽（僅開發模式）

import { SFX_RECIPES, type SfxId, type SfxRecipe, type SfxStep } from './recipes'
import { useSettingsStore } from '../store/settingsStore'
import { logger } from '../utils/logger'

const MASTER_VOLUME   = 0.5
const ATTACK_SEC      = 0.005   // 起音時間，避免喀聲
const SILENT_GAIN     = 0.0001  // exponentialRamp 不能到 0
const NOISE_BUFFER_SEC = 1

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let unsupported = false
const lastPlayedAt = new Map<SfxId, number>()

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
}

/** 取得（必要時建立）AudioContext；不支援時回傳 null */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx
  if (unsupported) return null

  const Ctor = getAudioContextCtor()
  if (!Ctor) {
    unsupported = true
    logger.warn('sfx', '瀏覽器不支援 Web Audio，音效停用')
    return null
  }
  try {
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = MASTER_VOLUME
    master.connect(ctx.destination)
    logger.debug('sfx', `AudioContext 建立 sampleRate=${ctx.sampleRate}`)
    return ctx
  } catch (err) {
    unsupported = true
    ctx = null
    master = null
    logger.warn('sfx', 'AudioContext 建立失敗，音效停用', err)
    return null
  }
}

/** 白噪音 buffer 只產生一次，所有 noise step 共用 */
function getNoiseBuffer(ac: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const length = Math.floor(ac.sampleRate * NOISE_BUFFER_SEC)
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

/** 建立一個帶起音 / 衰減包絡的 GainNode */
function createEnvelope(ac: AudioContext, start: number, dur: number, peak: number): GainNode {
  const env = ac.createGain()
  env.gain.setValueAtTime(SILENT_GAIN, start)
  env.gain.exponentialRampToValueAtTime(Math.max(peak, SILENT_GAIN), start + ATTACK_SEC)
  env.gain.exponentialRampToValueAtTime(SILENT_GAIN, start + dur)
  return env
}

function scheduleStep(ac: AudioContext, out: AudioNode, step: SfxStep, t0: number): void {
  const start = t0 + step.at
  const end   = start + step.dur
  const env   = createEnvelope(ac, start, step.dur, step.gain ?? 0.5)
  env.connect(out)

  if (step.kind === 'tone') {
    const osc = ac.createOscillator()
    osc.type = step.wave ?? 'sine'
    osc.frequency.setValueAtTime(step.freq, start)
    if (step.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(step.freqEnd, 1), end)
    }
    osc.connect(env)
    osc.start(start)
    osc.stop(end + 0.02)
    return
  }

  const src = ac.createBufferSource()
  src.buffer = getNoiseBuffer(ac)
  let node: AudioNode = src
  if (step.lowpass !== undefined) {
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = step.lowpass
    src.connect(filter)
    node = filter
  }
  node.connect(env)
  src.start(start)
  src.stop(end + 0.02)
}

function isThrottled(id: SfxId, recipe: SfxRecipe): boolean {
  if (!recipe.throttleMs) return false
  const now  = performance.now()
  const last = lastPlayedAt.get(id) ?? -Infinity
  if (now - last < recipe.throttleMs) return true
  lastPlayedAt.set(id, now)
  return false
}

/**
 * 頁面是否已有過使用者互動。瀏覽器在第一次點擊前禁止發聲；
 * 不支援 userActivation API 的瀏覽器（舊版 Safari）視為已互動，交給 resume() 處理。
 */
function hasUserActivation(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  return ua ? ua.hasBeenActive : true
}

function play(id: SfxId): void {
  if (useSettingsStore.getState().muted) return
  // 尚未互動且還沒建立 context → 安靜跳過（例如首次開啟首頁的開場音效）
  if (!ctx && !hasUserActivation()) {
    logger.debug('sfx', `${id} 略過：使用者尚未互動`)
    return
  }

  const recipe: SfxRecipe | undefined = SFX_RECIPES[id]
  if (!recipe) { logger.warn('sfx', `未知音效 id: ${id}`); return }
  if (isThrottled(id, recipe)) return

  const ac = ensureContext()
  if (!ac || !master) return

  try {
    // 背景回來或尚未解鎖時 context 會是 suspended
    if (ac.state === 'suspended') {
      ac.resume().catch(err => logger.debug('sfx', 'resume 失敗（可能尚未有使用者手勢）', err))
    }
    const t0 = ac.currentTime + 0.01
    for (const step of recipe.steps) scheduleStep(ac, master, step, t0)
  } catch (err) {
    logger.warn('sfx', `播放 ${id} 失敗`, err)
  }
}

/**
 * 在第一次觸控 / 點擊時解鎖音訊。
 * iOS Safari 只允許在使用者手勢的同步呼叫中啟動 AudioContext。
 */
function installUnlockListener(): void {
  if (typeof window === 'undefined') return
  const unlock = () => {
    if (useSettingsStore.getState().muted) return   // 靜音時不急著建立 context
    const ac = ensureContext()
    if (!ac) return
    if (ac.state === 'suspended') {
      ac.resume().catch(err => logger.debug('sfx', 'unlock resume 失敗', err))
    }
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export const sfx = { play, installUnlockListener }
export type { SfxId }

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __sfx: typeof sfx }).__sfx = sfx
}
