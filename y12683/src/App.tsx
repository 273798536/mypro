import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import CollisionDetection from '@/pages/CollisionDetection';
import PointCloudSlices from '@/pages/PointCloudSlices';
import Calculator from '@/pages/Calculator';
import Parameters from '@/pages/Parameters';
import DataManagement from '@/pages/DataManagement';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<CollisionDetection />} />
          <Route path="/slices" element={<PointCloudSlices />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/parameters" element={<Parameters />} />
          <Route path="/data-management" element={<DataManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}
