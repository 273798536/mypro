import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Navbar from "@/components/Navbar"
import Workspace from "@/pages/Workspace"
import Anomalies from "@/pages/Anomalies"
import Compare from "@/pages/Compare"
import { useEffect } from "react"
import { useEnvelopeStore } from "@/store"

export default function App() {
  const loadFromStorage = useEnvelopeStore((s) => s.loadFromStorage)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <Router>
      <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Workspace />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}
