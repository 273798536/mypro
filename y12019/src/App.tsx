import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Equipment from "@/pages/Equipment"
import Contracts from "@/pages/Contracts"
import Accrual from "@/pages/Accrual"
import Exceptions from "@/pages/Exceptions"
import Reports from "@/pages/Reports"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/accrual" element={<Accrual />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  )
}
