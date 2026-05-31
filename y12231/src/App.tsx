import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Accounts from "@/pages/Accounts"
import Transactions from "@/pages/Transactions"
import Exceptions from "@/pages/Exceptions"
import Refund from "@/pages/Refund"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/refund" element={<Refund />} />
        </Route>
      </Routes>
    </Router>
  )
}
