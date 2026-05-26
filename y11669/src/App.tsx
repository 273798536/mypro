import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/pages/Dashboard'
import { Alerts } from './components/pages/Alerts'
import { DataSource } from './components/pages/DataSource'
import { Reports } from './components/pages/Reports'

function App() {
  return (
    <div className="w-full h-full">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/data-source" element={<DataSource />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </div>
  )
}

export default App
