import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import BuoyData from '@/pages/BuoyData'
import RiskLayer from '@/pages/RiskLayer'
import DuplicatePage from '@/pages/DuplicatePage'
import InspectionPage from '@/pages/InspectionPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/buoy-data" element={<BuoyData />} />
          <Route path="/risk-layer" element={<RiskLayer />} />
          <Route path="/duplicate" element={<DuplicatePage />} />
          <Route path="/inspection" element={<InspectionPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
