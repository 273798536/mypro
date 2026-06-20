import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Dashboard from '@/pages/Dashboard'
import RunDetail from '@/pages/RunDetail'
import { useFunnelStore } from '@/store'
import { seedData } from '@/seed'

function SeedInitializer() {
  const { addRun, checkRunExists, deduplicateRuns } = useFunnelStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    deduplicateRuns()
    seedData.forEach((run) => {
      if (!checkRunExists(run.run_id)) {
        addRun(run)
      }
    })
  }, [])

  return null
}

export default function App() {
  return (
    <Router>
      <SeedInitializer />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/run/:runId" element={<RunDetail />} />
      </Routes>
    </Router>
  )
}
