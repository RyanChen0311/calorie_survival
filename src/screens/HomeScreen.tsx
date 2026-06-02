import { motion } from 'framer-motion'
import { useGameStore, type Difficulty } from '../store/gameStore'

// ── 開場爆發粒子 ─────────────────────────────────────────
const BURST = [
  { label: '+1',  angle: -80,  delay: 0.05 },
  { label: '+2',  angle: -40,  delay: 0.12 },
  { label: '+3',  angle:  0,   delay: 0.08 },
  { label: '+5',  angle: -120, delay: 0.18 },
  { label: '+10', angle:  40,  delay: 0.15 },
  { label: '💎',  angle: -160, delay: 0.22 },
  { label: '💰',  angle:  80,  delay: 0.10 },
  { label: '+2',  angle:  130, delay: 0.20 },
]

function BurstParticle({ label, angle, delay }: { label: string; angle: number; delay: number }) {
  const rad = (angle * Math.PI) / 180
  const dx = Math.cos(rad) * 90
  const dy = Math.sin(rad) * 90
  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
      animate={{ x: dx, y: dy, opacity: 0, scale: 1.4 }}
      transition={{ duration: 0.9, delay, ease: 'easeOut' }}
      className="absolute font-black text-yellow-300 text-[18px] pointer-events-none select-none"
      style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
    >
      {label}
    </motion.div>
  )
}

// ── 背景掉落食物粒子 ─────────────────────────────────────
const FOOD_DROPS: { emoji: string; kcal: number | null; left: string; delay: number; duration: number; glow: string }[] = [
  { emoji: '🍔', kcal: 550,  left: '13%', delay: 0,   duration: 6.0, glow: 'rgba(180,100,30,0.35)'  },
  { emoji: '💰', kcal: null, left: '10%', delay: 0.7, duration: 5.0, glow: 'rgba(251,191,36,0.35)'  },
  { emoji: '🍕', kcal: 266,  left: '18%', delay: 0.4, duration: 5.5, glow: 'rgba(220,80,40,0.35)'   },
  { emoji: '🥞', kcal: 350,  left: '25%', delay: 1.3, duration: 7.0, glow: 'rgba(230,170,80,0.35)'  },
  { emoji: '💰', kcal: null, left: '32%', delay: 2.0, duration: 4.5, glow: 'rgba(251,191,36,0.35)'  },
  { emoji: '🍜', kcal: 450,  left: '39%', delay: 2.1, duration: 8.0, glow: 'rgba(220,140,50,0.35)'  },
  { emoji: '🍗', kcal: 420,  left: '46%', delay: 0.6, duration: 6.8, glow: 'rgba(200,120,30,0.35)'  },
  { emoji: '🍟', kcal: 320,  left: '53%', delay: 0.8, duration: 6.5, glow: 'rgba(240,210,40,0.35)'  },
  { emoji: '💰', kcal: null, left: '60%', delay: 1.5, duration: 5.5, glow: 'rgba(251,191,36,0.35)'  },
  { emoji: '🍰', kcal: 400,  left: '67%', delay: 1.7, duration: 7.0, glow: 'rgba(240,140,160,0.35)' },
  { emoji: '🍩', kcal: 280,  left: '74%', delay: 0.3, duration: 5.8, glow: 'rgba(210,100,180,0.35)' },
  { emoji: '💰', kcal: null, left: '81%', delay: 3.0, duration: 4.8, glow: 'rgba(251,191,36,0.35)'  },
  { emoji: '🍣', kcal: 150,  left: '79%', delay: 2.5, duration: 6.8, glow: 'rgba(210,50,50,0.35)'   },
  { emoji: '🌮', kcal: 210,  left: '87%', delay: 1.0, duration: 7.2, glow: 'rgba(160,210,60,0.35)'  },
  { emoji: '🧁', kcal: 300,  left: '17%', delay: 3.5, duration: 6.2, glow: 'rgba(240,150,180,0.35)' },
  { emoji: '💰', kcal: null, left: '14%', delay: 4.5, duration: 5.3, glow: 'rgba(251,191,36,0.35)'  },
  { emoji: '🍦', kcal: 250,  left: '21%', delay: 2.8, duration: 7.8, glow: 'rgba(240,220,180,0.35)' },
  { emoji: '🥩', kcal: 600,  left: '28%', delay: 1.9, duration: 6.3, glow: 'rgba(180,40,40,0.35)'   },
  { emoji: '🍱', kcal: 500,  left: '35%', delay: 3.2, duration: 7.5, glow: 'rgba(80,180,100,0.35)'  },
  { emoji: '🥗', kcal: 120,  left: '42%', delay: 0.2, duration: 8.5, glow: 'rgba(80,200,80,0.35)'   },
  { emoji: '🥤', kcal: 200,  left: '49%', delay: 4.0, duration: 5.2, glow: 'rgba(60,200,210,0.35)'  },
  { emoji: '🍛', kcal: 480,  left: '56%', delay: 2.3, duration: 6.7, glow: 'rgba(220,160,40,0.35)'  },
  { emoji: '💰', kcal: null, left: '63%', delay: 5.0, duration: 4.9, glow: 'rgba(251,191,36,0.35)'  },
  { emoji: '🌭', kcal: 290,  left: '70%', delay: 1.1, duration: 7.3, glow: 'rgba(200,80,50,0.35)'   },
  { emoji: '🍝', kcal: 380,  left: '77%', delay: 3.8, duration: 6.1, glow: 'rgba(220,100,30,0.35)'  },
  { emoji: '🥐', kcal: 280,  left: '84%', delay: 0.9, duration: 5.7, glow: 'rgba(230,180,80,0.35)'  },
  { emoji: '🍿', kcal: 380,  left: '76%', delay: 2.6, duration: 6.4, glow: 'rgba(240,220,60,0.35)'  },
  { emoji: '🥪', kcal: 320,  left: '85%', delay: 4.3, duration: 7.1, glow: 'rgba(160,200,80,0.35)'  },
]

// ── 人生開局選項 ─────────────────────────────────────────
const LIFE_PATHS = [
  {
    key:      'easy' as Difficulty,
    emoji:    '💼',
    title:    '穩紮穩打',
    tagline:  '存款充裕，全力精算體態',
    money:    5000,
    badge:    'S 級可期',
    badgeCol: 'text-yellow-400',
    bg:       'from-emerald-800/70 to-teal-950',
    border:   'border-emerald-400/30',
  },
  {
    key:      'normal' as Difficulty,
    emoji:    '🎯',
    title:    '月光族逆轉',
    tagline:  '錢永遠不夠，意志力說了算',
    money:    3000,
    badge:    '挑戰 A 級',
    badgeCol: 'text-violet-400',
    bg:       'from-violet-800/70 to-purple-950',
    border:   'border-violet-400/30',
  },
  {
    key:      'hard' as Difficulty,
    emoji:    '🎲',
    title:    '孤注一擲',
    tagline:  '幾乎一無所有，高風險高回報',
    money:    800,
    badge:    '地獄 or 天堂',
    badgeCol: 'text-red-400',
    bg:       'from-red-800/70 to-rose-950',
    border:   'border-red-400/30',
  },
]

// ── 評級展示 ─────────────────────────────────────────────
const GRADES = [
  { rank: 'S', label: '顏霸富豪', color: 'text-yellow-400',  bg: 'bg-yellow-400/10' },
  { rank: 'A', label: '模特財閥', color: 'text-slate-300',   bg: 'bg-slate-400/10'  },
  { rank: 'B', label: '秀麗貴族', color: 'text-amber-600',   bg: 'bg-amber-700/10'  },
  { rank: 'C', label: '平庸胖子', color: 'text-slate-500',   bg: 'bg-slate-600/10'  },
]

export default function HomeScreen() {
  const startGame = useGameStore(s => s.startGame)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col flex-1 px-4 py-5 gap-5 overflow-y-auto relative"
    >
      {/* ── 背景掉落食物 ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-0">
        {FOOD_DROPS.map((f, i) => (
          <motion.div
            key={i}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: '105vh', opacity: [0, 0.18, 0.18, 0] }}
            transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'linear' }}
            className="absolute flex flex-col items-center gap-0 select-none"
            style={{
              left: f.left,
              transform: 'translateX(-50%)',
              filter: `drop-shadow(0 0 14px ${f.glow})`,
            }}
          >
            <span className="text-[22px] leading-none">{f.emoji}</span>
            {f.kcal !== null
              ? <span className="text-[24px] text-white/30 font-mono leading-tight">{f.kcal}kcal</span>
              : <span className="text-[24px] text-white/30 leading-tight">錢</span>
            }
          </motion.div>
        ))}
      </div>

      {/* ── 標題英雄區 ── */}
      <div className="relative flex flex-col items-center pt-3 pb-1">
        {/* 爆發粒子 */}
        <div className="relative flex items-center justify-center w-20 h-20">
          {BURST.map((p, i) => (
            <BurstParticle key={i} {...p} />
          ))}
          {/* 中心光暈 */}
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="absolute w-12 h-12 rounded-full bg-yellow-400/40 pointer-events-none"
          />
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 250, delay: 0.15 }}
            className="text-[58px] z-10"
          >
            💰
          </motion.div>
        </div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-2 text-[29px] font-black text-white tracking-wide"
          style={{ textShadow: '0 0 24px rgba(251,191,36,0.5)' }}
        >
          Calorie Survival
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-yellow-400/80 text-[14px] font-medium mt-0.5"
        >
          S 曲線人生計畫
        </motion.p>

        {/* 故事鉤 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mt-3 text-center text-white/60 text-[14px] leading-relaxed max-w-xs"
        >
          總說工作太忙、沒時間運動？<br />
          <span className="text-white/80">現在有機會，讓你同時變富有又擁有理想身材。</span><br />
          選擇你的人生開局，7 天後見效。
        </motion.div>
      </div>

      {/* ── 評級展示 ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="grid grid-cols-4 gap-1.5"
      >
        {GRADES.map((g, i) => (
          <motion.div
            key={g.rank}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 + i * 0.08 }}
            className={`${g.bg} rounded-xl py-2 px-1 flex flex-col items-center gap-0.5`}
          >
            <span className={`text-[19px] font-black ${g.color}`}>{g.rank}</span>
            <span className="text-[20px] text-white/40 text-center leading-tight">{g.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── 人生開局選擇 ── */}
      <div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-white/40 text-[14px] text-center mb-2.5"
        >
          選擇你的人生開局
        </motion.p>

        <div className="flex flex-col gap-2.5">
          {LIFE_PATHS.map((p, i) => (
            <motion.button
              key={p.key}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.95 + i * 0.1, type: 'spring', stiffness: 280 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => startGame(p.key)}
              className={`bg-gradient-to-r ${p.bg} border ${p.border} rounded-2xl p-3.5 text-left flex items-center gap-3`}
            >
              <div className="text-3xl shrink-0">{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-[17px]">{p.title}</div>
                <div className="text-white/50 text-[13px] mt-0.5 truncate">{p.tagline}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-white font-bold text-[17px]">${p.money.toLocaleString()}</div>
                <div className={`text-[12px] font-medium ${p.badgeCol} mt-0.5`}>{p.badge}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── 核心玩法暗示 ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.25 }}
        className="bg-yellow-400/8 border border-yellow-400/20 rounded-xl p-3 text-[12px] text-white/50 leading-relaxed text-center"
      >
        💎 每日獎金可強化至 <span className="text-yellow-400 font-bold">+10</span>，爆發倍數高達
        <span className="text-yellow-400 font-bold"> ×12</span><br />
        運動消耗卡路里・管理體態・追求 S 級人生
      </motion.div>
    </motion.div>
  )
}
