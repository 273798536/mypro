import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import RecordList from "@/pages/RecordList";
import RecordDetail from "@/pages/RecordDetail";
import RecordForm from "@/pages/RecordForm";
import Statistics from "@/pages/Statistics";
import Lineage from "@/pages/Lineage";
import Anomaly from "@/pages/Anomaly";
import DataImport from "@/pages/DataImport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/records" element={<RecordList />} />
          <Route path="/records/new" element={<RecordForm />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/lineage" element={<Lineage />} />
          <Route path="/anomaly" element={<Anomaly />} />
          <Route path="/import" element={<DataImport />} />
        </Route>
      </Routes>
    </Router>
  );
}
