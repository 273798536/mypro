import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Workbench from "@/pages/Workbench";
import History from "@/pages/History";
import Notification from "@/components/Notification";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/history" element={<History />} />
      </Routes>
      <Notification />
    </Router>
  );
}
