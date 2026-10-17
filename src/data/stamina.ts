// 運動階段可花錢補充的體力選項

export interface StaminaEvent {
  emoji: string
  name: string
  stamina: number
  cost: number
}

export const STAMINA_EVENTS: readonly StaminaEvent[] = [
  { emoji: '🪑', name: '坐下休息',   stamina: 10,  cost: 25  },
  { emoji: '🥤', name: '喝補給飲料', stamina: 15,  cost: 35  },
  { emoji: '🍱', name: '吃飯',       stamina: 20,  cost: 45  },
  { emoji: '🍵', name: '泡茶放鬆',   stamina: 25,  cost: 55  },
  { emoji: '💆', name: '按摩',       stamina: 35,  cost: 75  },
  { emoji: '😴', name: '睡一覺',     stamina: 50,  cost: 100 },
  { emoji: '🛁', name: '泡澡',       stamina: 75,  cost: 140 },
  { emoji: '💉', name: '專業護理',   stamina: 100, cost: 175 },
]
