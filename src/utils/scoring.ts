import type { Difficulty } from '../store/gameStore'
import { config } from '../config'

export function calcScore(money: number, weight: number): number {
  const weightDelta = weight - 60
  return Math.round(money * 1.5 - weightDelta * 500)
}

export type Rank = 'S' | 'A' | 'B' | 'C'

export interface RankInfo {
  rank: Rank
  label: string
  color: string
  description: string
  emoji: string
}

export function getRankInfo(score: number, difficulty: Difficulty = 'normal'): RankInfo {
  const t = config.scoring[difficulty]
  if (score >= t.S) return { rank: 'S', label: 'S 級', color: '#f5a623', description: '顏霸富豪', emoji: '🏆' }
  if (score >= t.A) return { rank: 'A', label: 'A 級', color: '#c0c0c0', description: '模特財閥', emoji: '🥇' }
  if (score >= t.B) return { rank: 'B', label: 'B 級', color: '#cd7f32', description: '秀麗貴族', emoji: '🥈' }
  return                    { rank: 'C', label: 'C 級', color: '#6b7280', description: '平庸胖子', emoji: '🥉' }
}
