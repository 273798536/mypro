import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RecordList from "./pages/RecordList";
import RecordDetail from "./pages/RecordDetail";
import ExceptionQueue from "./pages/ExceptionQueue";
import ImportDemo from "./pages/ImportDemo";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<RecordList />} />
          <Route path="/record/:id" element={<RecordDetail />} />
          <Route path="/exceptions" element={<ExceptionQueue />} />
          <Route path="/import" element={<ImportDemo />} />
        </Route>
      </Routes>
    </Router>
  );
}
