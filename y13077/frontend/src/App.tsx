import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/Layout'
import ReviewList from './pages/ReviewList'
import ReviewDetail from './pages/ReviewDetail'
import Guide from './pages/Guide'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/reviews" replace />} />
          <Route path="reviews" element={<ReviewList />} />
          <Route path="reviews/:id" element={<ReviewDetail />} />
          <Route path="guide" element={<Guide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
