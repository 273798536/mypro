import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Expenditures from "@/pages/Expenditures"
import ExpenditureDetail from "@/pages/ExpenditureDetail"
import Invoices from "@/pages/Invoices"
import Approvals from "@/pages/Approvals"
import Disclosures from "@/pages/Disclosures"
import Reports from "@/pages/Reports"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenditures" element={<Expenditures />} />
          <Route path="/expenditures/:id" element={<ExpenditureDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/disclosures" element={<Disclosures />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  )
}
