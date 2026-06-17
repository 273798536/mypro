import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Review } from "./pages/Review";
import { Versions } from "./pages/Versions";
import { Reports } from "./pages/Reports";
import { Import } from "./pages/Import";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="review" element={<Review />} />
          <Route path="versions" element={<Versions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="import" element={<Import />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
