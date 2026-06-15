import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import GisPoints from "@/pages/GisPoints";
import PublicList from "@/pages/PublicList";
import Review from "@/pages/Review";
import Complaints from "@/pages/Complaints";
import History from "@/pages/History";
import Delivery from "@/pages/Delivery";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<GisPoints />} />
          <Route path="/public-list" element={<PublicList />} />
          <Route path="/review" element={<Review />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/history" element={<History />} />
          <Route path="/delivery" element={<Delivery />} />
        </Route>
      </Routes>
    </Router>
  );
}
