import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout.js";
import LedgerList from "@/pages/LedgerList.js";
import LedgerDetail from "@/pages/LedgerDetail.js";
import ImportPage from "@/pages/ImportPage.js";
import MigrationBackup from "@/pages/MigrationBackup.js";
import ExportPage from "@/pages/ExportPage.js";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LedgerList />} />
          <Route path="/ledger/:id" element={<LedgerDetail />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/migration" element={<MigrationBackup />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
