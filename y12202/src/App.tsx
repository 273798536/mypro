import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import NotificationToast from '@/components/NotificationToast'
import Dashboard from '@/pages/Dashboard'
import Contracts from '@/pages/Contracts'
import ContractDetail from '@/pages/ContractDetail'
import Extensions from '@/pages/Extensions'
import NewExtension from '@/pages/NewExtension'
import ExtensionDetail from '@/pages/ExtensionDetail'
import AuditTrail from '@/pages/AuditTrail'
import RiskDetection from '@/pages/RiskDetection'
import ExportCenter from '@/pages/ExportCenter'

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/:id" element={<ContractDetail />} />
          <Route path="/extensions" element={<Extensions />} />
          <Route path="/extensions/new" element={<NewExtension />} />
          <Route path="/extensions/:id" element={<ExtensionDetail />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
          <Route path="/risk-detection" element={<RiskDetection />} />
          <Route path="/export" element={<ExportCenter />} />
        </Routes>
      </Layout>
      <NotificationToast />
    </Router>
  )
}
