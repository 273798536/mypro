import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import AlertList from './pages/AlertList';
import StudentDetail from './pages/StudentDetail';
import AlertEdit from './pages/AlertEdit';
import History from './pages/History';
import Export from './pages/Export';
import 'dayjs/locale/zh-cn';

const App: React.FC = () => {
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
          <Routes>
            <Route path="/" element={<AlertList />} />
            <Route path="/student/:id" element={<StudentDetail />} />
            <Route path="/student/:id/edit" element={<AlertEdit />} />
            <Route path="/history" element={<History />} />
            <Route path="/export" element={<Export />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;
