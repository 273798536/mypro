import React from 'react';
import { Layout, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { AppProvider } from './context/AppContext';
import DataImportPanel from './components/DataImportPanel';
import SummaryPanel from './components/SummaryPanel';
import FilterPanel from './components/FilterPanel';
import TorqueChart from './components/TorqueChart';
import JumpDiagnosisPanel from './components/JumpDiagnosisPanel';
import DataTable from './components/DataTable';
import DetailModal from './components/DetailModal';
import ExportModal from './components/ExportModal';
import GuideModal from './components/GuideModal';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  return (
    <AppProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#1890ff', fontSize: 24 }} />
            电机扭矩参数回放
            <span style={{ fontSize: 12, fontWeight: 'normal', color: '#999', marginLeft: 12 }}>
              v1.0.0 · 交接友好版
            </span>
          </Title>
        </Header>

        <Content style={{ padding: '16px 24px' }}>
          <DataImportPanel />
          <SummaryPanel />
          <FilterPanel />
          <TorqueChart />
          <JumpDiagnosisPanel />
          <DataTable />
        </Content>

        <DetailModal />
        <ExportModal />
        <GuideModal />
      </Layout>
    </AppProvider>
  );
};

export default App;
