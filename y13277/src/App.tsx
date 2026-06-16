import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Trace from "@/pages/Trace";
import Supplement from "@/pages/Supplement";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/trace/:id" element={<Trace />} />
        <Route path="/supplement/:id" element={<Supplement />} />
      </Route>
    </Routes>
  );
}
