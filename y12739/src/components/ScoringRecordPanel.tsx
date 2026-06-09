import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, DatePicker, message, Space, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import type { ScoringRecord } from '../types';

const statusColor: Record<ScoringRecord['status'], string> = {
  pending: 'default',
  scored: 'green',
  late: 'orange',
  conflicted: 'red',
};

const statusText: Record<ScoringRecord['status'], string> = {
  pending: '待评分',
  scored: '已评分',
  late: '晚到',
  conflicted: '冲突',
};

const ScoringRecordPanel: React.FC = () => {
  const { state, updateScoring } = useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const columns: ColumnsType<ScoringRecord> = [
    {
      title: '题目',
      key: 'q',
      render: (_v, r) => {
        const wq = state.wrongQuestions.find((q) => q.questionId === r.questionId);
        return wq?.questionTitle ?? r.questionId;
      },
    },
    {
      title: '得分',
      key: 'score',
      render: (_v, r) => (
        <Space>
          <span style={{ fontWeight: 'bold' }}>{r.score}</span>
          <span style={{ color: '#999' }}>/ {r.fullScore}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: ScoringRecord['status'], r) => (
        <Space>
          <Tag color={statusColor[s]}>{statusText[s]}</Tag>
          {r.isLate && <Tag color="orange">晚到 {r.lateDays} 天</Tag>}
        </Space>
      ),
    },
    {
      title: '评分人',
      dataIndex: 'graderName',
      key: 'graderName',
      render: (v) => v || '—',
    },
    {
      title: '预期评分日',
      dataIndex: 'expectedAt',
      key: 'expectedAt',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    {
      title: '实际评分日',
      dataIndex: 'gradedAt',
      key: 'gradedAt',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    {
      title: '操作',
      key: 'op',
      render: (_v, r) => (
        <Space>
          <Button size="small" onClick={() => editRecord(r)}>补录/修正</Button>
        </Space>
      ),
    },
  ];

  const editRecord = (r: ScoringRecord) => {
    setEditingId(r.id);
    form.setFieldsValue({
      questionId: r.questionId,
      score: r.score,
      fullScore: r.fullScore,
      graderName: r.graderName,
      comment: r.comment,
      gradedAt: r.gradedAt ? dayjs(r.gradedAt) : null,
      expectedAt: r.expectedAt ? dayjs(r.expectedAt) : null,
    });
    setOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    if (!editingId) return;

    const now = Date.now();
    const gradedAtMs = values.gradedAt ? values.gradedAt.valueOf() : now;
    const expectedAtMs = values.expectedAt ? values.expectedAt.valueOf() : now;
    const lateMs = gradedAtMs - expectedAtMs;
    const lateDays = lateMs > 0 ? Math.ceil(lateMs / 86400000) : 0;
    const isLate = lateDays > 0;
    let status: ScoringRecord['status'] = values.score > 0 ? 'scored' : 'pending';
    if (isLate && lateDays >= 3) status = 'late';

    const prev = state.scoringRecords.find((r) => r.id === editingId);
    const updated: ScoringRecord = {
      ...prev!,
      score: values.score,
      fullScore: values.fullScore,
      graderName: values.graderName || '手动录入',
      graderId: values.graderName || 'manual',
      comment: values.comment,
      gradedAt: values.gradedAt ? values.gradedAt.toISOString() : new Date(now).toISOString(),
      expectedAt: values.expectedAt ? values.expectedAt.toISOString() : prev?.expectedAt ?? '',
      isLate,
      lateDays: isLate ? lateDays : undefined,
      status,
      previousScore: prev?.score,
    };

    const next = state.scoringRecords.map((r) => (r.id === editingId ? updated : r));
    updateScoring(next);
    setOpen(false);
    message.success(
      isLate
        ? `已补录评分（晚到${lateDays}天），系统将自动提示受影响的结论，不会静默覆盖旧结果`
        : '评分已更新，系统已联动重新计算'
    );
  };

  return (
    <div>
      <Alert
        style={{ marginBottom: 8 }}
        type="info"
        showIcon
        message='评分晚到保护：当补录的评分记录晚到超过阈值时，系统会将相关结论标记为"存疑"，不会直接覆盖原有结论'
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={state.scoringRecords}
        pagination={false}
        size="small"
        bordered
      />
      <Modal
        open={open}
        title="补录/修正评分（晚到记录会保留旧结果）"
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="questionId" label="题目ID">
            <Input disabled />
          </Form.Item>
          <Space>
            <Form.Item name="score" label="得分" rules={[{ required: true }]}>
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="fullScore" label="满分" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Form.Item name="graderName" label="评分人">
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="expectedAt" label="预期评分日" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="gradedAt" label="实际评分日" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
          </Space>
          <Form.Item name="comment" label="评语">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScoringRecordPanel;
