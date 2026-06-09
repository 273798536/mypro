import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import AssistantDashboard from './pages/assistant/Dashboard'
import BatchManagement from './pages/assistant/BatchManagement'
import BatchDetail from './pages/assistant/BatchDetail'
import RecordDetail from './pages/assistant/RecordDetail'
import ReviewManagement from './pages/assistant/ReviewManagement'
import ReviewSession from './pages/assistant/ReviewSession'
import FormulaCalculator from './pages/assistant/FormulaCalculator'
import ReportManagement from './pages/assistant/ReportManagement'
import StudentDashboard from './pages/student/Dashboard'
import StudentReport from './pages/student/StudentReport'
import SystemTraces from './pages/assistant/SystemTraces'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/assistant/dashboard" replace />} />
        <Route path="assistant">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AssistantDashboard />} />
          <Route path="batches" element={<BatchManagement />} />
          <Route path="batches/:id" element={<BatchDetail />} />
          <Route path="records/:id" element={<RecordDetail />} />
          <Route path="review" element={<ReviewManagement />} />
          <Route path="review/:id" element={<ReviewSession />} />
          <Route path="formula" element={<FormulaCalculator />} />
          <Route path="reports" element={<ReportManagement />} />
          <Route path="traces" element={<SystemTraces />} />
        </Route>
        <Route path="student">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="reports/:id" element={<StudentReport />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
