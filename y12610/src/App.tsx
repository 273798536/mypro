import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RecordList from "@/pages/RecordList";
import Editor from "@/pages/Editor";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RecordList />} />
        <Route path="/editor/:id" element={<Editor />} />
      </Routes>
    </Router>
  );
}
