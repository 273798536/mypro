import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, message, Tooltip, Descriptions, List, Divider, Statistic, Row, Col, Alert
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  LinkOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { runApi, Run } from '../api';

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [dupCheck, setDupCheck] = useState<any>(null);
  const [form] = Form.useForm();

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await runApi.list();
      setRuns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleRunIdBlur = async () => {
    const runId = form.getFieldValue('run_id');
    if (runId) {
      try {
        const result = await runApi.checkDuplicate(runId);
        setDupCheck(result.exists ? result : null);
      } catch (_) {
      }
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const params = {
        model_version: values.model_version,
        feature_set: values.feature_set?.split(',').map((s: string) => s.trim()).filter(Boolean) || []
      };
      await runApi.create({
        run_id: values.run_id,
        name: values.name,
        params_json: JSON.stringify(params),
        engineer: values.engineer || '评测-小唐',
        description: values.description || null,
        parent_run_id: values.parent_run_id || null
      });
      message.success('运行已创建');
      setCreateOpen(false);
      form.resetFields();
      setDupCheck(null);
      loadRuns();
    } catch (err: any) {
      message.error(err.response?.data?.error || '创建失败');
    }
  };

  const columns = [
    {
      title: '运行ID',
      dataIndex: 'run_id',
      key: 'run_id',
      render: (id: string, record: Run) => (
        <Space>
          <a onClick={() => navigate(`/run/${id}`)}>
            <Text strong>{id}</Text>
          </a>
          {record.parent_run_id && (
            <Tooltip title={`基于 ${record.parent_run_id}`}>
              <Tag icon={<LinkOutlined />} color="default">派生</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Run) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.description && <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>}
        </Space>
      )
    },
    {
      title: '评测工程师',
      dataIndex: 'engineer',
      key: 'engineer',
      width: 120,
      render: (e: string) => <Tag color="blue">{e}</Tag>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Run) => (
        <Space>
          <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => navigate(`/run/${record.run_id}`)}>
            详情
          </Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => navigate(`/compare?base=${record.parent_run_id || record.run_id}&compare=${record.run_id}`)} disabled={!record.parent_run_id}>
            对比
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行总数"
              value={runs.length}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="带派生链"
              value={runs.filter(r => r.parent_run_id).length}
              prefix={<LinkOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="可对比次数"
              value={runs.length >= 2 ? runs.length * (runs.length - 1) / 2 : 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="当前评测"
              value="小唐"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<Space><Title level={4} style={{ margin: 0 }}>运行记录</Title></Space>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建运行
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="换一组参数再跑时，接手同事要能看出哪一步让结果变化"
          description="每一次运行都关联特征快照。通过运行对比功能，可精确追踪是哪个特征快照的引入/修改导致了判定变化。"
        />
        <Table
          rowKey="run_id"
          columns={columns}
          dataSource={runs}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新建运行"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); setDupCheck(null); form.resetFields(); }}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="run_id" label="运行ID" rules={[{ required: true, message: '请输入运行ID' }]}>
            <Input placeholder="如: RUN-20240620-EXP" onBlur={handleRunIdBlur} />
          </Form.Item>

          {dupCheck && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
              message={
                <Space direction="vertical" size="small">
                  <Text strong>run_id "{dupCheck.original_run.run_id}" 已存在！请查看原始运行的特征快照。</Text>
                  <Text type="secondary">不是模糊警告，以下是原始记录：</Text>
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="原始名称">{dupCheck.original_run.name}</Descriptions.Item>
                    <Descriptions.Item label="创建人">{dupCheck.original_run.engineer}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{dayjs(dupCheck.original_run.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="关联特征快照">
                      <List
                        size="small"
                        dataSource={dupCheck.original_snapshots || []}
                        renderItem={(s: any) => (
                          <List.Item>
                            <Space>
                              <Tag color={s.is_temporary ? 'orange' : 'blue'}>{s.snapshot_id}</Tag>
                              <Text>{s.name}</Text>
                              <Text type="secondary">v{s.version}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Descriptions.Item>
                  </Descriptions>
                </Space>
              }
            />
          )}

          <Form.Item name="name" label="运行名称" rules={[{ required: true }]}>
            <Input placeholder="如: 实验模型 v3.4" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="engineer" label="评测工程师" initialValue="评测-小唐">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parent_run_id" label="父运行ID (可选)">
                <Input placeholder="基于哪个运行改的" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="model_version" label="模型版本">
                <Input placeholder="如: v3.4.0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="feature_set" label="特征快照ID (逗号分隔)">
                <Input placeholder="FS-2024-001, FS-2024-002" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="运行描述">
            <Input.TextArea rows={2} placeholder="简述这次跑的目的..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>创建</Button>
              <Button onClick={() => { setCreateOpen(false); setDupCheck(null); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
