import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { Toast } from "@/components/Toast";
import { useRampStore } from "@/store";
import Home from "@/pages/Home";
import RampDetail from "@/pages/RampDetail";
import MapView from "@/pages/MapView";

export default function App() {
  const toast = useRampStore((s) => s.toast);
  const clearToast = useRampStore((s) => s.clearToast);

  return (
    <Router>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ramps/:id" element={<RampDetail />} />
          <Route path="/map" element={<MapView />} />
        </Routes>
      </Shell>
      <Toast message={toast} onClose={clearToast} />
    </Router>
  );
}
