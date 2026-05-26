import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import { ToastContainer } from './components/UI/Toast'
import Dashboard from './pages/Dashboard'
import Participants from './pages/Participants'
import Calculation from './pages/Calculation'
import Batches from './pages/Batches'
import Exports from './pages/Exports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/participants" element={<Participants />} />
            <Route path="/calculation" element={<Calculation />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/exports" element={<Exports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </Router>
  )
}
