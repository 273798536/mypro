import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WorkspaceLayout />} />
      </Routes>
    </Router>
  );
}
