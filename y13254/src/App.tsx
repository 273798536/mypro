import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import { useStore } from "@/store";
import Home from "@/pages/Home";
import Locations from "@/pages/Locations";
import Materials from "@/pages/Materials";
import Consistency from "@/pages/Consistency";

export default function App() {
  useEffect(() => {
    void useStore.getState().loadAll();
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/consistency" element={<Consistency />} />
        </Routes>
      </Layout>
    </Router>
  );
}
