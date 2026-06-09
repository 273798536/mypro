import React from 'react';
import { Table, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useApp } from '../context/AppContext';
import type { DPState } from '../types';

const levelColor = (v: number) => {
  if (v >= 0.75) return 'green';
  if (v >= 0.5) return 'blue';
  if (v >= 0.25) return 'orange';
  return 'red';
};

const TransitionTableView: React.FC = () => {
  const { state } = useApp();
  const { transitionTable, wrongQuestions } = state;

  const columns: ColumnsType<DPState> = [
    {
      title: '知识点',
      dataIndex: 'knowledgePointName',
      key: 'knowledgePointName',
      width: 160,
    },
    {
      title: '掌握度',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      render: (v: number, record) => (
        <Space>
          <Tag color={levelColor(v)}>{v}</Tag>
          <span style={{ color: '#666' }}>{record.label}</span>
        </Space>
      ),
    },
    {
      title: '关联错题数',
      key: 'wrongCount',
      width: 100,
      render: (_v, record) => {
        const count = wrongQuestions.filter((wq) =>
          wq.knowledgePointIds.includes(record.knowledgePointId)
        ).length;
        return <Tag color={count > 0 ? 'volcano' : 'default'}>{count} 道</Tag>;
      },
    },
    {
      title: '错题详情',
      key: 'details',
      render: (_v, record) => {
        const list = wrongQuestions.filter((wq) =>
          wq.knowledgePointIds.includes(record.knowledgePointId)
        );
        if (list.length === 0) return <span style={{ color: '#999' }}>无</span>;
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {list.map((wq) => (
              <li key={wq.id} style={{ marginBottom: 4 }}>
                <div>
                  <strong>{wq.questionTitle}</strong>
                  <Tag style={{ marginLeft: 6 }} color="red">
                    {wq.wrongReason}
                  </Tag>
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  学生答案：{wq.studentAnswer} | 正确答案：{wq.correctAnswer}
                  {wq.isCalculationError && (
                    <Tag style={{ marginLeft: 6 }} color="orange">计算错误</Tag>
                  )}
                </div>
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      title: '最近更新',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 140,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>动态规划转移表 - 知识点掌握状态</h3>
        <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
          表中每一行对应一个知识点的当前掌握度（DP状态），掌握度取值：0=未掌握 / 0.25=初步了解 / 0.5=基本掌握 / 0.75=熟练掌握 / 1=完全掌握
        </div>
      </div>
      <Table
        rowKey="knowledgePointId"
        columns={columns}
        dataSource={transitionTable?.states ?? []}
        pagination={false}
        size="small"
        bordered
      />
    </div>
  );
};

export default TransitionTableView;
