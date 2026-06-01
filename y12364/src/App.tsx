import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import BatchList from '@/pages/BatchList'
import BatchDetail from '@/pages/BatchDetail'
import Anomalies from '@/pages/Anomalies'
import ReportPage from '@/pages/ReportPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<BatchList />} />
          <Route path="/batch/:id" element={<BatchDetail />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
