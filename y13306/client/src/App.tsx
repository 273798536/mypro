import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  FileTextOutlined,
  BarChartOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/',
    icon: <FileTextOutlined />,
    label: <Link to="/">评测记录</Link>,
  },
];

function App() {
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            background: '#002140',
          }}
        >
          🩺 病历问答灰度对比
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 500 }}>
            病历问答灰度对比系统
          </span>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Routes>
            <Route path="/" element={<ListPage />} />
            <Route path="/detail/:id" element={<DetailPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
