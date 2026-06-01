import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';
import Home from "@/pages/Home";
import { useAppStore } from './store/useAppStore';

export default function App() {
  const loadMockData = useAppStore(state => state.loadMockData);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
