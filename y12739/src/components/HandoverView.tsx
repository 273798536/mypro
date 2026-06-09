import React from 'react';
import { Card, Table, Tag, Space, Alert, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useApp } from '../context/AppContext';

const { Text } = Typography;

interface UnusableItem {
  type: 'scoring' | 'conclusion' | 'violation';
  title: string;
  reason: string;
  severity: 'error' | 'warning';
  detail?: string;
}

const HandoverView: React.FC = () => {
  const { state } = useApp();
  const { lateScorings, conclusions, validationResult, wrongQuestions } = state;

  const unusableItems: UnusableItem[] = [];

  lateScorings.forEach((sr) => {
    const wq = wrongQuestions.find((q) => q.questionId === sr.questionId);
    unusableItems.push({
      type: 'scoring',
      title: `评分记录不可用：${wq?.questionTitle ?? sr.questionId}`,
      reason: `评分晚到 ${sr.lateDays} 天，超过阈值 3 天，基于此记录的结论均存疑`,
      severity: 'warning',
      detail: `评分人：${sr.graderName || '未完成'}，预期时间：${sr.expectedAt ? new Date(sr.expectedAt).toLocaleDateString() : '未知'}${sr.gradedAt ? `，实际评分：${new Date(sr.gradedAt).toLocaleDateString()}` : ''}`,
    });
  });

  conclusions
    .filter((c) => c.status === 'suspicious' || c.status === 'invalid')
    .forEach((c) => {
      unusableItems.push({
        type: 'conclusion',
        title: `结论存疑/失效：${c.title}`,
        reason: c.invalidReason ?? '未指定原因',
        severity: c.status === 'invalid' ? 'error' : 'warning',
        detail: c.content,
      });
    });

  validationResult?.violations
    .filter((v) => v.severity === 'error' || v.severity === 'warning')
    .forEach((v) => {
      unusableItems.push({
        type: 'violation',
        title: `约束违反：${v.ruleName}`,
        reason: v.message,
        severity: v.severity === 'error' ? 'error' : 'warning',
        detail: `建议：${v.suggestedAction}`,
      });
    });

  const columns: ColumnsType<UnusableItem> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t) => {
        if (t === 'scoring') return <Tag color="orange">评分记录</Tag>;
        if (t === 'conclusion') return <Tag color="red">分析结论</Tag>;
        return <Tag color="purple">约束冲突</Tag>;
      },
    },
    {
      title: '项目',
      dataIndex: 'title',
      key: 'title',
      render: (t, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{t}</Text>
          {r.detail && <Text type="secondary" style={{ fontSize: 12 }}>{r.detail}</Text>}
        </Space>
      ),
    },
    {
      title: '不可用原因',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (s) => (
        <Tag color={s === 'error' ? 'red' : 'orange'}>
          {s === 'error' ? '必须处理' : '建议复核'}
        </Tag>
      ),
    },
  ];

  const total = conclusions.length;
  const valid = conclusions.filter((c) => c.status === 'valid').length;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type={unusableItems.length === 0 ? 'success' : 'warning'}
            showIcon
            message={
              unusableItems.length === 0
                ? '所有记录均可用，可放心转交'
                : `共检测到 ${unusableItems.length} 条不可用/存疑记录，转交前请重点处理`
            }
          />
          <div>
            <Space>
              <Tag color="green">有效结论 {valid}/{total}</Tag>
              <Tag color="orange">晚到评分 {lateScorings.length} 条</Tag>
              <Tag color="red">
                约束违反 {(validationResult?.violations ?? []).filter((v) => v.severity === 'error').length} 条
              </Tag>
            </Space>
          </div>
        </Space>
      </Card>

      <Card
        size="small"
        title={
          <Space>
            <span>月底转交清单 - 不可用记录（重点关注）</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              学生更关心哪些记录不能用，而不是系统有多少菜单
            </Text>
          </Space>
        }
      >
        {unusableItems.length === 0 ? (
          <div style={{ color: '#52c41a', padding: '16px 0', textAlign: 'center' }}>
            🎉 当前没有不可用记录，所有数据状态良好
          </div>
        ) : (
          <Table
            rowKey={(r, idx) => `${r.type}-${idx}`}
            columns={columns}
            dataSource={unusableItems}
            pagination={false}
            size="small"
            bordered
          />
        )}
      </Card>
    </div>
  );
};

export default HandoverView;
