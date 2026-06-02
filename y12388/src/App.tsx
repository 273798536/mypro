import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import RegistrationList from '@/pages/RegistrationList'
import RegistrationDetail from '@/pages/RegistrationDetail'
import HistoryPage from '@/pages/HistoryPage'
import ExportCenter from '@/pages/ExportCenter'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<RegistrationList />} />
          <Route path="/registration/:id" element={<RegistrationDetail />} />
          <Route path="/registration/:id/history" element={<HistoryPage />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}
