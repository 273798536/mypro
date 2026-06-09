import React from 'react';
import { Card, Button, List, Tag, Space, Alert } from 'antd';
import { useApp } from '../context/AppContext';
import { allSampleDatasets } from '../data/samples';

const SamplePanel: React.FC = () => {
  const { state, loadSample, recomputeAll } = useApp();

  const verifyConsistency = () => {
    if (!state.transitionTable) return { ok: false, reason: '转移表尚未计算' };
    const tableStateCount = state.transitionTable.states.length;
    const kpCount = state.knowledgePoints.length;
    if (tableStateCount !== kpCount) {
      return { ok: false, reason: `表中状态数(${tableStateCount})与知识点数(${kpCount})不一致` };
    }
    return { ok: true, reason: '图、表、文字三者数据源一致' };
  };

  const consistency = verifyConsistency();

  return (
    <Card
      size="small"
      title="可复现样例"
      extra={
        <Space>
          <Button onClick={recomputeAll} type="primary">
            重新计算转移表
          </Button>
        </Space>
      }
    >
      <Alert
        style={{ marginBottom: 12 }}
        type={consistency.ok ? 'success' : 'warning'}
        showIcon
        message="一致性校验"
        description={consistency.reason}
      />
      <List
        size="small"
        dataSource={allSampleDatasets}
        renderItem={(s) => {
          const active = state.currentSampleId === s.id;
          return (
            <List.Item
              actions={[
                <Button
                  key="load"
                  type={active ? 'default' : 'link'}
                  disabled={active}
                  onClick={() => loadSample(s)}
                >
                  {active ? '已加载' : '加载样例'}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {active && <Tag color="blue">当前样例</Tag>}
                    <strong>{s.name}</strong>
                  </Space>
                }
                description={
                  <div>
                    <div>{s.description}</div>
                    <div style={{ marginTop: 4 }}>
                      {s.expectedConclusions.map((e, i) => (
                        <Tag key={i} style={{ marginTop: 2 }}>预期：{e}</Tag>
                      ))}
                    </div>
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default SamplePanel;
