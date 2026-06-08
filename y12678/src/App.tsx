import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ViewSnapshotPage from "@/pages/ViewSnapshotPage";
import RecordPage from "@/pages/RecordPage";
import CollisionPage from "@/pages/CollisionPage";
import TracePage from "@/pages/TracePage";
import ConsistencyPage from "@/pages/ConsistencyPage";

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ViewSnapshotPage />} />
          <Route path="/records" element={<RecordPage />} />
          <Route path="/collision" element={<CollisionPage />} />
          <Route path="/trace" element={<TracePage />} />
          <Route path="/consistency" element={<ConsistencyPage />} />
          <Route path="*" element={<ViewSnapshotPage />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
