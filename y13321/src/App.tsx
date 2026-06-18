import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import Workbench from '@/pages/Workbench'
import SampleDetail from '@/pages/SampleDetail'
import Drift from '@/pages/Drift'
import Report from '@/pages/Report'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/sample/:id" element={<SampleDetail />} />
        <Route path="/drift" element={<Drift />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
