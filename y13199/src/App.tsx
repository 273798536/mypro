import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ReportGeneration from './pages/ReportGeneration'
import ShiftSummary from './pages/ShiftSummary'
import EquipmentVerifyPage from './pages/EquipmentVerifyPage'

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-[#F4F7FA]">
        <Sidebar />
        <main className="ml-56 flex-1 p-8">
          <Routes>
            <Route path="/" element={<ReportGeneration />} />
            <Route path="/summary" element={<ShiftSummary />} />
            <Route path="/verify" element={<EquipmentVerifyPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
