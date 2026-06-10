import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Input, Select, Modal, Form, InputNumber,
  Timeline, Descriptions, Divider, Alert, message, Popconfirm
} from 'antd';
import {
  SearchOutlined, EyeOutlined, CheckOutlined, CloseOutlined,
  FileTextOutlined, HistoryOutlined, ReloadOutlined, SafetyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTests, getTestHistory, reviewTest, exportData, getStatusFlow } from '../api.js';

const conclusionColor = {
  '通过': 'green', '不通过': 'red', '待确认': 'orange'
};

const statusMap = {
  IMPORTED: { label: '已导入', color: 'default' },
  UNDER_REVIEW: { label: '复核中', color: 'processing' },
  CONFIRMED: { label: '已确认', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
  REPORTED: { label: '已报告', color: 'purple' }
};

function TestList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [statusFlow, setStatusFlow] = useState({});

  const [reviewVisible, setReviewVisible] = useState(false);
  const [current, setCurrent] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState([]);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    getTests({ status, keyword }).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getStatusFlow().then(setStatusFlow);
  }, []);

  useEffect(() => { load(); }, [status]);

  const openReview = (record) => {
    setCurrent(record);
    form.setFieldsValue({
      to_status: record.result_status === 'IMPORTED' ? 'UNDER_REVIEW'
        : record.result_status === 'UNDER_REVIEW' ? 'CONFIRMED'
        : record.result_status === 'REJECTED' ? 'UNDER_REVIEW'
        : record.result_status === 'CONFIRMED' ? 'REPORTED' : null,
      test_value: record.test_value,
      limit_value: record.limit_value,
      conclusion: record.conclusion,
      reviewer: '',
      review_reason: '',
      review_comment: ''
    });
    setReviewVisible(true);
  };

  const openHistory = (id) => {
    getTestHistory(id).then(h => { setHistory(h); setHistoryVisible(true); });
  };

  const handleReview = async () => {
    try {
      const values = await form.validateFields();
      await reviewTest(current.id, values);
      message.success('复核操作已记录');
      setReviewVisible(false);
      load();
    } catch (e) {
      if (e?.response?.data?.error) message.error(e.response.data.error);
    }
  };

  const nextOptions = (cur) => {
    const allowed = statusFlow[cur]?.next || [];
    return allowed.map(k => ({ value: k, label: statusMap[k]?.label || k }));
  };

  const columns = [
    { title: '批次号', dataIndex: 'batch_no', width: 130, render: v => <code>{v}</code> },
    { title: '试剂名称', dataIndex: 'reagent_name', width: 110 },
    { title: '规格', dataIndex: 'specification', width: 130, ellipsis: true },
    { title: '检测项目', dataIndex: 'test_item', width: 150 },
    { title: '检测值', dataIndex: 'test_value', width: 100,
      render: (v, r) => v != null ? <strong>{v}</strong> : '-' },
    { title: '限值', dataIndex: 'limit_value', width: 100,
      render: (v, r) => v != null ? `≤ ${v}` : '-' },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '结论', dataIndex: 'conclusion', width: 100,
      render: v => <Tag color={conclusionColor[v] || 'default'}>{v}</Tag> },
    { title: '状态', dataIndex: 'result_status', width: 100,
      render: v => {
        const s = statusMap[v] || { label: v, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      } },
    { title: '复核人', dataIndex: 'reviewer', width: 90 },
    { title: '更新时间', dataIndex: 'updated_at', width: 160,
      render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '操作', width: 200, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r.id)}>历史</Button>
          {(statusFlow[r.result_status]?.next?.length || 0) > 0 && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openReview(r)}>复核</Button>
          )}
        </Space>
      ) }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Alert
        type="info" showIcon
        message="操作流程：导入 → 复核中（可修改检测值/限值，记录修正原因）→ 已确认 → 已报告（导出）"
        description="每次复核均自动记录状态变更、数值变更及修正原因，可随时点击「历史」查看完整留痕。导出CSV内容与页面完全一致。"
      />

      <Card
        title={
          <Space>
            <SafetyOutlined />
            农药残留批次追踪
          </Space>
        }
        extra={
          <Space>
            <Select value={status} onChange={setStatus} style={{ width: 140 }}
                    options={[
                      { value: 'ALL', label: '全部状态' },
                      { value: 'IMPORTED', label: '已导入' },
                      { value: 'UNDER_REVIEW', label: '复核中' },
                      { value: 'CONFIRMED', label: '已确认' },
                      { value: 'REJECTED', label: '已驳回' },
                      { value: 'REPORTED', label: '已报告' }
                    ]} />
            <Input allowClear prefix={<SearchOutlined />} placeholder="批次号/试剂名/检测项"
                   value={keyword} onChange={e => setKeyword(e.target.value)}
                   onPressEnter={load} style={{ width: 240 }} />
            <Button icon={<SearchOutlined />} onClick={load}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
            <Popconfirm title="确认导出CSV报告？导出内容与当前页面数据一致"
                        onConfirm={() => { exportData('csv'); message.success('报告已导出'); }}>
              <Button icon={<FileTextOutlined />} type="primary">导出CSV</Button>
            </Popconfirm>
          </Space>
        }
      >
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
               pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
               size="middle" scroll={{ x: 1400 }} />
      </Card>

      <Modal open={reviewVisible} onCancel={() => setReviewVisible(false)}
             title="复核操作（将记录完整历史留痕）" width={640}
             footer={[
               <Button key="cancel" onClick={() => setReviewVisible(false)}>取消</Button>,
               <Button key="ok" type="primary" onClick={handleReview}>确认提交</Button>
             ]}>
        {current && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="批次号"><code>{current.batch_no}</code></Descriptions.Item>
              <Descriptions.Item label="试剂">{current.reagent_name}</Descriptions.Item>
              <Descriptions.Item label="检测项" span={2}>{current.test_item}</Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={statusMap[current.result_status]?.color}>{statusMap[current.result_status]?.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前结论">
                <Tag color={conclusionColor[current.conclusion]}>{current.conclusion}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">复核信息（带 * 为必填）</Divider>

            <Form form={form} layout="vertical">
              <Form.Item label="变更到状态" name="to_status" rules={[{ required: true }]}>
                <Select options={nextOptions(current.result_status)} />
              </Form.Item>

              <Form.Item label="复核人" name="reviewer" rules={[{ required: true, message: '请输入复核人姓名' }]}>
                <Input placeholder="例如：张工程师" />
              </Form.Item>

              <Divider orientation="left" plain style={{ padding: 0 }}>
                数据修正（如无变化可留空，系统自动对比并记录差异）
              </Divider>

              <Space.Compact style={{ width: '100%' }}>
                <Form.Item label="检测值" name="test_value" style={{ width: '50%' }}>
                  <InputNumber style={{ width: '100%' }} step="0.0001" placeholder="修改后检测值" />
                </Form.Item>
                <Form.Item label="限值" name="limit_value" style={{ width: '50%' }}>
                  <InputNumber style={{ width: '100%' }} step="0.0001" placeholder="修改后限值" />
                </Form.Item>
              </Space.Compact>

              <Form.Item label="结论（自动按检测值与限值计算，可手动覆盖）" name="conclusion">
                <Select options={[
                  { value: '通过', label: '通过' },
                  { value: '不通过', label: '不通过' },
                  { value: '待确认', label: '待确认' }
                ]} />
              </Form.Item>

              <Divider orientation="left" plain style={{ padding: 0 }}>原因与意见</Divider>

              <Form.Item label="修正原因（为什么修改？反应条件变化？数据补录？）"
                         name="review_reason"
                         rules={[{ required: true, message: '请填写修正原因，便于追溯' }]}>
                <Input.TextArea rows={2} placeholder="例如：反应条件改变导致限值调整为0.015" />
              </Form.Item>

              <Form.Item label="复核意见" name="review_comment">
                <Input.TextArea rows={2} placeholder="可选，详细复核说明" />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      <Modal open={historyVisible} onCancel={() => setHistoryVisible(false)}
             title="历史追踪记录" width={720} footer={null}>
        {history.length > 0 ? (
          <Timeline mode="left" className="trace-timeline">
            {history.map((h, idx) => (
              <Timeline.Item
                key={h.id}
                label={dayjs(h.created_at).format('YYYY-MM-DD HH:mm:ss')}
                color={h.to_status === 'REJECTED' ? 'red'
                      : h.to_status === 'CONFIRMED' ? 'green'
                      : h.to_status === 'REPORTED' ? 'purple' : 'blue'}
              >
                <div>
                  <Space>
                    <Tag color={statusMap[h.from_status]?.color}>{h.from_label}</Tag>
                    →
                    <Tag color={statusMap[h.to_status]?.color}>{h.to_label}</Tag>
                    <span style={{ color: '#666' }}>复核人：{h.reviewer || '未知'}</span>
                  </Space>
                  {(h.old_value !== h.new_value) && (
                    <div style={{ marginTop: 8, color: '#555' }}>
                      数值变更：
                      <code style={{ background: '#fff1f0', color: '#cf1322', padding: '0 4px' }}>
                        {h.old_value ?? '空'}
                      </code>
                      →
                      <code style={{ background: '#f6ffed', color: '#389e0d', padding: '0 4px' }}>
                        {h.new_value ?? '空'}
                      </code>
                    </div>
                  )}
                  {(h.old_conclusion !== h.new_conclusion) && (
                    <div style={{ marginTop: 4, color: '#555' }}>
                      结论变更：
                      <Tag color={conclusionColor[h.old_conclusion]}>{h.old_conclusion}</Tag>
                      →
                      <Tag color={conclusionColor[h.new_conclusion]}>{h.new_conclusion}</Tag>
                    </div>
                  )}
                  {h.review_reason && (
                    <div style={{ marginTop: 8 }}>
                      <strong>修正原因：</strong>{h.review_reason}
                    </div>
                  )}
                  {h.review_comment && (
                    <div style={{ marginTop: 4, color: '#666' }}>
                      <strong>复核意见：</strong>{h.review_comment}
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Alert type="info" showIcon message="暂无历史记录" />
        )}
      </Modal>
    </Space>
  );
}

export default TestList;
