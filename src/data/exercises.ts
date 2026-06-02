import { config } from '../config'
export type { EquipmentItem, EquipmentTier, ExerciseConfig as ExerciseType } from '../config'

// 預設資料：啟動時填入 config.exercises（若遠端有覆寫則以遠端為準）
const DEFAULT_EXERCISES = [
  // ── 高強度 k≥5.5 ──────────────────────────────────────
  {
    id: 'jump_rope', name: '跳繩', emoji: '🏃', k: 6.5, b: 5,
    hint: '高強度，前段投入效率最高',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'jr_shoes', name: '跑步鞋',    emoji: '👟', cost: 120 },
        { id: 'jr_rope',  name: '跳繩',      emoji: '🔗', cost: 50  },
      ]},
      { requiredCount: 2, items: [{ id: 'jr_knee', name: '護膝',      emoji: '🦵', cost: 80  }]},
      { requiredCount: 5, items: [{ id: 'jr_hrm',  name: '心率監測器', emoji: '💓', cost: 130 }]},
    ],
  },
  {
    id: 'swimming', name: '游泳', emoji: '🏊', k: 6.0, b: 8,
    hint: '全身肌群，穩定高輸出',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'sw_goggles', name: '泳鏡', emoji: '🥽', cost: 60  },
        { id: 'sw_cap',     name: '泳帽', emoji: '🧢', cost: 25  },
        { id: 'sw_suit',    name: '泳衣', emoji: '🩱', cost: 100 },
      ]},
      { requiredCount: 2, items: [{ id: 'sw_earplug', name: '防水耳塞',  emoji: '🔇', cost: 40  }]},
      { requiredCount: 5, items: [{ id: 'sw_tracker', name: '防水計圈器', emoji: '⏱️', cost: 100 }]},
    ],
  },
  {
    id: 'boxing', name: '拳擊', emoji: '🥊', k: 6.0, b: 8,
    hint: '爆發型，集中投入有優勢',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'bx_gloves',     name: '拳擊手套', emoji: '🥊', cost: 130 },
        { id: 'bx_mouthguard', name: '護齒',     emoji: '🦷', cost: 50  },
      ]},
      { requiredCount: 2, items: [{ id: 'bx_helmet', name: '頭盔',   emoji: '⛑️', cost: 120 }]},
      { requiredCount: 5, items: [{ id: 'bx_body',   name: '護身甲', emoji: '🛡️', cost: 145 }]},
    ],
  },
  {
    id: 'rock_climbing', name: '攀岩', emoji: '🧗', k: 5.8, b: 5,
    hint: '技術型，效率隨投入遞減明顯',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'rc_shoes',  name: '攀岩鞋', emoji: '👟', cost: 145 },
        { id: 'rc_helmet', name: '安全帽', emoji: '⛑️', cost: 50  },
      ]},
      { requiredCount: 2, items: [{ id: 'rc_rope',   name: '繩索', emoji: '🧵', cost: 130 }]},
      { requiredCount: 5, items: [{ id: 'rc_device', name: '確保器', emoji: '🔧', cost: 120 }]},
    ],
  },
  {
    id: 'hiking', name: '爬山', emoji: '⛰️', k: 5.5, b: 10,
    hint: '耐力型，長時間投入報酬穩定',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'hk_boots', name: '登山鞋', emoji: '👢', cost: 145 },
        { id: 'hk_poles', name: '登山杖', emoji: '🦯', cost: 50  },
      ]},
      { requiredCount: 2, items: [{ id: 'hk_pack', name: '登山背包', emoji: '🎒', cost: 120 }]},
      { requiredCount: 5, items: [{ id: 'hk_gps',  name: 'GPS 導航', emoji: '📡', cost: 145 }]},
    ],
  },
  // ── 中高強度 k=4.5–5.0 ────────────────────────────────
  {
    id: 'jogging', name: '慢跑', emoji: '🏃', k: 5.0, b: 15,
    hint: '入門首選，基礎加成佳',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'jg_shoes', name: '慢跑鞋', emoji: '👟', cost: 120 },
        { id: 'jg_shirt', name: '排汗衣', emoji: '👕', cost: 50  },
      ]},
      { requiredCount: 2, items: [{ id: 'jg_watch', name: '運動手錶', emoji: '⌚', cost: 130 }]},
      { requiredCount: 5, items: [{ id: 'jg_knee',  name: '護膝',    emoji: '🦵', cost: 65  }]},
    ],
  },
  {
    id: 'cycling', name: '騎腳踏車', emoji: '🚴', k: 5.0, b: 15,
    hint: '低衝擊高效，膝蓋友善',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'cy_helmet', name: '安全帽',   emoji: '⛑️', cost: 100 },
        { id: 'cy_gloves', name: '騎行手套', emoji: '🧤', cost: 50  },
      ]},
      { requiredCount: 2, items: [{ id: 'cy_light', name: '車燈組', emoji: '💡', cost: 80  }]},
      { requiredCount: 5, items: [{ id: 'cy_meter', name: '碼錶',   emoji: '⏱️', cost: 100 }]},
    ],
  },
  {
    id: 'badminton', name: '羽毛球', emoji: '🏸', k: 4.5, b: 20,
    hint: '反應型，基礎加成不錯',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'bd_racket',  name: '羽毛球拍', emoji: '🏸', cost: 100 },
        { id: 'bd_shuttle', name: '羽毛球',   emoji: '🪶', cost: 35  },
      ]},
      { requiredCount: 2, items: [{ id: 'bd_shoes', name: '羽球鞋', emoji: '👟', cost: 120 }]},
      { requiredCount: 5, items: [{ id: 'bd_wrist', name: '護腕',   emoji: '🤲', cost: 40  }]},
    ],
  },
  {
    id: 'basketball', name: '籃球', emoji: '🏀', k: 4.5, b: 18,
    hint: '間歇型，搭配其他運動效果好',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'bb_ball',  name: '籃球',   emoji: '🏀', cost: 80 },
        { id: 'bb_shoes', name: '籃球鞋', emoji: '👟', cost: 65 },
      ]},
      { requiredCount: 2, items: [{ id: 'bb_knee',    name: '護膝',    emoji: '🦵', cost: 50 }]},
      { requiredCount: 5, items: [{ id: 'bb_glasses', name: '防護眼鏡', emoji: '🥽', cost: 65 }]},
    ],
  },
  {
    id: 'martial_arts', name: '武術', emoji: '🥋', k: 4.5, b: 18,
    hint: '核心與柔韌並重',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'ma_uniform', name: '道服',   emoji: '🥋', cost: 120 },
        { id: 'ma_guard',   name: '護具組', emoji: '🛡️', cost: 50  },
      ]},
      { requiredCount: 2, items: [{ id: 'ma_target', name: '訓練靶', emoji: '🎯', cost: 120 }]},
      { requiredCount: 5, items: [{ id: 'ma_helmet', name: '頭盔',   emoji: '⛑️', cost: 100 }]},
    ],
  },
  {
    id: 'surfing', name: '衝浪', emoji: '🏄', k: 4.5, b: 15,
    hint: '全身協調，適合分散投入',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'sf_board', name: '衝浪板', emoji: '🏄', cost: 120 },
        { id: 'sf_leash', name: '腳繩',   emoji: '🧵', cost: 40  },
      ]},
      { requiredCount: 2, items: [
        { id: 'sf_wax',  name: '防滑蠟', emoji: '🕯️', cost: 25 },
        { id: 'sf_suit', name: '防曬衣', emoji: '👕',  cost: 50 },
      ]},
      { requiredCount: 5, items: [{ id: 'sf_wetsuit', name: '潛水衣', emoji: '🩱', cost: 180 }]},
    ],
  },
  // ── 中強度 k=3.5–4.0 ──────────────────────────────────
  {
    id: 'dance', name: '舞蹈', emoji: '💃', k: 4.0, b: 28,
    hint: '長時間持續型，基礎加成明顯',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'dn_shoes',  name: '舞蹈鞋', emoji: '👠', cost: 100 },
        { id: 'dn_outfit', name: '舞蹈服', emoji: '👗', cost: 40  },
      ]},
      { requiredCount: 2, items: [{ id: 'dn_ankle',  name: '護踝', emoji: '🦶', cost: 50  }]},
      { requiredCount: 5, items: [{ id: 'dn_speaker', name: '音響', emoji: '🔊', cost: 180 }]},
    ],
  },
  {
    id: 'weight_training', name: '重量訓練', emoji: '🏋️', k: 4.0, b: 25,
    hint: '基礎代謝提升，適合搭配有氧',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'wt_dumbbell', name: '啞鈴組',   emoji: '🏋️', cost: 120 },
        { id: 'wt_gloves',   name: '訓練手套', emoji: '🧤', cost: 35  },
      ]},
      { requiredCount: 2, items: [{ id: 'wt_belt',   name: '護腰帶', emoji: '🩹', cost: 80  }]},
      { requiredCount: 5, items: [{ id: 'wt_barbell', name: '槓鈴組', emoji: '🏋️', cost: 210 }]},
    ],
  },
  {
    id: 'volleyball', name: '排球', emoji: '🏐', k: 4.0, b: 28,
    hint: '爆發與耐力兼具',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'vb_ball',  name: '排球', emoji: '🏐', cost: 80 },
        { id: 'vb_knee',  name: '護膝', emoji: '🦵', cost: 40 },
      ]},
      { requiredCount: 2, items: [{ id: 'vb_shoes', name: '排球鞋', emoji: '👟', cost: 100 }]},
      { requiredCount: 5, items: [{ id: 'vb_elbow', name: '護肘',   emoji: '💪', cost: 40  }]},
    ],
  },
  {
    id: 'tennis', name: '網球', emoji: '🎾', k: 4.0, b: 22,
    hint: '節奏性強，投入分配彈性大',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'tn_racket', name: '網球拍', emoji: '🎾', cost: 130 },
        { id: 'tn_ball',   name: '網球',   emoji: '🎾', cost: 35  },
      ]},
      { requiredCount: 2, items: [{ id: 'tn_shoes', name: '網球鞋', emoji: '👟', cost: 120 }]},
      { requiredCount: 5, items: [{ id: 'tn_elbow', name: '護肘',   emoji: '💪', cost: 50  }]},
    ],
  },
  {
    id: 'aerobics', name: '有氧舞蹈', emoji: '💃', k: 3.5, b: 50,
    hint: '基礎加成高，少量也有效',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'ab_shoes', name: '運動鞋', emoji: '👟', cost: 80 },
        { id: 'ab_mat',   name: '瑜珈墊', emoji: '🧘', cost: 40 },
      ]},
      { requiredCount: 2, items: [{ id: 'ab_band', name: '彈力帶', emoji: '🎀', cost: 40 }]},
      { requiredCount: 5, items: [{ id: 'ab_ring', name: '阻力圈', emoji: '⭕', cost: 50 }]},
    ],
  },
  // ── 低強度（高 b 值）k≤3.0 ────────────────────────────
  {
    id: 'walking', name: '健走', emoji: '🚶', k: 3.0, b: 75,
    hint: '只要開始就有豐厚基礎加成',
    equipmentTiers: [
      { requiredCount: 0, items: [{ id: 'wk_shoes', name: '健走鞋', emoji: '👟', cost: 100 }]},
      { requiredCount: 2, items: [{ id: 'wk_count', name: '計步器', emoji: '📟', cost: 50  }]},
      { requiredCount: 5, items: [
        { id: 'wk_hat',  name: '遮陽帽', emoji: '🧢', cost: 35 },
        { id: 'wk_pack', name: '小背包', emoji: '🎒', cost: 50 },
      ]},
    ],
  },
  {
    id: 'pilates', name: '彼拉提斯', emoji: '🧘', k: 2.0, b: 95,
    hint: '基礎加成極高，搭配高強度運動效益佳',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'pl_mat',  name: '瑜珈墊',     emoji: '🧘', cost: 50 },
        { id: 'pl_ball', name: '彼拉提斯球', emoji: '🏐', cost: 50 },
      ]},
      { requiredCount: 2, items: [{ id: 'pl_band', name: '彈力帶', emoji: '🎀', cost: 35 }]},
      { requiredCount: 5, items: [{ id: 'pl_foam', name: '滾筒',   emoji: '🛢️', cost: 65 }]},
    ],
  },
  {
    id: 'yoga', name: '瑜珈', emoji: '🧘', k: 1.5, b: 115,
    hint: '最高基礎加成，極少量投入即觸發',
    equipmentTiers: [
      { requiredCount: 0, items: [
        { id: 'yg_mat',   name: '瑜珈墊', emoji: '🧘', cost: 50 },
        { id: 'yg_block', name: '瑜珈磚', emoji: '🟦', cost: 25 },
      ]},
      { requiredCount: 2, items: [{ id: 'yg_strap', name: '瑜珈帶', emoji: '🎀', cost: 25 }]},
      { requiredCount: 5, items: [{ id: 'yg_wheel', name: '瑜珈輪', emoji: '⭕', cost: 80 }]},
    ],
  },
  {
    id: 'meditation', name: '冥想', emoji: '🧘', k: 0.5, b: 50,
    hint: '幾乎不消耗體力，仍有固定加成',
    equipmentTiers: [
      { requiredCount: 0, items: [{ id: 'md_cushion', name: '冥想枕', emoji: '🛋️', cost: 35  }]},
      { requiredCount: 2, items: [{ id: 'md_incense', name: '薰香',   emoji: '🕯️', cost: 25  }]},
      { requiredCount: 5, items: [{ id: 'md_bowl',    name: '頌缽',   emoji: '🔔', cost: 100 }]},
    ],
  },
]

// 填入 config（若遠端已有資料則不覆寫）
if (config.exercises.length === 0) {
  config.exercises.push(...DEFAULT_EXERCISES)
}

export const EXERCISE_TYPES = config.exercises

export function getRequiredEquipment(ex: { equipmentTiers: { requiredCount: number; items: { id: string; name: string; emoji: string; cost: number }[] }[] }, count: number) {
  return ex.equipmentTiers
    .filter(tier => count >= tier.requiredCount)
    .flatMap(tier => tier.items)
}

export function calcExerciseCalories(ex: { k: number; b: number }, x: number): number {
  if (x <= 0) return 0
  const t1 = Math.min(x, 30)
  const t2 = Math.max(0, Math.min(x - 30, 30))
  const t3 = Math.max(0, x - 60)
  return Math.round(t1 * ex.k + t2 * ex.k * 0.7 + t3 * ex.k * 0.5 + ex.b)
}

export function getEfficiencyZone(x: number): 'high' | 'mid' | 'low' {
  if (x <= 30) return 'high'
  if (x <= 60) return 'mid'
  return 'low'
}

export function pickThreeExercises(): [typeof EXERCISE_TYPES[0], typeof EXERCISE_TYPES[0], typeof EXERCISE_TYPES[0]] {
  const shuffled = [...EXERCISE_TYPES].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1], shuffled[2]]
}
