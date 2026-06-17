import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Card,
  Timeline,
  Table,
  Form,
  Radio,
  Button,
  Tag,
  Checkbox,
  Space,
  Row,
  Col,
  Descriptions,
  Input,
  Divider,
  Typography,
  message,
  Modal,
  Tooltip,
  Badge,
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  FileTextOutlined,
  AuditOutlined,
  DiffOutlined,
  MessageOutlined,
  UserOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import { trackApi, materialApi, reviewApi } from '@/api';
import type {
  Track,
  AudioMaterial,
  ReviewRecord,
  TrackNote,
  AuditLog,
  VersionDiff,
  ReviewDecision,
} from '@/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusColorMap: Record<string, string> = {
  pending: 'default',
  matching: 'processing',
  matched: 'success',
  mismatch: 'error',
  reviewing: 'warning',
  suspended: 'warning',
  approved: 'success',
  rejected: 'error',
};

const statusTextMap: Record<string, string> = {
  pending: '待处理',
  matching: '匹配中',
  matched: '已匹配',
  mismatch: '不匹配',
  reviewing: '复核中',
  suspended: '已挂起',
  approved: '已通过',
  rejected: '已驳回',
};

const evidenceItems = [
  { label: '原始音视频文件', key: 'originalFile' },
  { label: '时间码截图', key: 'timecodeScreenshot' },
  { label: '场记单扫描件', key: 'callSheet' },
  { label: '曲目说明文档', key: 'trackDoc' },
  { label: '演出节目单', key: 'programList' },
  { label: '其他证明材料', key: 'otherEvidence' },
];

const TrackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setLoading = useAppStore((state) => state.setLoading);
  const [track, setTrack] = useState<Track | null>(null);
  const [materials, setMaterials] = useState<AudioMaterial[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [notes, setNotes] = useState<TrackNote[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState('material');
  const [evidenceChecked, setEvidenceChecked] = useState<string[]>([]);
  const [suspendForm] = Form.useForm();
  const [noteForm] = Form.useForm();
  const [showVersionDiff, setShowVersionDiff] = useState(false);
  const [diffVersions, setDiffVersions] = useState<[number, number] | null>(null);
  const [versionDiffs, setVersionDiffs] = useState<VersionDiff[]>([]);

  useEffect(() => {
    if (id) {
      loadTrackData(id);
    }
  }, [id]);

  const loadTrackData = async (trackId: string) => {
    setLoading(true);
    try {
      const [trackData, materialsData, reviewsData] = await Promise.all([
        trackApi.findOne(trackId),
        materialApi.findByTrackId(trackId),
        reviewApi.findByTrackId(trackId),
      ]);
      setTrack(trackData);
      setMaterials(materialsData);
      setReviews(reviewsData);
      setNotes(trackData.notes || []);
      setAuditLogs(trackData.auditLogs || []);
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const activeMaterial = materials.find((m) => m.isActive);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDeviation = (deviation?: number) => {
    if (deviation === undefined) return '-';
    const sign = deviation >= 0 ? '+' : '';
    return `${sign}${deviation.toFixed(2)}s`;
  };

  const getDeviationColor = (deviation?: number) => {
    if (deviation === undefined) return 'default';
    const abs = Math.abs(deviation);
    if (abs <= 2) return 'success';
    if (abs <= 5) return 'warning';
    return 'error';
  };

  const handleEvidenceChange = (checkedValues: string[]) => {
    setEvidenceChecked(checkedValues);
  };

  const handleUploadNewVersion = () => {
    Modal.info({
      title: '上传新版本',
      content: '请在文件上传页面上传新版本材料',
      onOk: () => navigate('/upload'),
    });
  };

  const handleTimecodeCheck = async () => {
    message.loading({ content: '时码检测中...', key: 'timecode' });
    setTimeout(() => {
      message.success({ content: '时码检测完成，偏差在允许范围内', key: 'timecode' });
    }, 1500);
  };

  const handleExportCSV = () => {
    message.success('CSV导出已开始');
  };

  const handleActivateVersion = async (materialId: string) => {
    Modal.confirm({
      title: '激活此版本',
      content: '确定要将此版本设置为当前激活版本吗？',
      onOk: async () => {
        try {
          await materialApi.activate(materialId, {
            changedBy: '管理员',
            reason: '用户操作激活版本',
          });
          message.success('版本激活成功');
          if (id) loadTrackData(id);
        } catch (error) {
          message.error('激活失败');
        }
      },
    });
  };

  const handleShowVersionDiff = (v1: number, v2: number) => {
    setDiffVersions([v1, v2]);
    setVersionDiffs([
      { fieldName: 'fileName', oldValue: `track_${v1}.mp3`, newValue: `track_${v2}.mp3`, changeType: 'update' },
      { fieldName: 'duration', oldValue: 213, newValue: 215, changeType: 'update' },
      { fieldName: 'timecode', oldValue: '01:23:45', newValue: '01:23:47', changeType: 'update' },
      { fieldName: 'timecodeDeviation', oldValue: 1.5, newValue: 0.8, changeType: 'update' },
    ]);
    setShowVersionDiff(true);
  };

  const handleSuspendResolve = async (values: { decision: string; comment: string }) => {
    if (!id) return;
    try {
      setLoading(true);
      await reviewApi.resolveSuspend({
        trackId: id,
        reviewerId: '1',
        reviewerName: '管理员',
        decision: values.decision as Exclude<ReviewDecision, 'pass'>,
        comment: values.comment,
      });
      message.success('挂起处理完成');
      suspendForm.resetFields();
      loadTrackData(id);
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (values: { content: string }) => {
    if (!id) return;
    const newNote: TrackNote = {
      id: Date.now().toString(),
      trackId: id,
      content: values.content,
      createdBy: '1',
      createdByName: '管理员',
      createdAt: new Date().toISOString(),
      isActive: true,
      previousNoteId: notes[notes.length - 1]?.id,
    };
    setNotes([...notes, newNote]);
    noteForm.resetFields();
    message.success('备注添加成功');
  };

  const renderMaterialTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="材料信息" extra={<Tag color={activeMaterial ? 'success' : 'default'}>{activeMaterial ? '已关联' : '未关联'}</Tag>}>
        {activeMaterial ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={2} bordered size="middle">
              <Descriptions.Item label="文件名">{activeMaterial.fileName}</Descriptions.Item>
              <Descriptions.Item label="时长">{formatDuration(activeMaterial.duration)}</Descriptions.Item>
              <Descriptions.Item label="时码">{activeMaterial.timecode || '-'}</Descriptions.Item>
              <Descriptions.Item label="时码偏差">
                <Tag color={getDeviationColor(activeMaterial.timecodeDeviation)}>
                  {formatDeviation(activeMaterial.timecodeDeviation)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="匹配状态">
                <Tag color={activeMaterial.matchStatus === 'matched' ? 'success' : 'warning'}>
                  {activeMaterial.matchStatus === 'matched' ? '已匹配' : '待确认'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="置信度">
                <Progress value={activeMaterial.matchConfidence * 100} size="small" />
              </Descriptions.Item>
              <Descriptions.Item label="提交者">{activeMaterial.submittedBy}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{dayjs(activeMaterial.submittedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="版本" span={2}>V{activeMaterial.version} (当前激活版本)</Descriptions.Item>
            </Descriptions>

            <Divider />

            <div>
              <Title level={5} style={{ marginBottom: 16 }}>证据清单</Title>
              <Checkbox.Group
                options={evidenceItems}
                value={evidenceChecked}
                onChange={handleEvidenceChange}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
              />
            </div>

            <Divider />

            <Space wrap>
              <Button type="primary" icon={<UploadOutlined />} onClick={handleUploadNewVersion}>
                上传新版本
              </Button>
              <Button icon={<ClockCircleOutlined />} onClick={handleTimecodeCheck}>
                时码检测
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                导出CSV
              </Button>
            </Space>
          </Space>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
            <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Paragraph>暂无关联材料</Paragraph>
            <Button type="primary" icon={<UploadOutlined />} onClick={() => navigate('/upload')}>
              上传材料
            </Button>
          </div>
        )}
      </Card>
    </Space>
  );

  const renderVersionTab = () => (
    <Card title="版本历史" extra={<Text type="secondary">共 {materials.length} 个版本</Text>}>
      {materials.length > 0 ? (
        <Timeline
          mode="left"
          items={materials
            .sort((a, b) => b.version - a.version)
            .map((material, index) => ({
              color: material.isActive ? 'success' : 'blue',
              dot: material.isActive ? <CheckCircleOutlined /> : <HistoryOutlined />,
              children: (
                <Card
                  size="small"
                  style={{ marginBottom: 16 }}
                  extra={
                    <Space>
                      {material.isActive ? (
                        <Tag color="success">当前版本</Tag>
                      ) : (
                        <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleActivateVersion(material.id)}>
                          激活此版本
                        </Button>
                      )}
                      {index < materials.length - 1 && (
                        <Button type="link" size="small" icon={<DiffOutlined />} onClick={() => handleShowVersionDiff(material.version, materials[index + 1].version)}>
                          对比差异
                        </Button>
                      )}
                    </Space>
                  }
                  title={
                    <Space>
                      <Badge status={material.isActive ? 'success' : 'default'} />
                      <strong>版本 V{material.version}</strong>
                      <Tag color="blue">{material.sourceBatch}</Tag>
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Space>
                          <UserOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />
                          <Text>{material.submittedBy}</Text>
                        </Space>
                        <Space>
                          <ClockCircleOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />
                          <Text>{dayjs(material.submittedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                        </Space>
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="文件">{material.fileName}</Descriptions.Item>
                        <Descriptions.Item label="时长">{formatDuration(material.duration)}</Descriptions.Item>
                        <Descriptions.Item label="时码">{material.timecode || '-'}</Descriptions.Item>
                        <Descriptions.Item label="偏差">
                          <Tag color={getDeviationColor(material.timecodeDeviation)}>
                            {formatDeviation(material.timecodeDeviation)}
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>
                </Card>
              ),
            }))}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
          <HistoryOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <Paragraph>暂无版本历史</Paragraph>
        </div>
      )}

      <Modal
        title={`版本对比 V${diffVersions?.[0]} vs V${diffVersions?.[1]}`}
        open={showVersionDiff}
        onCancel={() => setShowVersionDiff(false)}
        footer={[
          <Button key="close" onClick={() => setShowVersionDiff(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        <Table
          dataSource={versionDiffs}
          rowKey="fieldName"
          pagination={false}
          columns={[
            { title: '字段', dataIndex: 'fieldName', key: 'fieldName', width: 150 },
            {
              title: `V${diffVersions?.[1]} (旧)`,
              dataIndex: 'oldValue',
              key: 'oldValue',
              render: (v) => <Text delete type="danger">{String(v)}</Text>,
            },
            {
              title: `V${diffVersions?.[0]} (新)`,
              dataIndex: 'newValue',
              key: 'newValue',
              render: (v) => <Text strong type="success">{String(v)}</Text>,
            },
            {
              title: '类型',
              dataIndex: 'changeType',
              key: 'changeType',
              width: 100,
              render: (v) => {
                const colorMap: Record<string, string> = {
                  create: 'success',
                  update: 'warning',
                  override: 'error',
                };
                return <Tag color={colorMap[v]}>{v}</Tag>;
              },
            },
          ]}
        />
      </Modal>
    </Card>
  );

  const renderReviewTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {track?.status === 'suspended' && (
        <Card
          title="挂起处理"
          extra={<Tag color="warning">需要处理</Tag>}
          style={{ borderColor: '#faad14' }}
        >
          <Form form={suspendForm} layout="vertical" onFinish={handleSuspendResolve}>
            <Form.Item
              name="decision"
              label="处理方式"
              rules={[{ required: true, message: '请选择处理方式' }]}
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="approve">
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>确认偏差可接受</span>
                    </Space>
                  </Radio>
                  <Radio value="reject">
                    <Space>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      <span>驳回重录</span>
                    </Space>
                  </Radio>
                  <Radio value="suspend">
                    <Space>
                      <WarningOutlined style={{ color: '#faad14' }} />
                      <span>保留挂起</span>
                    </Space>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="comment"
              label="处理说明"
              rules={[{ required: true, message: '请输入处理说明' }]}
            >
              <TextArea rows={3} placeholder="请详细说明处理原因..." />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                提交处理
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card title="复核记录" extra={<Text type="secondary">共 {reviews.length} 条记录</Text>}>
        {reviews.length > 0 ? (
          <Table
            dataSource={reviews}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            columns={[
              {
                title: '复核人',
                dataIndex: 'reviewerName',
                key: 'reviewerName',
                width: 120,
                render: (name) => (
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    {name}
                  </Space>
                ),
              },
              {
                title: '复核类型',
                dataIndex: 'reviewType',
                key: 'reviewType',
                width: 100,
                render: (type) => {
                  const typeMap: Record<string, string> = {
                    timecode: '时码复核',
                    quality: '质量复核',
                    note: '备注复核',
                    final: '最终复核',
                  };
                  return <Tag>{typeMap[type] || type}</Tag>;
                },
              },
              {
                title: '结论',
                dataIndex: 'decision',
                key: 'decision',
                width: 100,
                render: (decision) => {
                  const colorMap: Record<string, string> = {
                    approve: 'success',
                    reject: 'error',
                    suspend: 'warning',
                    pass: 'default',
                  };
                  const textMap: Record<string, string> = {
                    approve: '通过',
                    reject: '驳回',
                    suspend: '挂起',
                    pass: '放行',
                  };
                  return <Tag color={colorMap[decision]}>{textMap[decision]}</Tag>;
                },
              },
              { title: '复核意见', dataIndex: 'comment', key: 'comment' },
              {
                title: '时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 160,
                render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
              },
            ]}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
            <AuditOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Paragraph>暂无复核记录</Paragraph>
          </div>
        )}
      </Card>
    </Space>
  );

  const renderNoteTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="添加备注">
        <Form form={noteForm} layout="vertical" onFinish={handleAddNote}>
          <Form.Item
            name="content"
            rules={[{ required: true, message: '请输入备注内容' }]}
          >
            <TextArea rows={3} placeholder="请输入备注内容..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              添加备注
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="备注历史" extra={<Text type="secondary">共 {notes.length} 条记录</Text>}>
        {notes.length > 0 ? (
          <Timeline
            items={notes
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((note, index) => ({
                dot: <MessageOutlined />,
                children: (
                  <Card size="small" style={{ marginBottom: 12 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Space>
                          <Avatar size="small" icon={<UserOutlined />} />
                          <Text strong>{note.createdByName}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(note.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                      </Space>
                      <Paragraph style={{ margin: 0 }}>{note.content}</Paragraph>
                      {index < notes.length - 1 && (
                        <Tooltip title="查看与上一条的差异">
                          <Button type="link" size="small" icon={<DiffOutlined />} style={{ padding: 0 }}>
                            查看差异
                          </Button>
                        </Tooltip>
                      )}
                    </Space>
                  </Card>
                ),
              }))}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
            <MessageOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Paragraph>暂无备注</Paragraph>
          </div>
        )}
      </Card>
    </Space>
  );

  const renderAuditTab = () => (
    <Card title="审计日志" extra={<Text type="secondary">共 {auditLogs.length} 条记录</Text>}>
      {auditLogs.length > 0 ? (
        <Table
          dataSource={auditLogs}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: '操作',
              dataIndex: 'action',
              key: 'action',
              width: 150,
              render: (action) => <Tag color="blue">{action}</Tag>,
            },
            {
              title: '用户',
              dataIndex: 'userName',
              key: 'userName',
              width: 120,
              render: (name) => (
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {name}
                </Space>
              ),
            },
            {
              title: '时间',
              dataIndex: 'timestamp',
              key: 'timestamp',
              width: 160,
              render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
            },
            {
              title: '详情',
              dataIndex: 'details',
              key: 'details',
              render: (details) => (
                <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {details ? JSON.stringify(details) : '-'}
                </Text>
              ),
            },
          ]}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
          <AuditOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <Paragraph>暂无审计日志</Paragraph>
        </div>
      )}
    </Card>
  );

  const tabItems = [
    { key: 'material', label: '材料信息', children: renderMaterialTab() },
    { key: 'version', label: '版本历史', children: renderVersionTab() },
    { key: 'review', label: '复核记录', children: renderReviewTab() },
    { key: 'note', label: '备注历史', children: renderNoteTab() },
    { key: 'audit', label: '审计日志', children: renderAuditTab() },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                返回
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                <Space>
                  <Tag color="blue">#{track?.trackNo}</Tag>
                  {track?.title}
                </Space>
              </Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                - {track?.artist}
              </Text>
              <Tag color={statusColorMap[track?.status || 'pending']} style={{ marginLeft: 12 }}>
                {statusTextMap[track?.status || 'pending']}
              </Tag>
            </Space>
            {track?.latestNote && (
              <Alert
                type="info"
                showIcon
                message="最新备注"
                description={track.latestNote}
              />
            )}
          </Space>
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Space>
    </div>
  );
};

const Progress: React.FC<{ value: number; size?: 'default' | 'small' }> = ({ value, size = 'default' }) => {
  const getColor = (v: number) => {
    if (v >= 90) return '#52c41a';
    if (v >= 70) return '#faad14';
    return '#ff4d4f';
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: size === 'small' ? 80 : 120,
          height: size === 'small' ? 6 : 8,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: getColor(value),
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <Text style={{ fontSize: 12 }}>{value.toFixed(0)}%</Text>
    </div>
  );
};

const Alert: React.FC<{
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  description?: string;
  showIcon?: boolean;
}> = ({ type, message, description, showIcon }) => {
  const iconMap = {
    info: <FileTextOutlined />,
    success: <CheckCircleOutlined />,
    warning: <WarningOutlined />,
    error: <CloseCircleOutlined />,
  };
  const colorMap = {
    info: '#1677ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
  };
  return (
    <div
      style={{
        padding: '12px 16px',
        background: `${colorMap[type]}15`,
        border: `1px solid ${colorMap[type]}40`,
        borderRadius: 8,
        display: 'flex',
        gap: 12,
      }}
    >
      {showIcon && (
        <span style={{ color: colorMap[type], fontSize: 16, marginTop: 2 }}>
          {iconMap[type]}
        </span>
      )}
      <div>
        <div style={{ fontWeight: 500, color: colorMap[type] }}>{message}</div>
        {description && (
          <div style={{ color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{description}</div>
        )}
      </div>
    </div>
  );
};

const Avatar: React.FC<{ size?: 'small' | 'default' | 'large'; icon?: React.ReactNode; style?: React.CSSProperties }> = ({
  size = 'default',
  icon,
  style,
}) => {
  const sizeMap = { small: 24, default: 32, large: 40 };
  return (
    <div
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: '50%',
        background: '#1677ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: sizeMap[size] * 0.45,
        ...style,
      }}
    >
      {icon}
    </div>
  );
};

export default TrackDetailPage;
