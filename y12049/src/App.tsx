import { Routes, Route } from 'react-router-dom'
import GamePage from './pages/GamePage'
import ReviewPage from './pages/ReviewPage'
import SamplesPage from './pages/SamplesPage'
import Navigation from './components/Navigation'

function App() {
  return (
    <div className="min-h-screen bg-grid">
      <Navigation />
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/samples" element={<SamplesPage />} />
      </Routes>
    </div>
  )
}

export default App
