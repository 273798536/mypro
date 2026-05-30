import { Routes, Route } from 'react-router-dom'
import LevelSelect from './pages/LevelSelect'
import PlayPage from './pages/PlayPage'
import ReviewPage from './pages/ReviewPage'

export default function App() {
  return (
    <div className="min-h-screen bg-bg font-body">
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/play/:levelId" element={<PlayPage />} />
        <Route path="/review/:levelId" element={<ReviewPage />} />
      </Routes>
    </div>
  )
}
