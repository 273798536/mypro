import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import AlertList from './pages/AlertList';
import StudentDetail from './pages/StudentDetail';
import AlertEdit from './pages/AlertEdit';
import History from './pages/History';
import Export from './pages/Export';
import { useAppStore } from './store';
import 'dayjs/locale/zh-cn';

const App: React.FC = () => {
  const { loadAll, loading, loadError } = useAppStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (loadError) message.error(`加载数据失败：${loadError}`);
  }, [loadError]);
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1E3A5F',
          borderRadius: 8,
        },
      }}
    >
      <Router>
        <Layout>
          <Spin spinning={loading} tip="正在从服务端加载数据...">
            <Routes>
              <Route path="/" element={<AlertList />} />
              <Route path="/student/:id" element={<StudentDetail />} />
              <Route path="/student/:id/edit" element={<AlertEdit />} />
              <Route path="/history" element={<History />} />
              <Route path="/export" element={<Export />} />
            </Routes>
          </Spin>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;
