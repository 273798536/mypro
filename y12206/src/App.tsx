import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Employees from "@/pages/Employees";
import Salary, { SalaryDetail } from "@/pages/Salary";
import Ratio from "@/pages/Ratio";
import Validation from "@/pages/Validation";
import Export from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/salary/:month" element={<SalaryDetail />} />
          <Route path="/ratio" element={<Ratio />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </Layout>
    </Router>
  );
}
