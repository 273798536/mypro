import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Logs from '@/pages/Logs'
import Compute from '@/pages/Compute'
import Chart from '@/pages/Chart'
import Handover from '@/pages/Handover'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="logs" element={<Logs />} />
        <Route path="compute" element={<Compute />} />
        <Route path="chart" element={<Chart />} />
        <Route path="handover" element={<Handover />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
