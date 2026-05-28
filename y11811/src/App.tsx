import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import PortfolioPage from '@/pages/PortfolioPage'
import RiskBudgetPage from '@/pages/RiskBudgetPage'
import AuditTrailPage from '@/pages/AuditTrailPage'
import ReportPage from '@/pages/ReportPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PortfolioPage />} />
        <Route path="risk-budget" element={<RiskBudgetPage />} />
        <Route path="audit-trail" element={<AuditTrailPage />} />
        <Route path="report" element={<ReportPage />} />
      </Route>
    </Routes>
  )
}

export default App
