import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import TimelinePage from "@/pages/TimelinePage";
import RecordDetailPage from "@/pages/RecordDetailPage";
import EditConclusionPage from "@/pages/EditConclusionPage";
import HistoryPage from "@/pages/HistoryPage";
import DownloadPage from "@/pages/DownloadPage";
import PerspectivePage from "@/pages/PerspectivePage";
import TestPage from "@/pages/TestPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TimelinePage />} />
          <Route path="/record/:id" element={<RecordDetailPage />} />
          <Route path="/record/:id/edit" element={<EditConclusionPage />} />
          <Route path="/record/:id/history" element={<HistoryPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/perspective" element={<PerspectivePage />} />
          <Route path="/test" element={<TestPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
