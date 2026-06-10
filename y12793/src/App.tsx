import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Concentration from "@/pages/Concentration"
import Balance from "@/pages/Balance"
import Spectral from "@/pages/Spectral"
import Trace from "@/pages/Trace"

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/concentration" element={<Concentration />} />
          <Route path="/balance" element={<Balance />} />
          <Route path="/spectral" element={<Spectral />} />
          <Route path="/trace" element={<Trace />} />
        </Routes>
      </Layout>
    </Router>
  )
}
