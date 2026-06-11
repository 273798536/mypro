import { Layout, Menu } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  PictureOutlined,
  FileExcelOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import AnnotationPage from './pages/AnnotationPage';
import ReportPage from './pages/ReportPage';
import StatisticsPage from './pages/StatisticsPage';
import ImportPage from './pages/ImportPage';
import SamplesPage from './pages/SamplesPage';

const { Header, Content, Sider } = Layout;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/annotation', icon: <PictureOutlined />, label: '图像标注（日常入口）' },
    { key: '/report', icon: <ExperimentOutlined />, label: '菌种活性报告' },
    { key: '/samples', icon: <FileExcelOutlined />, label: '样本清单' },
    { key: '/import', icon: <DashboardOutlined />, label: '数据导入' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '分组统计（月底/课前）' }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <h1 className="app-title">发酵菌种活性报告系统</h1>
        <span style={{ color: '#aaa', fontSize: 13 }}>以试剂批号为主线，图表/明细/下载同一数据来源</span>
      </Header>
      <Layout>
        <Sider width={240} style={{ background: '#fff', borderRight: '1px solid #eee' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0, paddingTop: 12 }}
          />
        </Sider>
        <Content className="content-wrapper">
          <Routes>
            <Route path="/" element={<AnnotationPage />} />
            <Route path="/annotation" element={<AnnotationPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
