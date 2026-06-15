import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout/Layout';
import MaterialList from '@/pages/MaterialList/MaterialList';
import MaterialDetail from '@/pages/MaterialDetail/MaterialDetail';
import History from '@/pages/History/History';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MaterialList />} />
          <Route path="/detail/:id" element={<MaterialDetail />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}
