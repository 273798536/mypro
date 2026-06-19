import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select,
  DatePicker, message, Card, Row, Col, Statistic
} from 'antd';
import {
  PlusOutlined, PlayCircleOutlined, EyeOutlined,
  ReloadOutlined, FileTextOutlined, WarningOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { sessionAPI, leakAPI, authAPI } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

const statusMap = {
  pending: { color: 'default', text: '待处理' },
  processing: { color: 'processing', text: '处理中' },
  waiting_confirm: { color: 'warning', text: '待确认' },
  completed: { color: 'success', text: '已完成' },
  error: { color: 'error', text: '异常' }
};

function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, processing: 0, waiting: 0, completed: 0 });
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadSessions();
    loadUsers();
  }, []);

  const loadSessions = async (params = {}) => {
    setLoading(true);
    try {
      const response = await sessionAPI.list(params);
      setSessions(response.data);
      calculateStats(response.data);
    } catch (error) {
      message.error('加载会话列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await authAPI.listUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('加载用户列表失败', error);
    }
  };

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      processing: data.filter(s => s.status === 'processing').length,
      waiting: data.filter(s => s.status === 'waiting_confirm').length,
      completed: data.filter(s => s.status === 'completed').length
    });
  };

  const handleCreate = async (values) => {
    try {
      await sessionAPI.create({
        ...values,
        original_result: {
          sample_stats: { total: 1000, positive: 150, negative: 850 },
          thresholds: { confidence: 0.8, recall: 0.7 }
        },
        current_result: {
          sample_stats: { total: 1000, positive: 150, negative: 850 },
          thresholds: { confidence: 0.8, recall: 0.7 }
        },
        page_snapshot: {
          filters: { dateRange: null, category: null },
          viewMode: 'table',
          selectedItems: []
        }
      });
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      loadSessions();
    } catch (error) {
      message.error(error.response?.data?.detail || '创建失败');
    }
  };

  const handleProcess = async (record) => {
    try {
      const response = await sessionAPI.process(record.id);
      message.success(response.data.message);
      loadSessions();
    } catch (error) {
      message.error(error.response?.data?.detail || '操作失败');
    }
  };

  const handleRerun = (record) => {
    Modal.confirm({
      title: '重跑会话',
      content: '是否保留历史人工修正记录？',
      okText: '保留并重跑',
      cancelText: '不保留',
      onOk: async () => {
        try {
          await sessionAPI.rerun(record.id, {
            reason: '手动触发重跑',
            preserve_corrections: true
          });
          message.success('重跑已开始');
          loadSessions();
        } catch (error) {
          message.error('重跑失败');
        }
      },
      onCancel: async () => {
        try {
          await sessionAPI.rerun(record.id, {
            reason: '手动触发重跑（不保留历史修正）',
            preserve_corrections: false
          });
          message.success('重跑已开始，历史修正已标记为覆盖');
          loadSessions();
        } catch (error) {
          message.error('重跑失败');
        }
      }
    });
  };

  const columns = [
    {
      title: '会话名称',
      dataIndex: 'session_name',
      key: 'session_name',
      render: (text, record) => (
        <Space>
          <a onClick={() => navigate(`/sessions/${record.id}`)}>{text}</a>
          {record.has_sample_leak && (
            <Tag color="red" icon={<WarningOutlined />}>样本泄漏</Tag>
          )}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const info = statusMap[status] || statusMap.pending;
        return <Tag color={info.color}>{info.text}</Tag>;
      },
      filters: Object.entries(statusMap).map(([key, value]) => ({
        text: value.text,
        value: key
      })),
      onFilter: (value, record) => record.status === value
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name'
    },
    {
      title: '处理人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      render: (text) => text || '-'
    },
    {
      title: '人工修正',
      dataIndex: 'corrections_count',
      key: 'corrections_count',
      render: (count) => count || 0
    },
    {
      title: '备注',
      dataIndex: 'comments_count',
      key: 'comments_count',
      render: (count) => count || 0
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/sessions/${record.id}`)}
          >
            详情
          </Button>
          {record.status === 'pending' && user.role !== 'scheduler' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleProcess(record)}
            >
              开始处理
            </Button>
          )}
          {record.status !== 'completed' && user.role !== 'scheduler' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRerun(record)}
            >
              重跑
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总会话数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="处理中" value={stats.processing} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待确认" value={stats.waiting} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="审查会话列表"
        extra={
          user.role !== 'scheduler' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              新建会话
            </Button>
          )
        }
      >
        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title="新建审查会话"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="session_name"
            label="会话名称"
            rules={[{ required: true, message: '请输入会话名称' }]}
          >
            <Input placeholder="例如：2024年Q1代码审查误判回放" />
          </Form.Item>
          
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="简要描述本次审查的目的和范围" />
          </Form.Item>
          
          <Form.Item name="batch_id" label="批次ID">
            <Input placeholder="关联的批次标识" />
          </Form.Item>
          
          <Form.Item name="assigned_to" label="分配给">
            <Select placeholder="选择处理人">
              {users.map(u => (
                <Option key={u.id} value={u.id}>{u.full_name} ({u.role})</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">创建</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SessionList;
