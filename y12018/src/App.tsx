import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import Home from "@/pages/Home";
import Detail from "@/pages/Detail";
import Correct from "@/pages/Correct";
import History from "@/pages/History";
import DownloadPage from "@/pages/Download";

export default function App() {
  return (
    <Router>
      <SidebarLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/detail/:id" element={<Detail />} />
          <Route path="/correct/:id" element={<Correct />} />
          <Route path="/history" element={<History />} />
          <Route path="/download" element={<DownloadPage />} />
        </Routes>
      </SidebarLayout>
    </Router>
  );
}
