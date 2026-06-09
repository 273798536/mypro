import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import DraftDetail from "@/pages/DraftDetail";
import OperationView from "@/pages/OperationView";
import { useDraftStore } from "@/store/draftStore";
import { useEffect } from "react";

export default function App() {
  const { initStore, drafts } = useDraftStore();

  useEffect(() => {
    if (drafts.length === 0) initStore();
  }, [drafts.length, initStore]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/draft/:id" element={<DraftDetail />} />
        <Route path="/operation" element={<OperationView />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}
