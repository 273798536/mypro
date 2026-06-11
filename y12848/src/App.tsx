import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import EthicsReviewBoard from './pages/EthicsReviewBoard';
import ReviewDetail from './pages/ReviewDetail';
import SupervisorReport from './pages/SupervisorReport';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ethics-review" element={<EthicsReviewBoard />} />
          <Route path="/ethics-review/:id" element={<ReviewDetail />} />
          <Route path="/supervisor-report" element={<SupervisorReport />} />
        </Routes>
      </Layout>
    </Router>
  );
}
