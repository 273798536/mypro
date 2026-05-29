import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Margin from '@/pages/Margin'
import Orders from '@/pages/Orders'
import ImportPage from '@/pages/ImportPage'
import Audit from '@/pages/Audit'
import Reports from '@/pages/Reports'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/margin" element={<Margin />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  )
}
