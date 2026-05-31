import React from 'react';
import { Layout, Tabs, Badge, Space, Typography } from 'antd';
import {
  FileTextOutlined,
  ShoppingOutlined,
  CalculatorOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAppStore } from './store';
import ContractManagement from './components/ContractManagement';
import OrderManagement from './components/OrderManagement';
import SettlementCenter from './components/SettlementCenter';
import PaymentRequestModule from './components/PaymentRequestModule';
import DisputeCenter from './components/DisputeCenter';
import type { TabKey } from './types';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const { activeTab, setActiveTab, settlements } = useAppStore();

  const openIssuesCount = settlements.reduce(
    (sum, s) => sum + s.issues.filter((i) => i.status === 'open').length,
    0
  );

  const tabItems = [
    {
      key: 'contracts',
      label: (
        <Space>
          <FileTextOutlined />
          达人合同
        </Space>
      ),
      children: <ContractManagement />,
    },
    {
      key: 'orders',
      label: (
        <Space>
          <ShoppingOutlined />
          直播订单
        </Space>
      ),
      children: <OrderManagement />,
    },
    {
      key: 'settlement',
      label: (
        <Space>
          <CalculatorOutlined />
          费用清算
        </Space>
      ),
      children: <SettlementCenter />,
    },
    {
      key: 'payment',
      label: (
        <Space>
          <DollarOutlined />
          付款申请
        </Space>
      ),
      children: <PaymentRequestModule />,
    },
    {
      key: 'dispute',
      label: (
        <Space>
          <ExclamationCircleOutlined />
          争议备注
          {openIssuesCount > 0 && (
            <Badge
              count={openIssuesCount}
              size="small"
              color="red"
              offset={[2, -2]}
            />
          )}
        </Space>
      ),
      children: <DisputeCenter />,
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-white border-b px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <CalculatorOutlined className="text-white text-xl" />
          </div>
          <div>
            <Title level={4} className="!m-0">
              广告达人坑位费清算系统
            </Title>
            <p className="text-xs text-gray-500 !m-0">
              解决退货跨场、佣金重复、证据追溯难题
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Space className="text-sm text-gray-500">
            <Badge status="processing" text="实时数据" />
            <span>|</span>
            <span>当前用户：财务小李</span>
          </Space>
        </div>
      </Header>
      <Content>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={tabItems}
          className="px-0"
          size="large"
          tabBarStyle={{
            padding: '0 24px',
            margin: 0,
            background: 'white',
            borderBottom: '1px solid #f0f0f0',
          }}
        />
      </Content>
    </Layout>
  );
};

export default App;
