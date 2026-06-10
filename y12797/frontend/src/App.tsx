import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, theme, Typography } from 'antd';
import {
  ImportOutlined,
  AuditOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import ImportPage from './pages/ImportPage';
import ReviewPage from './pages/ReviewPage';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';
import RecordDetailPage from './pages/RecordDetailPage';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

export default function App() {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const location = useLocation();

  const menuKey = location.pathname.startsWith('/review')
    ? '/review'
    : location.pathname.startsWith('/report')
    ? '/report'
    : location.pathname.startsWith('/history') || location.pathname.startsWith('/record')
    ? '/history'
    : '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={220} style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={5} style={{ margin: 0, color: '#1677ff' }}>
            <ThunderboltOutlined /> 酶促反应底物换算
          </Title>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Enzyme Substrate Conversion</div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[menuKey]}
          style={{ borderRight: 0, marginTop: 8 }}
          items={[
            { key: '/', icon: <ImportOutlined />, label: <Link to="/">导入 / 新建</Link> },
            { key: '/review', icon: <AuditOutlined />, label: <Link to="/review">复核工作台</Link> },
            { key: '/report', icon: <FilePdfOutlined />, label: <Link to="/report">报告预览 / 导出</Link> },
            { key: '/history', icon: <HistoryOutlined />, label: <Link to="/history">历史记录</Link> },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            {menuKey === '/' && '导入 / 新建处理记录'}
            {menuKey === '/review' && '复核工作台（温度单位·谱峰重叠·称量精度）'}
            {menuKey === '/report' && '报告预览 / 导出（普通话解释 + 追溯链）'}
            {menuKey === '/history' && '历史记录（持久化 / 重启不丢失）'}
          </Title>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 20,
              minHeight: 'calc(100vh - 140px)',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={<ImportPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/review/:id" element={<ReviewPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/report/:id" element={<ReportPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/record/:id" element={<RecordDetailPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
