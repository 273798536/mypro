import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import CalendarPage from './pages/CalendarPage';
import DataPage from './pages/DataPage';
import ScenariosPage from './pages/ScenariosPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}