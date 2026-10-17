import { AnimatePresence } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import ErrorBoundary, { ErrorScreen, resetSave } from './components/ErrorBoundary'
import HomeScreen from './screens/HomeScreen'
import GameScreen from './screens/GameScreen'
import GameOverScreen from './screens/GameOverScreen'
import ResultScreen from './screens/ResultScreen'

function ScreenRouter() {
  const screen     = useGameStore(s => s.screen)
  const fatalError = useGameStore(s => s.fatalError)

  if (fatalError) return <ErrorScreen message={fatalError} onReset={resetSave} />

  return (
    <AnimatePresence mode="wait">
      {screen === 'home'     && <HomeScreen key="home" />}
      {screen === 'game'     && <GameScreen key="game" />}
      {screen === 'gameover' && <GameOverScreen key="gameover" />}
      {screen === 'result'   && <ResultScreen key="result" />}
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <div className="flex flex-col h-full bg-game-bg">
      <ErrorBoundary>
        <ScreenRouter />
      </ErrorBoundary>
    </div>
  )
}
