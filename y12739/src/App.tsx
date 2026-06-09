import React, { useState } from 'react';
import { Layout, Tabs, Typography, Space, Tag, Button } from 'antd';
import { AppProvider, useApp } from './context/AppContext';
import TransitionTableView from './components/TransitionTableView';
import StateTransitionChart from './components/StateTransitionChart';
import ConclusionPanel from './components/ConclusionPanel';
import SamplePanel from './components/SamplePanel';
import ConstraintConfigPanel from './components/ConstraintConfigPanel';
import ExtrapolationPanel from './components/ExtrapolationPanel';
import HandoverView from './components/HandoverView';
import ExportReport from './components/ExportReport';
import ScoringRecordPanel from './components/ScoringRecordPanel';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const AppInner: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeKey, setActiveKey] = useState('main');

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          justifyContent: 'space-between',
        }}
      >
        <Space>
          <Title level={4} style={{ margin: 0 }}>动态规划转移表 - 学生错题分析系统</Title>
          {state.student && (
            <Space>
              <Tag color="blue">{state.student.name}</Tag>
              <Tag color="geekblue">{state.student.grade}年级</Tag>
              <Tag color="purple">层级 {state.student.level}</Tag>
              {state.currentSampleId && <Tag>样例 {state.currentSampleId}</Tag>}
            </Space>
          )}
        </Space>
        <Space>
          {!state.student && (
            <Text type="warning">尚未加载数据，请在下方"样例与工具"标签页中加载样例</Text>
          )}
          <Button
            danger
            size="small"
            onClick={() => {
              if (confirm('确定要清空所有本地数据吗？')) dispatch({ type: 'CLEAR' });
            }}
          >
            清空数据
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: 16 }}>
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={[
            {
              key: 'main',
              label: '转移表主视图（图·表·文一致）',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <SamplePanel />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <TransitionTableView />
                  </div>
                  <StateTransitionChart />
                  <ConclusionPanel />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <ExtrapolationPanel />
                  </div>
                </div>
              ),
            },
            {
              key: 'scoring',
              label: '评分记录（晚到提示）',
              children: <ScoringRecordPanel />,
            },
            {
              key: 'constraints',
              label: '约束规则（参数联动校验）',
              children: <ConstraintConfigPanel />,
            },
            {
              key: 'handover',
              label: '月底转交（突出不可用记录）',
              children: <HandoverView />,
            },
            {
              key: 'export',
              label: '导出报告',
              children: <ExportReport />,
            },
          ]}
        />
      </Content>
    </Layout>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <ConfigLocale>
      <AppInner />
    </ConfigLocale>
  </AppProvider>
);

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const ConfigLocale: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
);

export default App;
