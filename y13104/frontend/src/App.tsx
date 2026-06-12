import { Routes, Route, Link } from 'react-router-dom';
import SheetList from './pages/SheetList';
import UploadPage from './pages/UploadPage';
import ReviewDashboard from './pages/ReviewDashboard';
import RowsPage from './pages/RowsPage';

export default function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            分段回归批量验算
          </Link>
        </h1>
        <nav className="nav">
          <Link to="/">参数表列表</Link>
          <Link to="/upload">上传参数表</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<SheetList />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/sheets/:id/review" element={<ReviewDashboard />} />
        <Route path="/sheets/:id/rows" element={<RowsPage />} />
      </Routes>
    </div>
  );
}
