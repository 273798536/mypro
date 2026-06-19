import { Routes, Route, Navigate } from 'react-router-dom'
import RunListPage from './pages/RunListPage'
import EvaluationPage from './pages/EvaluationPage'
import RecordDetailPage from './pages/RecordDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/runs" replace />} />
      <Route path="/runs" element={<RunListPage />} />
      <Route path="/runs/:runId" element={<EvaluationPage />} />
      <Route path="/records/:recordId" element={<RecordDetailPage />} />
    </Routes>
  )
}

export default App
