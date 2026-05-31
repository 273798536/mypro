import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Warnings from './pages/Warnings'
import Suppliers from './pages/Suppliers'
import Contracts from './pages/Contracts'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/warnings" replace />} />
          <Route path="/warnings" element={<Warnings />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/contracts" element={<Contracts />} />
        </Route>
      </Routes>
    </Router>
  )
}
