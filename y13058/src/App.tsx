import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import AnalysisHome from '@/pages/AnalysisHome'
import OverlapPanel from '@/pages/OverlapPanel'
import ReviewPanel from '@/pages/ReviewPanel'
import ReportPanel from '@/pages/ReportPanel'
import HandoverNav from '@/pages/HandoverNav'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<AnalysisHome />} />
        <Route path="overlap" element={<OverlapPanel />} />
        <Route path="review" element={<ReviewPanel />} />
        <Route path="report" element={<ReportPanel />} />
        <Route path="handover" element={<HandoverNav />} />
      </Route>
    </Routes>
  )
}
