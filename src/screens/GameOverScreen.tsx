import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

export default function GameOverScreen() {
  const restartGame = useGameStore(s => s.restartGame)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center flex-1 gap-8 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="text-8xl"
      >
        💸
      </motion.div>

      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold mb-2 text-yellow-400"
        >
          破產
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/60 text-sm"
        >
          錢包見底，連珍奶都買不起了...
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-white/40 text-xs mt-3"
        >
          本回合得分：0 分
        </motion.p>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        whileTap={{ scale: 0.95 }}
        onClick={restartGame}
        className="w-full max-w-xs bg-green-500 text-black font-bold py-4 rounded-2xl text-base"
      >
        再戰一回 →
      </motion.button>
    </motion.div>
  )
}
