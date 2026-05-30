import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LevelSelect from '@/components/LevelSelect'
import GameBoard from '@/components/GameBoard'
import ReviewPanel from '@/components/ReviewPanel'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/game/:levelId" element={<GameBoard />} />
        <Route path="/review/:levelId" element={<ReviewPanel />} />
      </Routes>
    </Router>
  )
}
