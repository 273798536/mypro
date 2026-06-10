import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Workspace from '@/pages/Workspace'
import SpectrumImport from '@/pages/SpectrumImport'
import Attribution from '@/pages/Attribution'
import Review from '@/pages/Review'
import ReportExport from '@/pages/ReportExport'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workspace />} />
          <Route path="/import" element={<SpectrumImport />} />
          <Route path="/attribution/:batchId" element={<Attribution />} />
          <Route path="/review" element={<Review />} />
          <Route path="/export" element={<ReportExport />} />
        </Route>
      </Routes>
    </Router>
  )
}
