import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Samples from './pages/Samples/Samples';
import SampleDetail from './pages/Samples/SampleDetail';
import Withdrawals from './pages/Withdrawals/Withdrawals';
import WithdrawalDetail from './pages/Withdrawals/WithdrawalDetail';
import Report from './pages/Report/Report';
import Timeline from './pages/Timeline/Timeline';

function App() {
  const loadFromStorage = useAppStore((state) => state.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Layout title="总览仪表盘" subtitle="作文批改误判回放系统">
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/samples"
          element={
            <Layout title="样本表" subtitle="所有作文样本及版本管理">
              <Samples />
            </Layout>
          }
        />
        <Route
          path="/samples/:id"
          element={
            <Layout title="样本详情" subtitle="版本对比与历史记录">
              <SampleDetail />
            </Layout>
          }
        />
        <Route
          path="/withdrawals"
          element={
            <Layout title="撤回记录" subtitle="所有撤回操作及影响分析">
              <Withdrawals />
            </Layout>
          }
        />
        <Route
          path="/withdrawals/:id"
          element={
            <Layout title="撤回详情" subtitle="影响链路与关联样本">
              <WithdrawalDetail />
            </Layout>
          }
        />
        <Route
          path="/report"
          element={
            <Layout title="回放报告" subtitle="误判分析与行动指引">
              <Report />
            </Layout>
          }
        />
        <Route
          path="/timeline"
          element={
            <Layout title="历史时间线" subtitle="完整的变更历史记录">
              <Timeline />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
