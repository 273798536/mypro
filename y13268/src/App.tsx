import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import PointDetailDrawer from '@/components/PointDetailDrawer'
import Dashboard from '@/pages/Dashboard'
import Ledger from '@/pages/Ledger'
import Review from '@/pages/Review'
import History from '@/pages/History'

function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/review" element={<Review />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Layout>
      <PointDetailDrawer />
    </>
  )
}

export default App
