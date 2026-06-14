import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Overview from '@/pages/Overview'
import Contracts from '@/pages/Contracts'
import Export from '@/pages/Export'
import RecordForm from '@/components/RecordForm'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
      <RecordForm />
    </Router>
  )
}
