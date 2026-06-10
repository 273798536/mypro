import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Records from '@/pages/Records'
import Statistics from '@/pages/Statistics'
import Anomalies from '@/pages/Anomalies'
import Trajectory from '@/pages/Trajectory'
import Export from '@/pages/Export'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/trajectory" element={<Trajectory />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  )
}
