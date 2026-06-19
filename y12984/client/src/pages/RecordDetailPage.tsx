import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Layout, Button, Descriptions, Tag, Space, Row, Col, Card,
  Input, Select, Form, Table, Modal, message, Spin, Divider,
  Typography, Popconfirm, Tooltip, Alert
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, SaveOutlined, SafetyOutlined,
  WarningOutlined, CheckCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import {
  ReportRecord, Anomaly, Permission,
  ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS,
  MIGRATION_STATUS_LABELS, MIGRATION_STATUS_COLORS,
  ANOMALY_STATUS_LABELS, ANOMALY_STATUS_COLORS,
  AnomalyStatus, MigrationStatus, NextAction
} from '../types';
import { recordApi, anomalyApi, permissionApi } from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function RecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<ReportRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingAnomaly, setEditingAnomaly] = useState<Anomaly | null>(null);
  const [anomalyForm] = Form.useForm();
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permForm] = Form.useForm();

  const loadRecord = async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const r = await recordApi.get(Number(recordId));
      setRecord(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const handleSaveAnomaly = async () => {
    if (!editingAnomaly) return;
    const values = await anomalyForm.validateFields();
    try {
      await anomalyApi.update(editingAnomaly.id, values);
      message.success('已保存处理意见');
      setEditingAnomaly(null);
      loadRecord();
    } catch (e: any) {
      message.error('保存失败');
    }
  };

  const handleMigrationStatusChange = async (status: MigrationStatus) => {
    try {
      await recordApi.updateMigrationStatus(Number(recordId), status);
      message.success('迁移状态已更新');
      loadRecord();
    } catch (e) {
      message.error('更新失败');
    }
  };

  const handleAddPermission = async () => {
    const values = await permForm.validateFields();
    try {
      await permissionApi.create(Number(recordId), values);
      message.success('权限已补录，迁移状态可能已自动更新');
      setPermModalOpen(false);
      permForm.resetFields();
      loadRecord();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleDeletePermission = async (id: number) => {
    try {
      await permissionApi.remove(id);
      message.success('已删除');
      loadRecord();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const anomalyColumns = [
    {
      title: '异常类型',
      dataIndex: 'anomaly_type',
      width: 120,
      render: (v: keyof typeof ANOMALY_TYPE_LABELS) => (
        <Tag color={ANOMALY_TYPE_COLORS[v]} style={{ padding: '2px 10px', fontSize: 13 }}>
          {ANOMALY_TYPE_LABELS[v]}
        </Tag>
      )
    },
    {
      title: '级别',
      dataIndex: 'severity',
      width: 80,
      render: (v: string) =>
        v === 'error'
          ? <Tag color="red" icon={<WarningOutlined />}>严重</Tag>
          : <Tag color="orange">警告</Tag>
    },
    {
      title: '异常描述',
      dataIndex: 'description',
      width: 260,
      render: (v: string) => <Text strong>{v}</Text>
    },
    {
      title: '下一步操作',
      dataIndex: 'next_action',
      width: 110,
      render: (v: NextAction, record: Anomaly) => (
        <Tooltip title={
          v === '补材料'
            ? '请BI分析师补充相关材料（备份凭证、权限文档等）'
            : v === '改口径'
            ? '请研发团队调整规则口径或技术实现'
            : '待相关人员确认后再决定'
        }>
          <Tag color={v === '补材料' ? '#1677ff' : v === '改口径' ? '#722ed1' : '#faad14'}>
            {v}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: AnomalyStatus) => (
        <Tag color={ANOMALY_STATUS_COLORS[v]}>{ANOMALY_STATUS_LABELS[v]}</Tag>
      )
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, a: Anomaly) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => {
          setEditingAnomaly(a);
          anomalyForm.setFieldsValue({
            next_action: a.next_action,
            handling_opinion: a.handling_opinion,
            status: a.status,
            source_details: a.source_details
          });
        }}>
          编辑
        </Button>
      )
    }
  ];

  const permColumns = [
    { title: '权限项', dataIndex: 'permission_name', width: 180 },
    { title: '被授权人', dataIndex: 'grantee', width: 120 },
    { title: '授权人', dataIndex: 'granted_by', width: 120 },
    {
      title: '授权时间',
      dataIndex: 'granted_at',
      width: 180,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) =>
        v === 'active' ? <Tag color="green">有效</Tag> : <Tag>已撤销</Tag>
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, p: Permission) => (
        <Popconfirm title="确定删除该权限？" onConfirm={() => handleDeletePermission(p.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )
    }
  ];

  const backupGap = record?.anomalies.find((a) => a.anomaly_type === 'backup_gap');

  if (loading && !record) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => record && navigate(`/runs/${record.run_id}`)}>
              返回列表
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              报表详情：{record?.report_name}
            </Title>
          </Space>
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {backupGap && backupGap.status !== 'resolved' && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
              message={
                <span>
                  <b>备份缺口校验未通过</b> — 此报表因备份问题被拦截，研发团队可查看下方明细判断
                </span>
              }
              description={
                <div>
                  <Paragraph style={{ margin: '4px 0' }}>
                    <b>下一步操作：</b>
                    <Tag color="#1677ff" style={{ marginLeft: 6 }}>{backupGap.next_action}</Tag>
                  </Paragraph>
                  <Paragraph style={{ margin: '4px 0' }}>
                    <b>建议处理意见：</b>{backupGap.handling_opinion || '（请在下方异常列表中点击「编辑」补充）'}
                  </Paragraph>
                </div>
              }
            />
          )}

          <div className="card-block">
            <h3 className="section-title">基本信息</h3>
            <Row gutter={24}>
              <Col span={16}>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="报表名称">{record?.report_name}</Descriptions.Item>
                  <Descriptions.Item label="表名">{record?.table_name}</Descriptions.Item>
                  <Descriptions.Item label="列数">{record?.column_count}</Descriptions.Item>
                  <Descriptions.Item label="行数">{record?.row_count?.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="原始大小">{record?.original_size_mb} MB</Descriptions.Item>
                  <Descriptions.Item label="压缩后大小">{record?.compressed_size_mb} MB</Descriptions.Item>
                  <Descriptions.Item label="压缩率">
                    {record && record.compression_ratio < 0.3
                      ? <Text type="warning">{(record.compression_ratio * 100).toFixed(2)}%（偏低）</Text>
                      : `${((record?.compression_ratio || 0) * 100).toFixed(2)}%`}
                  </Descriptions.Item>
                  <Descriptions.Item label="是否有备份">
                    {record?.backup_exists
                      ? <Tag color="green" icon={<CheckCircleOutlined />}>是</Tag>
                      : <Tag color="red" icon={<WarningOutlined />}>否</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="来源系统">{record?.source_system || '-'}</Descriptions.Item>
                  <Descriptions.Item label="负责人">{record?.owner || <Text type="secondary">未分配</Text>}</Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={8}>
                <Card size="small" title="迁移状态" extra={<SafetyOutlined />}>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Tag
                      color={record ? MIGRATION_STATUS_COLORS[record.migration_status] : '#bfbfbf'}
                      style={{ fontSize: 16, padding: '6px 16px' }}
                    >
                      {record ? MIGRATION_STATUS_LABELS[record.migration_status] : '-'}
                    </Tag>
                  </div>
                  <Divider style={{ margin: '10px 0' }} />
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <div>• 权限清单补录后自动从「未开始」→「进行中」</div>
                    <div>• 存在未解决严重异常时建议标记为「已阻塞」</div>
                    <div>• 全部完成后手动标记为「已完成」</div>
                  </div>
                  <Select
                    style={{ width: '100%', marginTop: 10 }}
                    size="small"
                    placeholder="手动调整状态"
                    value={undefined}
                    onChange={handleMigrationStatusChange}
                    options={[
                      { value: 'not_started', label: '未开始' },
                      { value: 'in_progress', label: '进行中' },
                      { value: 'completed', label: '已完成' },
                      { value: 'blocked', label: '已阻塞' }
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </div>

          <div className="card-block">
            <h3 className="section-title">异常明细（含来源和处理意见）</h3>
            <p className="hint-text" style={{ marginBottom: 12 }}>
              点击「编辑」可调整下一步操作、补充处理意见或标记已解决。处理意见会体现在导出报告中，供研发团队查阅。
            </p>
            <Table
              rowKey="id"
              columns={anomalyColumns}
              dataSource={record?.anomalies || []}
              pagination={false}
              expandable={{
                expandedRowRender: (a: Anomaly) => (
                  <div style={{ padding: '4px 12px', background: '#fafafa', borderRadius: 4 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ marginBottom: 6 }}>
                          <Text type="secondary"><InfoCircleOutlined /> 来源详情（数据来源/校验规则）：</Text>
                        </div>
                        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {a.source_details || '（未填写）'}
                        </Paragraph>
                      </Col>
                      <Col span={12}>
                        <div style={{ marginBottom: 6 }}>
                          <Text type="secondary"><InfoCircleOutlined /> 处理意见（BI分析师→研发团队）：</Text>
                        </div>
                        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {a.handling_opinion || '（未填写，点击编辑补充）'}
                        </Paragraph>
                      </Col>
                    </Row>
                  </div>
                ),
                rowExpandable: () => true,
                defaultExpandAllRows: true
              }}
            />
          </div>

          <div className="card-block">
            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
              <Col>
                <h3 className="section-title" style={{ margin: 0 }}>权限清单</h3>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setPermModalOpen(true)}
                >
                  补录权限
                </Button>
              </Col>
            </Row>
            <p className="hint-text" style={{ marginBottom: 12 }}>
              补录权限后，迁移状态将自动从「未开始」更新为「进行中」。
            </p>
            <Table
              rowKey="id"
              columns={permColumns}
              dataSource={record?.permissions || []}
              pagination={false}
              locale={{ emptyText: '暂无权限记录，请点击右上角补录' }}
              size="middle"
            />
          </div>
        </div>
      </Content>

      <Modal
        title="编辑异常处理意见"
        open={!!editingAnomaly}
        onCancel={() => setEditingAnomaly(null)}
        onOk={handleSaveAnomaly}
        width={640}
        okText="保存"
        cancelText="取消"
      >
        <Form form={anomalyForm} layout="vertical">
          <Form.Item
            label="下一步操作"
            name="next_action"
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select
              options={[
                { value: '补材料', label: '补材料（BI分析师补充凭证/文档）' },
                { value: '改口径', label: '改口径（研发调整规则/实现）' },
                { value: '待确认', label: '待确认（需双方沟通）' }
              ]}
            />
          </Form.Item>
          <Form.Item label="处理状态" name="status">
            <Select
              options={[
                { value: 'pending', label: '待处理' },
                { value: 'processing', label: '处理中' },
                { value: 'resolved', label: '已解决' }
              ]}
            />
          </Form.Item>
          <Form.Item label="来源详情（数据来源/校验规则说明）" name="source_details">
            <TextArea rows={3} placeholder="如：来源系统xxx，校验规则为近7天全量备份..." />
          </Form.Item>
          <Form.Item
            label="处理意见（会出现在给研发团队的导出报告中，请写清楚原因和建议）"
            name="handling_opinion"
          >
            <TextArea rows={4} placeholder="研发团队只看报告时，也应该能理解为什么被拦下来..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="补录权限"
        open={permModalOpen}
        onCancel={() => { setPermModalOpen(false); permForm.resetFields(); }}
        onOk={handleAddPermission}
        okText="保存"
        cancelText="取消"
      >
        <Form form={permForm} layout="vertical">
          <Form.Item label="权限项" name="permission_name" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如：SELECT on table xxx / 报表查看权限" />
          </Form.Item>
          <Form.Item label="被授权人" name="grantee" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如：zhangsan / 研发团队" />
          </Form.Item>
          <Form.Item label="授权人" name="granted_by" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如：lisi / BI分析师" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
