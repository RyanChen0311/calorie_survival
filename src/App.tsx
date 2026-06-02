import { AnimatePresence } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import HomeScreen from './screens/HomeScreen'
import GameScreen from './screens/GameScreen'
import GameOverScreen from './screens/GameOverScreen'
import ResultScreen from './screens/ResultScreen'

export default function App() {
  const screen = useGameStore(s => s.screen)

  return (
    <div className="flex flex-col h-full bg-game-bg">
      <AnimatePresence mode="wait">
        {screen === 'home'     && <HomeScreen key="home" />}
        {screen === 'game'     && <GameScreen key="game" />}
        {screen === 'gameover' && <GameOverScreen key="gameover" />}
        {screen === 'result'   && <ResultScreen key="result" />}
      </AnimatePresence>
    </div>
  )
}
