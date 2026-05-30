import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import CasePage from '@/pages/CasePage'
import ReviewPage from '@/pages/ReviewPage'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/case/:id" element={<CasePage />} />
        <Route path="/case/:id/review" element={<ReviewPage />} />
      </Routes>
    </div>
  )
}

export default App
