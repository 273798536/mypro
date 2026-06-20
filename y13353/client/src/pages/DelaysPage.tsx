import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Space, Tag, Table, Modal, Form, Input, Select,
  message, Typography, Row, Col
} from 'antd';
import {
  AlertOutlined, CheckOutlined, ClockCircleOutlined,
  ArrowRightOutlined, PlusOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { delaysApi, tasksApi } from '../api';
import { FeatureDelay, EvalTask } from '../types';
import StatusBadge from '../components/StatusBadge';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const DelaysPage: React.FC = () => {
  const navigate = useNavigate();
  const [delays, setDelays] = useState<FeatureDelay[]>([]);
  const [tasks, setTasks] = useState<EvalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>();
  const [createModal, setCreateModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; delay: FeatureDelay | null }>({
    visible: false, delay: null
  });
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
    loadTasks();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await delaysApi.getAll({ status: statusFilter });
      setDelays(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await tasksApi.getTasks({ limit: 100 });
      setTasks(res.data.tasks);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await delaysApi.create({
        ...values,
        status: 'pending'
      });
      message.success('特征迟到已记录');
      setCreateModal(false);
      form.resetFields();
      loadData();
      loadTasks();
    } catch (e) {
      message.error('创建失败');
    }
  };

  const handleConfirm = async (values: any) => {
    if (!confirmModal.delay) return;
    try {
      await delaysApi.confirm(confirmModal.delay.id, {
        confirmed_by: localStorage.getItem('currentUser') || '未知用户',
        ...values
      });
      message.success('已确认特征迟到原因和影响');
      setConfirmModal({ visible: false, delay: null });
      form.resetFields();
      loadData();
    } catch (e) {
      message.error('确认失败');
    }
  };

  const handleResolve = async (delay: FeatureDelay) => {
    Modal.confirm({
      title: '确认标记为已解决？',
      content: `特征「${delay.feature_name}」已按时到达，将标记为已解决。相关任务状态可能会更新。`,
      onOk: async () => {
        try {
          await delaysApi.resolve(delay.id, {
            actual_date: dayjs().format('YYYY-MM-DD'),
            confirmed_by: localStorage.getItem('currentUser') || '未知用户'
          });
          message.success('已解决特征迟到');
          loadData();
          loadTasks();
        } catch (e) {
          message.error('操作失败');
        }
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'confirmed': return 'blue';
      case 'resolved': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <StatusBadge status={status} type="delay" />
    },
    {
      title: '特征名称',
      dataIndex: 'feature_name',
      key: 'feature_name',
      render: (text: string, record: FeatureDelay) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.task_name && <Tag color="blue" style={{ marginTop: 4 }}>{record.task_name}</Tag>}
        </Space>
      )
    },
    {
      title: '期望日期',
      dataIndex: 'expected_date',
      key: 'expected_date',
      width: 120
    },
    {
      title: '实际日期',
      dataIndex: 'actual_date',
      key: 'actual_date',
      width: 120,
      render: (d: string | null) => d || <Text type="secondary">—</Text>
    },
    {
      title: '疑似原因',
      dataIndex: 'suspected_reason',
      key: 'suspected_reason',
      render: (t: string | null) => t || <Text type="secondary">待确认</Text>
    },
    {
      title: '影响范围',
      dataIndex: 'impact_scope',
      key: 'impact_scope',
      render: (t: string | null, record: FeatureDelay) => (
        <Space direction="vertical" size={0}>
          <span>{t || <Text type="secondary">待确认</Text>}</span>
          {record.affected_samples && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              影响 {record.affected_samples} 个样本
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '确认人',
      dataIndex: 'confirmed_by',
      key: 'confirmed_by',
      width: 100,
      render: (t: string | null) => t || <Text type="secondary">—</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: FeatureDelay) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => setConfirmModal({ visible: true, delay: record })}
            >
              确认
            </Button>
          )}
          {record.status === 'confirmed' && (
            <Button
              type="primary"
              size="small"
              icon={<ClockCircleOutlined />}
              onClick={() => handleResolve(record)}
            >
              标记解决
            </Button>
          )}
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/tasks/${record.task_id}`)}
          >
            关联任务
          </Button>
        </Space>
      )
    }
  ];

  const stats = {
    pending: delays.filter(d => d.status === 'pending').length,
    confirmed: delays.filter(d => d.status === 'confirmed').length,
    resolved: delays.filter(d => d.status === 'resolved').length
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">特征迟到管理</h1>
        <Space>
          <Select
            placeholder="筛选状态"
            style={{ width: 140 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="pending">待确认</Option>
            <Option value="confirmed">已确认</Option>
            <Option value="resolved">已解决</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            报告特征迟到
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card className="stat-card" style={{ borderTop: '3px solid #fa8c16' }}>
            <div className="stat-value" style={{ color: '#fa8c16' }}>{stats.pending}</div>
            <div className="stat-label">待确认</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card" style={{ borderTop: '3px solid #1890ff' }}>
            <div className="stat-value" style={{ color: '#1890ff' }}>{stats.confirmed}</div>
            <div className="stat-label">已确认原因</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card" style={{ borderTop: '3px solid #52c41a' }}>
            <div className="stat-value" style={{ color: '#52c41a' }}>{stats.resolved}</div>
            <div className="stat-label">已解决</div>
          </Card>
        </Col>
      </Row>

      {stats.pending > 0 && (
        <Card
          style={{ marginBottom: 20, background: '#fff7e6', border: '1px solid #ffd591' }}
          bodyStyle={{ padding: '12px 20px' }}
        >
          <Space>
            <AlertOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
            <Text strong style={{ color: '#d46b08' }}>
              有 {stats.pending} 个特征迟到待确认原因和影响范围，相关评测结果已暂停计算
            </Text>
          </Space>
        </Card>
      )}

      <Card
        title={
          <Space>
            <AlertOutlined />
            特征迟到列表
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={delays}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="报告特征迟到"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="task_id"
            label="关联任务"
            rules={[{ required: true, message: '请选择关联任务' }]}
          >
            <Select placeholder="选择关联的评测任务">
              {tasks.map(t => (
                <Option key={t.id} value={t.id}>
                  {t.name} ({t.model_version})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="feature_name"
            label="特征名称"
            rules={[{ required: true, message: '请输入特征名称' }]}
          >
            <Input placeholder="如 user_profile_v2_feature" />
          </Form.Item>
          <Form.Item
            name="expected_date"
            label="期望到达日期"
            rules={[{ required: true, message: '请选择期望日期' }]}
          >
            <Input type="date" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="affected_samples" label="影响样本数">
                <Input type="number" placeholder="大约影响多少样本" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="suspected_reason" label="疑似原因">
            <TextArea rows={2} placeholder="请描述疑似原因..." />
          </Form.Item>
          <Form.Item name="impact_scope" label="影响范围">
            <TextArea rows={2} placeholder="请描述影响范围..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交</Button>
              <Button onClick={() => { setCreateModal(false); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="确认特征迟到原因和影响"
        open={confirmModal.visible}
        onCancel={() => setConfirmModal({ visible: false, delay: null })}
        footer={null}
        width={600}
      >
        {confirmModal.delay && (
          <div>
            <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Tag color="orange">待确认</Tag>
                  <Text strong>{confirmModal.delay.feature_name}</Text>
                </Space>
                <Text type="secondary">期望日期: {confirmModal.delay.expected_date}</Text>
              </Space>
            </Card>
            <Form
              form={form}
              onFinish={handleConfirm}
              layout="vertical"
              initialValues={{
                suspected_reason: confirmModal.delay.suspected_reason || '',
                impact_scope: confirmModal.delay.impact_scope || '',
                affected_samples: confirmModal.delay.affected_samples
              }}
            >
              <Form.Item
                name="suspected_reason"
                label="疑似原因"
                rules={[{ required: true, message: '请填写疑似原因' }]}
              >
                <TextArea rows={2} placeholder="请详细说明原因..." />
              </Form.Item>
              <Form.Item
                name="impact_scope"
                label="影响范围"
                rules={[{ required: true, message: '请填写影响范围' }]}
              >
                <TextArea rows={2} placeholder="请详细说明影响范围..." />
              </Form.Item>
              <Form.Item name="affected_samples" label="影响样本数">
                <Input type="number" placeholder="受影响的样本数量" />
              </Form.Item>
              <Alert
                message="确认后，该特征迟到状态将变为「已确认」，但评测结果仍会暂停计算直到标记为解决。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">确认</Button>
                  <Button onClick={() => setConfirmModal({ visible: false, delay: null })}>取消</Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DelaysPage;
