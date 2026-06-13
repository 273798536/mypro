import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ReplayPage from './pages/ReplayPage'
import CausalChainPage from './pages/CausalChainPage'
import RecalcPage from './pages/RecalcPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ReplayPage />} />
        <Route path="/causal-chain" element={<CausalChainPage />} />
        <Route path="/recalc" element={<RecalcPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
