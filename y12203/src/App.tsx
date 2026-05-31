import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Claims from "@/pages/Claims";
import Contracts from "@/pages/Contracts";
import Calculation from "@/pages/Calculation";
import Statements from "@/pages/Statements";
import History from "@/pages/History";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="claims" element={<Claims />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="calculation" element={<Calculation />} />
          <Route path="statements" element={<Statements />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}
