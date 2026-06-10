import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import BalancePage from "@/pages/BalancePage";
import RecordsPage from "@/pages/RecordsPage";
import ReviewPage from "@/pages/ReviewPage";
import RetestPage from "@/pages/RetestPage";
import StudentView from "@/pages/StudentView";
import { useApp } from "@/store/useApp";

function Boot() {
  const initSample = useApp((s) => s.initSample);
  useEffect(() => {
    initSample();
  }, [initSample]);
  return null;
}

export default function App() {
  return (
    <Router>
      <Boot />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/balance" element={<BalancePage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/review/:batchId" element={<ReviewPage />} />
          <Route path="/retest" element={<RetestPage />} />
          <Route path="/student/:batchId" element={<StudentView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
