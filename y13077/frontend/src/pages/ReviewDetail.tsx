import React, { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Spin,
  message,
  Card,
  Row,
  Col,
  Tabs,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Timeline,
  Statistic,
  Switch,
  Empty,
  Divider,
  List,
  Tooltip,
  Radio
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  SaveOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CameraOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  TagOutlined,
  AppstoreOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import {
  Review,
  Collision,
  CollisionType,
  CollisionSeverity,
  ViewConfig,
  statusTextMap,
  conclusionTextMap,
  collisionTypeTextMap,
  severityTextMap,
  severityColorMap,
  actionTextMap,
  ReviewHistory
} from '../types';
import { reviewApi } from '../services/api';
import CadViewer from '../components/CadViewer';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea: AntTextArea } = Input;

interface ExportFormData {
  format: 'pdf' | 'excel' | 'csv';
  includeHistory: boolean;
  includeCollisions: boolean;
  includeScreenshots: boolean;
}

const ReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Review | null>(null);
  const [activeTab, setActiveTab] = useState('collisions');
  const [remarkDebounceTimer, setRemarkDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [operatorRemark, setOperatorRemark] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [remarkModalVisible, setRemarkModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<CollisionType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<CollisionSeverity | 'all'>('all');
  const [viewConfigs, setViewConfigs] = useState<ViewConfig[]>([]);
  const [currentView, setCurrentView] = useState<ViewConfig | null>(null);
  const [histories, setHistories] = useState<ReviewHistory[]>([]);
  const [viewForm] = Form.useForm();
  const [remarkForm] = Form.useForm();
  const [exportForm] = Form.useForm<ExportFormData>();
  const [currentViewConfig, setCurrentViewConfig] = useState<Partial<ViewConfig>>({});

  useEffect(() => {
    if (id) {
      fetchDetail(id);
      fetchViewConfigs(id);
      fetchHistories(id);
    }
  }, [id]);

  const fetchDetail = async (reviewId: string) => {
    setLoading(true);
    try {
      const response = await reviewApi.getDetail(reviewId);
      const result = response.data;
      if (result.success && result.data) {
        setDetail(result.data);
        setOperatorRemark(result.data.operatorRemark || '');
      }
    } catch (error) {
      message.error('获取预审详情失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewConfigs = async (reviewId: string) => {
    try {
      const response = await reviewApi.getViewConfigs(reviewId);
      const result = response.data;
      if (result.success && result.data) {
        setViewConfigs(result.data);
      }
    } catch (error) {
      console.error('获取视图配置失败');
    }
  };

  const fetchHistories = async (reviewId: string) => {
    try {
      const response = await reviewApi.getHistories(reviewId);
      const result = response.data;
      if (result.success && result.data) {
        setHistories(result.data);
      }
    } catch (error) {
      console.error('获取历史记录失败');
    }
  };

  const handleRemarkChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setOperatorRemark(value);

    if (remarkDebounceTimer) {
      clearTimeout(remarkDebounceTimer);
    }

    const timer = setTimeout(async () => {
      try {
        const response = await reviewApi.update(id!, { operatorRemark: value });
        const result = response.data;
        if (result.success) {
          message.success('备注已同步保存');
          fetchDetail(id!);
          fetchHistories(id!);
        }
      } catch (error) {
        message.error('备注保存失败');
      }
    }, 1000);

    setRemarkDebounceTimer(timer);
  };

  const handleRunDetection = async () => {
    if (!id) return;
    setDetecting(true);
    try {
      const response = await reviewApi.runDetection(id);
      const result = response.data;
      if (result.success) {
        const data = result.data;
        message.success(
          `检测完成，发现${data.highCount}个高风险、${data.mediumCount}个中风险、${data.lowCount}个低风险异常`
        );
        fetchDetail(id);
        fetchHistories(id);
      }
    } catch (error) {
      message.error('检测失败');
    } finally {
      setDetecting(false);
    }
  };

  const handleConfirmCollision = async (collision: Collision, isConfirmed: boolean) => {
    try {
      const response = await reviewApi.confirmCollision(collision.id, {
        isConfirmed,
        confirmedBy: '运营主管',
        impactOnConclusion: isConfirmed ? collision.impactOnConclusion : ''
      });
      const result = response.data;
      if (result.success) {
        message.success(isConfirmed ? '已确认该异常' : '已取消确认');
        fetchDetail(id!);
        fetchHistories(id!);
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleExport = async (values: ExportFormData) => {
    if (!id) return;
    try {
      const response = await reviewApi.export(id, values);
      const blob = new Blob([response.data], {
        type: values.format === 'pdf'
          ? 'application/pdf'
          : values.format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      });
      const fileName = `${detail?.code || 'review'}_碰撞预审报告.${
        values.format === 'excel' ? 'xlsx' : values.format
      }`;
      saveAs(blob, fileName);
      message.success('导出成功');
      setExportModalVisible(false);
      exportForm.resetFields();
      fetchHistories(id);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleSaveView = async (values: any) => {
    if (!id) return;
    try {
      const viewData = {
        ...values,
        ...currentViewConfig,
        screenshotPath: `screenshot_${Date.now()}.png`
      };
      const response = await reviewApi.addViewConfig(id, viewData);
      const result = response.data;
      if (result.success) {
        message.success('视图保存成功');
        setViewModalVisible(false);
        viewForm.resetFields();
        fetchViewConfigs(id);
      }
    } catch (error) {
      message.error('视图保存失败');
    }
  };

  const handleAddRemark = async (values: any) => {
    if (!id) return;
    try {
      const response = await reviewApi.addRemark(id, values);
      const result = response.data;
      if (result.success) {
        message.success('备注添加成功');
        setRemarkModalVisible(false);
        remarkForm.resetFields();
        fetchDetail(id);
        fetchHistories(id);
      }
    } catch (error) {
      message.error('备注添加失败');
    }
  };

  const handleViewChange = (config: Partial<ViewConfig>) => {
    setCurrentViewConfig(config);
  };

  const handleScreenshot = (dataUrl: string) => {
    saveAs(dataUrl, `cad-screenshot-${Date.now()}.png`);
  };

  const applyViewConfig = (config: ViewConfig) => {
    setCurrentView(config);
    message.info(`已切换到视图：${config.name}`);
  };

  const getFilteredCollisions = () => {
    if (!detail) return [];
    let collisions = [...detail.collisions];
    
    if (filterType !== 'all') {
      collisions = collisions.filter(c => c.type === filterType);
    }
    if (filterSeverity !== 'all') {
      collisions = collisions.filter(c => c.severity === filterSeverity);
    }
    
    collisions.sort((a, b) => {
      if (a.isConfirmed !== b.isConfirmed) return a.isConfirmed ? 1 : -1;
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    return collisions;
  };

  const getCollisionStats = () => {
    if (!detail) return { high: 0, medium: 0, low: 0, confirmed: 0, total: 0 };
    const collisions = detail.collisions;
    return {
      high: collisions.filter(c => c.severity === 'high').length,
      medium: collisions.filter(c => c.severity === 'medium').length,
      low: collisions.filter(c => c.severity === 'low').length,
      confirmed: collisions.filter(c => c.isConfirmed).length,
      total: collisions.length
    };
  };

  const collisionColumns = [
    {
      title: '严重程度',
      dataIndex: 'severity',
      width: 100,
      render: (severity: CollisionSeverity) => (
        <Tag color={severityColorMap[severity]}>
          {severityTextMap[severity]}
        </Tag>
      )
    },
    {
      title: '异常类型',
      dataIndex: 'type',
      width: 150,
      render: (type: CollisionType) => collisionTypeTextMap[type]
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (text: string, record: Collision) => (
        <Tooltip title={text}>
          <Space>
            {!record.isConfirmed && <ExclamationCircleOutlined style={{ color: '#faad14' }} />}
            <span>{text}</span>
          </Space>
        </Tooltip>
      )
    },
    {
      title: '位置',
      dataIndex: 'location',
      width: 120,
      render: (location: string) => location || '-'
    },
    {
      title: '对结论的影响',
      dataIndex: 'impactOnConclusion',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text type="secondary">{text || '-'}</Text>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'isConfirmed',
      width: 100,
      render: (isConfirmed: boolean, record: Collision) => (
        <Space>
          {isConfirmed ? (
            <Tag color="green">已确认</Tag>
          ) : (
            <Tag color="orange">待确认</Tag>
          )}
          {record.confirmedBy && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.confirmedBy}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: Collision) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => {
              setActiveTab('cad');
              message.info('已定位到CAD视图');
            }}
          >
            定位
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CameraOutlined />}
            onClick={() => {
              setActiveTab('cad');
              message.info('请在CAD视图中点击截图按钮');
            }}
          >
            截图
          </Button>
          {!record.isConfirmed ? (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleConfirmCollision(record, true)}
            >
              确认
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleConfirmCollision(record, false)}
            >
              取消
            </Button>
          )}
        </Space>
      )
    }
  ];

  const layerColumns = [
    { title: '图层名称', dataIndex: 'name' },
    {
      title: '版本',
      dataIndex: 'version',
      render: (version: string, record: any) => (
        <Space>
          <span>{version}</span>
          {record.isOldVersion && <Tag color="red">旧版</Tag>}
        </Space>
      )
    },
    { title: '类型', dataIndex: 'layerType', render: (t: string) => t || '-' },
    {
      title: '问题描述',
      dataIndex: 'issueDescription',
      render: (text: string) => text || <Text type="secondary">无</Text>
    }
  ];

  const materialColumns = [
    { title: '材料名称', dataIndex: 'name' },
    {
      title: '标准名称',
      dataIndex: 'standardName',
      render: (name: string, record: any) => (
        <Space>
          <span>{name || '-'}</span>
          {record.isNameMismatch && <Tag color="orange">名称不一致</Tag>}
        </Space>
      )
    },
    { title: '单位', dataIndex: 'unit' },
    { title: '数量', dataIndex: 'quantity' },
    {
      title: '楼层',
      dataIndex: 'floor',
      render: (floor: string) => floor || '-'
    },
    {
      title: '异常',
      render: (_: unknown, record: any) => (
        <Space>
          {record.isNameMismatch && <Tag color="orange">名称</Tag>}
          {record.isUnitMixed && <Tag color="red">单位混用</Tag>}
          {!record.isNameMismatch && !record.isUnitMixed && (
            <Text type="secondary">无</Text>
          )}
        </Space>
      )
    },
    {
      title: '问题描述',
      dataIndex: 'issueDescription',
      render: (text: string) => text || <Text type="secondary">无</Text>
    }
  ];

  const stats = getCollisionStats();
  const filteredCollisions = getFilteredCollisions();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/reviews')}
          style={{ marginBottom: 16 }}
        >
          返回列表
        </Button>
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space align="center">
                <Title level={3} style={{ margin: 0 }}>
                  {detail?.name}
                </Title>
                {detail?.isGrayRelease && <Tag color="purple">样例</Tag>}
                <Tag>{detail?.code}</Tag>
                <Tag color={detail?.status === 'completed' ? 'green' : 'blue'}>
                  {detail?.status && statusTextMap[detail.status]}
                </Tag>
                <Tag
                  color={
                    detail?.conclusion === 'pass'
                      ? 'green'
                      : detail?.conclusion === 'fail'
                      ? 'red'
                      : 'default'
                  }
                >
                  结论：{detail?.conclusion && conclusionTextMap[detail.conclusion]}
                </Tag>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  创建时间：{dayjs(detail?.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </div>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleRunDetection}
                  loading={detecting}
                >
                  运行检测
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => setExportModalVisible(true)}
                >
                  导出
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => setViewModalVisible(true)}
                >
                  保存视图
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <TagOutlined />
                  <span>运营备注（修改后自动同步）</span>
                </Space>
              }
              bordered={false}
            >
              <AntTextArea
                value={operatorRemark}
                onChange={handleRemarkChange}
                placeholder="请输入运营备注，修改后1秒自动保存..."
                rows={3}
                style={{ resize: 'none' }}
              />
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  备注修改后会自动同步到后端和导出文件
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 0]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="高风险异常"
              value={stats.high}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="中风险异常"
              value={stats.medium}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="低风险异常"
              value={stats.low}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已确认/总数"
              value={`${stats.confirmed}/${stats.total}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
        </Row>
      </div>

      <Card bordered={false}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <ExclamationCircleOutlined />
                异常检测
                {detail?.collisions && detail.collisions.length > 0 && (
                  <Tag color="red" style={{ marginLeft: 8 }}>
                    {detail.collisions.length}
                  </Tag>
                )}
              </span>
            }
            key="collisions"
          >
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text strong>筛选：</Text>
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: 180 }}
                  allowClear
                >
                  <Option value="all">全部类型</Option>
                  <Option value="old_cad_layer">旧版CAD图层</Option>
                  <Option value="material_name_mismatch">材料名称不一致</Option>
                  <Option value="unit_mixed">单位混用</Option>
                  <Option value="floor_unit_mismatch">楼层格式不统一</Option>
                  <Option value="verbal_remark">口头备注</Option>
                </Select>
                <Select
                  value={filterSeverity}
                  onChange={setFilterSeverity}
                  style={{ width: 140 }}
                  allowClear
                >
                  <Option value="all">全部程度</Option>
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Space>
              <Text type="secondary">
                共 {filteredCollisions.length} 条，未确认项置顶显示
              </Text>
            </div>
            <Table
              rowKey="id"
              columns={collisionColumns}
              dataSource={filteredCollisions}
              scroll={{ x: 1000 }}
              pagination={false}
              locale={{ emptyText: <Empty description="暂无异常数据，请先运行检测" /> }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <AppstoreOutlined />
                CAD图层
              </span>
            }
            key="cad"
          >
            <CadViewer
              layers={detail?.cadLayers}
              viewConfig={currentView || undefined}
              onViewChange={handleViewChange}
              onScreenshot={handleScreenshot}
            />
            <Divider />
            <Table
              rowKey="id"
              columns={layerColumns}
              dataSource={detail?.cadLayers || []}
              pagination={false}
              locale={{ emptyText: <Empty description="暂无CAD图层数据" /> }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <DatabaseOutlined />
                材料清单
              </span>
            }
            key="materials"
          >
            <Table
              rowKey="id"
              columns={materialColumns}
              dataSource={detail?.materials || []}
              scroll={{ x: 900 }}
              pagination={false}
              locale={{ emptyText: <Empty description="暂无材料数据" /> }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <EyeOutlined />
                视图配置
                {viewConfigs.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {viewConfigs.length}
                  </Tag>
                )}
              </span>
            }
            key="views"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setViewModalVisible(true)}
              >
                保存当前视图
              </Button>
            </div>
            {viewConfigs.length > 0 ? (
              <Row gutter={[16, 16]}>
                {viewConfigs.map(view => (
                  <Col span={8} key={view.id}>
                    <Card
                      hoverable
                      actions={[
                        <Button type="link" onClick={() => applyViewConfig(view)}>
                          应用视角
                        </Button>,
                        <Button type="link" onClick={() => setActiveTab('cad')}>
                          查看
                        </Button>
                      ]}
                    >
                      <Card.Meta
                        title={
                          <Space>
                            <span>{view.name}</span>
                            <Tag>{view.angle}</Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <div>缩放: {(view.zoom * 100).toFixed(0)}%</div>
                            <div>
                              旋转: ({view.rotationX}°, {view.rotationY}°)
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(view.createdAt).format('YYYY-MM-DD HH:mm')}
                              </Text>
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="暂无保存的视图，调整好视角后点击「保存视图」" />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                历史变更
                {histories.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {histories.length}
                  </Tag>
                )}
              </span>
            }
            key="histories"
          >
            {histories.length > 0 ? (
              <Timeline mode="left">
                {histories.map(history => (
                  <Timeline.Item
                    key={history.id}
                    color={
                      history.action === 'confirm_collision'
                        ? 'green'
                        : history.action === 'update_remark'
                        ? 'blue'
                        : history.action === 'conclusion_change'
                        ? 'red'
                        : 'gray'
                    }
                    label={
                      <Text type="secondary">
                        {dayjs(history.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    }
                  >
                    <Space direction="vertical">
                      <Space>
                        <Tag>{actionTextMap[history.action] || history.action}</Tag>
                        <Text strong>{history.operator}</Text>
                      </Space>
                      {history.fieldName && history.oldValue && history.newValue && (
                        <div>
                          <Text type="secondary">{history.fieldName}：</Text>
                          <Text delete type="secondary">
                            {history.oldValue}
                          </Text>
                          <Text type="secondary"> → </Text>
                          <Text strong>{history.newValue}</Text>
                        </div>
                      )}
                      {history.description && <Text>{history.description}</Text>}
                    </Space>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="暂无历史记录" />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <TagOutlined />
                备注管理
                {detail?.remarks && detail.remarks.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {detail.remarks.length}
                  </Tag>
                )}
              </span>
            }
            key="remarks"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setRemarkModalVisible(true)}
              >
                添加备注
              </Button>
            </div>
            {detail?.remarks && detail.remarks.length > 0 ? (
              <List
                dataSource={detail.remarks}
                renderItem={item => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.content}</span>
                          <Tag
                            color={
                              item.source === 'verbal'
                                ? 'orange'
                                : item.source === 'operator'
                                ? 'blue'
                                : 'default'
                            }
                          >
                            {item.source === 'verbal'
                              ? '口头'
                              : item.source === 'operator'
                              ? '运营'
                              : '书面'}
                          </Tag>
                          {item.author && (
                            <Text type="secondary">— {item.author}</Text>
                          )}
                        </Space>
                      }
                      description={
                        <Text type="secondary">
                          {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无备注" />
            )}
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="导出预审报告"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
      >
        <Form
          form={exportForm}
          layout="vertical"
          onFinish={handleExport}
          initialValues={{
            format: 'excel',
            includeHistory: true,
            includeCollisions: true,
            includeScreenshots: false
          }}
        >
          <Form.Item
            name="format"
            label="导出格式"
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Radio.Group>
              <Radio.Button value="excel">Excel (.xlsx)</Radio.Button>
              <Radio.Button value="pdf">PDF (.pdf)</Radio.Button>
              <Radio.Button value="csv">CSV (.csv)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="includeCollisions" valuePropName="checked">
            <Switch /> 包含异常检测结果
          </Form.Item>
          <Form.Item name="includeHistory" valuePropName="checked">
            <Switch /> 包含历史变更记录
          </Form.Item>
          <Form.Item name="includeScreenshots" valuePropName="checked">
            <Switch /> 包含截图附件
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认导出
              </Button>
              <Button onClick={() => setExportModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="保存当前视图"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
      >
        <Form
          form={viewForm}
          layout="vertical"
          onFinish={handleSaveView}
        >
          <Form.Item
            name="name"
            label="视图名称"
            rules={[{ required: true, message: '请输入视图名称' }]}
          >
            <Input placeholder="如：异常位置1、机柜A3视角等" />
          </Form.Item>
          <Form.Item name="angle" label="视角">
            <Select defaultValue="custom">
              <Option value="top">俯视图</Option>
              <Option value="front">正视图</Option>
              <Option value="side">侧视图</Option>
              <Option value="isometric">等轴测</Option>
              <Option value="custom">自定义</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="备注说明">
            <AntTextArea rows={2} placeholder="可选，描述该视图的用途" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setViewModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加备注"
        open={remarkModalVisible}
        onCancel={() => setRemarkModalVisible(false)}
        footer={null}
      >
        <Form
          form={remarkForm}
          layout="vertical"
          onFinish={handleAddRemark}
          initialValues={{ source: 'written' }}
        >
          <Form.Item
            name="content"
            label="备注内容"
            rules={[{ required: true, message: '请输入备注内容' }]}
          >
            <AntTextArea rows={4} placeholder="请输入备注内容" />
          </Form.Item>
          <Form.Item name="source" label="备注来源">
            <Radio.Group>
              <Radio value="written">书面</Radio>
              <Radio value="verbal">口头</Radio>
              <Radio value="operator">运营</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="author" label="记录人">
            <Input placeholder="请输入记录人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
              <Button onClick={() => setRemarkModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReviewDetail;
