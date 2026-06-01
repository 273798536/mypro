import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Workbench from '@/pages/Workbench'
import TraceDetail from '@/pages/TraceDetail'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/trace/:resultId" element={<TraceDetail />} />
      </Routes>
    </Router>
  )
}
