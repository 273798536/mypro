import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Sidebar from "@/components/Sidebar"
import Workbench from "@/pages/Workbench"
import Compare from "@/pages/Compare"
import Report from "@/pages/Report"

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Workbench />} />
            <Route path="/compare/:id" element={<Compare />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
