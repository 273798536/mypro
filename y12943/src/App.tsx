import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Overview from '@/pages/Overview'
import Quality from '@/pages/Quality'
import Reviews from '@/pages/Reviews'
import Trace from '@/pages/Trace'
import IO from '@/pages/IO'

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/trace" element={<Trace />} />
          <Route path="/io" element={<IO />} />
        </Routes>
      </Layout>
    </Router>
  )
}
