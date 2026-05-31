import React, { useState, useMemo } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Divider,
  Descriptions,
  Alert,
  List,
  Timeline,
  Tooltip,
  Popconfirm,
  message,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import type { Settlement, SettlementIssue, SettlementVersion } from '../types';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  getIssueTypeLabel,
  calculateSettlement,
  createSettlementVersion,
} from '../utils/settlement';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const SettlementCenter: React.FC = () => {
  const {
    settlements,
    contracts,
    orders,
    addSettlement,
    updateSettlement,
    resolveIssue,
    addSettlementVersion,
    selectedSettlementId,
    setSelectedSettlementId,
  } = useAppStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [viewingSettlement, setViewingSettlement] = useState<Settlement | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Settlement> | null>(null);
  const [createForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [resolvingIssue, setResolvingIssue] = useState<SettlementIssue | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  const selectedSettlement = useMemo(() => {
    return settlements.find((s) => s.id === selectedSettlementId) || null;
  }, [settlements, selectedSettlementId]);

  const issueStats = useMemo(() => {
    if (!selectedSettlement) return { total: 0, errors: 0, warnings: 0, resolved: 0 };
    const issues = selectedSettlement.issues;
    return {
      total: issues.length,
      errors: issues.filter((i) => i.severity === 'error' && i.status === 'open').length,
      warnings: issues.filter((i) => i.severity === 'warning' && i.status === 'open').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
    };
  }, [selectedSettlement]);

  const columns: ColumnsType<Settlement> = [
    {
      title: '清算单号',
      dataIndex: 'settlementNo',
      key: 'settlementNo',
      width: 140,
      render: (text) => <a className="font-mono">{text}</a>,
    },
    {
      title: '达人',
      dataIndex: 'influencerName',
      key: 'influencerName',
      width: 120,
    },
    {
      title: '关联合同',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: 140,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '清算周期',
      key: 'period',
      width: 180,
      render: (_, record) => (
        <span>
          {record.periodStart} ~ {record.periodEnd}
        </span>
      ),
    },
    {
      title: '应付金额',
      dataIndex: 'netPayable',
      key: 'netPayable',
      width: 130,
      render: (value) => (
        <span className="font-semibold text-blue-600">{formatCurrency(value)}</span>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 80,
    },
    {
      title: '退货数',
      dataIndex: 'returnCount',
      key: 'returnCount',
      width: 80,
      render: (value) => (value > 0 ? <span className="text-orange-500">{value}</span> : value),
    },
    {
      title: '问题数',
      key: 'issueCount',
      width: 100,
      render: (_, record) => {
        const openIssues = record.issues.filter((i) => i.status === 'open');
        if (openIssues.length === 0) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              无问题
            </Tag>
          );
        }
        const errors = openIssues.filter((i) => i.severity === 'error').length;
        const warnings = openIssues.filter((i) => i.severity === 'warning').length;
        return (
          <Space wrap>
            {errors > 0 && (
              <Tag color="error" icon={<ExclamationCircleOutlined />}>
                {errors}个错误
              </Tag>
            )}
            {warnings > 0 && (
              <Tag color="warning" icon={<WarningOutlined />}>
                {warnings}个警告
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '版本',
      dataIndex: 'versions',
      key: 'versions',
      width: 80,
      render: (versions) => (
        <Tooltip title={`已修改${versions.length - 1}次`}>
          <Tag icon={<HistoryOutlined />}>v{versions.length}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewVersions(record)}
          >
            版本
          </Button>
        </Space>
      ),
    },
  ];

  const handlePreviewSettlement = async () => {
    try {
      const values = await createForm.validateFields();
      const contract = contracts.find((c) => c.id === values.contractId);
      if (!contract) return;

      const periodStart = values.period[0].format('YYYY-MM-DD');
      const periodEnd = values.period[1].format('YYYY-MM-DD');

      const result = calculateSettlement(orders, contract, periodStart, periodEnd);
      setPreviewData(result);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCreateSettlement = async () => {
    if (!previewData) return;

    const values = await createForm.validateFields();
    const contract = contracts.find((c) => c.id === values.contractId);
    if (!contract) return;

    const periodStart = values.period[0].format('YYYY-MM-DD');
    const periodEnd = values.period[1].format('YYYY-MM-DD');

    const newSettlement: Settlement = {
      id: `settle-${Date.now()}`,
      settlementNo: `QS-${dayjs().format('YYYY-MM')}-${String(settlements.length + 1).padStart(3, '0')}`,
      contractId: contract.id,
      contractNo: contract.contractNo,
      influencerId: contract.influencerId,
      influencerName: contract.influencerName,
      periodStart,
      periodEnd,
      status: 'draft',
      baseFee: previewData.baseFee || 0,
      totalCommission: previewData.totalCommission || 0,
      totalReturnDeduction: previewData.totalReturnDeduction || 0,
      crossSessionReturnDeduction: previewData.crossSessionReturnDeduction || 0,
      duplicateCommissionDeduction: previewData.duplicateCommissionDeduction || 0,
      otherDeductions: previewData.otherDeductions || 0,
      netPayable: previewData.netPayable || 0,
      orderCount: previewData.orderCount || 0,
      returnCount: previewData.returnCount || 0,
      issues: previewData.issues || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          version: 1,
          createdAt: new Date().toISOString(),
          createdBy: '当前用户',
          baseFee: previewData.baseFee || 0,
          totalCommission: previewData.totalCommission || 0,
          totalReturnDeduction: previewData.totalReturnDeduction || 0,
          crossSessionReturnDeduction: previewData.crossSessionReturnDeduction || 0,
          duplicateCommissionDeduction: previewData.duplicateCommissionDeduction || 0,
          otherDeductions: previewData.otherDeductions || 0,
          netPayable: previewData.netPayable || 0,
          changeLog: '初次生成清算单',
        },
      ],
    };

    addSettlement(newSettlement);
    setSelectedSettlementId(newSettlement.id);
    setIsCreateModalOpen(false);
    setPreviewData(null);
    createForm.resetFields();
    message.success('清算单创建成功');
  };

  const handleViewDetail = (settlement: Settlement) => {
    setViewingSettlement(settlement);
    setSelectedSettlementId(settlement.id);
    setIsDetailModalOpen(true);
  };

  const handleViewVersions = (settlement: Settlement) => {
    setViewingSettlement(settlement);
    setIsVersionModalOpen(true);
  };

  const handleResolveIssue = (issue: SettlementIssue) => {
    setResolvingIssue(issue);
    resolveForm.resetFields();
    setIsResolveModalOpen(true);
  };

  const handleSubmitResolve = async () => {
    if (!resolvingIssue || !selectedSettlement) return;
    try {
      const values = await resolveForm.validateFields();
      resolveIssue(selectedSettlement.id, resolvingIssue.id, values.resolution);

      const newVersion = createSettlementVersion(
        selectedSettlement,
        '当前用户',
        `解决问题: ${getIssueTypeLabel(resolvingIssue.type)} - ${values.resolution}`
      );
      addSettlementVersion(selectedSettlement.id, newVersion);

      setIsResolveModalOpen(false);
      message.success('问题已标记为解决');
    } catch (error) {
      console.error('Resolve failed:', error);
    }
  };

  const handleRecalculate = () => {
    if (!selectedSettlement) return;
    const contract = contracts.find((c) => c.id === selectedSettlement.contractId);
    if (!contract) return;

    const result = calculateSettlement(orders, contract, selectedSettlement.periodStart, selectedSettlement.periodEnd);

    const updatedSettlement: Settlement = {
      ...selectedSettlement,
      ...result,
      updatedAt: new Date().toISOString(),
    };

    const newVersion = createSettlementVersion(
      updatedSettlement,
      '当前用户',
      '重新计算清算金额，更新问题检测结果'
    );
    updatedSettlement.versions = [...updatedSettlement.versions, newVersion];

    updateSettlement(updatedSettlement);
    message.success('重新计算完成');
  };

  const renderIssueCard = (issue: SettlementIssue) => {
    const severityIcon =
      issue.severity === 'error' ? (
        <ExclamationCircleOutlined className="text-red-500" />
      ) : issue.severity === 'warning' ? (
        <WarningOutlined className="text-orange-500" />
      ) : (
        <FileTextOutlined className="text-blue-500" />
      );

    return (
      <Card
        key={issue.id}
        size="small"
        className={`mb-3 ${issue.status === 'open' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}`}
        title={
          <Space>
            {severityIcon}
            <Tag
              color={
                issue.type === 'cross_session_return'
                  ? 'red'
                  : issue.type === 'duplicate_commission'
                  ? 'orange'
                  : 'warning'
              }
            >
              {getIssueTypeLabel(issue.type)}
            </Tag>
            <span className="font-medium">{issue.description.slice(0, 30)}...</span>
          </Space>
        }
        extra={
          <Space>
            <Tag color={getStatusColor(issue.status)}>{getStatusLabel(issue.status)}</Tag>
            {issue.status === 'open' && (
              <Button
                type="primary"
                size="small"
                onClick={() => handleResolveIssue(issue)}
              >
                处理
              </Button>
            )}
          </Space>
        }
      >
        <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            <strong>关联材料：</strong>
            <Tag color="blue">{issue.evidenceRef}</Tag>
          </span>
          <span>发现时间：{formatDate(issue.createdAt)}</span>
        </div>
        {issue.resolution && (
          <Alert
            type="success"
            showIcon
            className="mt-2"
            message="处理结果"
            description={issue.resolution}
          />
        )}
      </Card>
    );
  };

  const renderVersionDiff = (v1: SettlementVersion, v2: SettlementVersion) => {
    const fields = [
      { key: 'baseFee', label: '基础坑位费' },
      { key: 'totalCommission', label: '总佣金' },
      { key: 'totalReturnDeduction', label: '退货扣款' },
      { key: 'crossSessionReturnDeduction', label: '跨场退货追扣' },
      { key: 'duplicateCommissionDeduction', label: '重复佣金扣除' },
      { key: 'otherDeductions', label: '其他扣款' },
      { key: 'netPayable', label: '应付金额' },
    ];

    return (
      <div className="space-y-2">
        {fields.map((field) => {
          const oldVal = v1[field.key as keyof SettlementVersion] as number;
          const newVal = v2[field.key as keyof SettlementVersion] as number;
          const diff = newVal - oldVal;

          if (diff === 0) return null;

          return (
            <div key={field.key} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{field.label}</span>
              <Space>
                <span className="text-gray-400 line-through">{formatCurrency(oldVal)}</span>
                <ArrowDownOutlined className="text-gray-400" />
                <span className="font-medium">{formatCurrency(newVal)}</span>
                <span className={diff > 0 ? 'text-green-500' : 'text-red-500'}>
                  {diff > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {formatCurrency(Math.abs(diff))}
                </span>
              </Space>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理问题"
              value={issueStats.errors + issueStats.warnings}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已解决问题"
              value={issueStats.resolved}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本期应付"
              value={selectedSettlement?.netPayable || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="扣款总计"
              value={
                (selectedSettlement?.totalReturnDeduction || 0) +
                (selectedSettlement?.crossSessionReturnDeduction || 0) +
                (selectedSettlement?.duplicateCommissionDeduction || 0)
              }
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="费用清算单列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
            新建清算
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={settlements}
          rowKey="id"
          scroll={{ x: 1400 }}
          rowClassName={(record) =>
            record.id === selectedSettlementId ? 'bg-blue-50' : ''
          }
          onRow={(record) => ({
            onClick: () => setSelectedSettlementId(record.id),
          })}
        />
      </Card>

      {selectedSettlement && (
        <Card
          title={
            <Space>
              <span>清算明细 - {selectedSettlement.settlementNo}</span>
              <Tag color={getStatusColor(selectedSettlement.status)}>
                {getStatusLabel(selectedSettlement.status)}
              </Tag>
            </Space>
          }
          extra={
            <Space>
              <Button icon={<EditOutlined />} onClick={handleRecalculate}>
                重新计算
              </Button>
              <Popconfirm
                title="确认提交审核？"
                description="提交后将进入审核流程，无法直接修改"
                onConfirm={() => {
                  updateSettlement({ ...selectedSettlement, status: 'reviewing' });
                  message.success('已提交审核');
                }}
                okText="确认提交"
                cancelText="取消"
              >
                <Button type="primary">提交审核</Button>
              </Popconfirm>
            </Space>
          }
        >
          <Row gutter={24}>
            <Col span={12}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="达人">
                  {selectedSettlement.influencerName}
                </Descriptions.Item>
                <Descriptions.Item label="关联合同">
                  {selectedSettlement.contractNo}
                </Descriptions.Item>
                <Descriptions.Item label="清算周期">
                  {selectedSettlement.periodStart} ~ {selectedSettlement.periodEnd}
                </Descriptions.Item>
                <Descriptions.Item label="订单数量">
                  {selectedSettlement.orderCount} 笔
                </Descriptions.Item>
                <Descriptions.Item label="退货数量">
                  <span className="text-orange-500">{selectedSettlement.returnCount} 笔</span>
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col span={12}>
              <Card size="small" title="费用明细" className="h-full">
                <List size="small">
                  <List.Item className="flex justify-between">
                    <span className="text-gray-600">基础坑位费</span>
                    <span>{formatCurrency(selectedSettlement.baseFee)}</span>
                  </List.Item>
                  <List.Item className="flex justify-between">
                    <span className="text-gray-600">+ 销售佣金</span>
                    <span className="text-green-600">
                      + {formatCurrency(selectedSettlement.totalCommission)}
                    </span>
                  </List.Item>
                  <Divider className="my-1" />
                  <List.Item className="flex justify-between">
                    <span className="text-gray-600">- 正常退货扣款</span>
                    <span className="text-orange-500">
                      - {formatCurrency(selectedSettlement.totalReturnDeduction)}
                    </span>
                  </List.Item>
                  <List.Item className="flex justify-between">
                    <span className="text-red-600 font-medium">
                      - 跨场退货追扣
                      <Tooltip title="用户在A场下单，B场退货，按合同条款追加扣款">
                        <ExclamationCircleOutlined className="ml-1" />
                      </Tooltip>
                    </span>
                    <span className="text-red-500 font-medium">
                      - {formatCurrency(selectedSettlement.crossSessionReturnDeduction)}
                    </span>
                  </List.Item>
                  <List.Item className="flex justify-between">
                    <span className="text-orange-600 font-medium">
                      - 重复佣金扣除
                      <Tooltip title="同一订单多次结算，扣除重复部分">
                        <ExclamationCircleOutlined className="ml-1" />
                      </Tooltip>
                    </span>
                    <span className="text-orange-500 font-medium">
                      - {formatCurrency(selectedSettlement.duplicateCommissionDeduction)}
                    </span>
                  </List.Item>
                  <Divider className="my-2" />
                  <List.Item className="flex justify-between text-lg font-bold">
                    <span>应付金额</span>
                    <span className="text-blue-600">
                      {formatCurrency(selectedSettlement.netPayable)}
                    </span>
                  </List.Item>
                </List>
              </Card>
            </Col>
          </Row>

          <Divider />

          <div>
            <h3 className="text-lg font-medium mb-3">
              <Space>
                <ExclamationCircleOutlined className="text-red-500" />
                问题清单 ({selectedSettlement.issues.filter((i) => i.status === 'open').length}
                个待处理)
              </Space>
            </h3>
            {selectedSettlement.issues.length > 0 ? (
              selectedSettlement.issues.map(renderIssueCard)
            ) : (
              <Alert type="success" showIcon message="太棒了！当前清算单没有发现问题" />
            )}
          </div>

          <Divider />

          <div>
            <h3 className="text-lg font-medium mb-3">
              <Space>
                <HistoryOutlined />
                版本变更记录
              </Space>
            </h3>
            <Collapse ghost>
              {selectedSettlement.versions
                .slice()
                .reverse()
                .map((version, index, arr) => (
                  <Panel
                    header={
                      <Space>
                        <Tag color="blue">v{version.version}</Tag>
                        <span>{version.changeLog}</span>
                        <span className="text-gray-400 text-sm">
                          {formatDate(version.createdAt)}
                        </span>
                        <span className="text-gray-400 text-sm">by {version.createdBy}</span>
                      </Space>
                    }
                    key={version.version}
                  >
                    {index < arr.length - 1 &&
                      renderVersionDiff(arr[index + 1], version)}
                    {index === arr.length - 1 && (
                      <Alert type="info" showIcon message="初始版本" />
                    )}
                  </Panel>
                ))}
            </Collapse>
          </div>
        </Card>
      )}

      <Modal
        title="新建清算单"
        open={isCreateModalOpen}
        onOk={previewData ? handleCreateSettlement : handlePreviewSettlement}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setPreviewData(null);
          createForm.resetFields();
        }}
        okText={previewData ? '确认创建' : '预览结果'}
        width={800}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contractId"
                label="选择合同"
                rules={[{ required: true, message: '请选择合同' }]}
              >
                <Select placeholder="请选择达人合同">
                  {contracts.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.contractNo} - {c.influencerName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="period"
                label="清算周期"
                rules={[{ required: true, message: '请选择清算周期' }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {previewData && (
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <h4 className="font-medium mb-3">预览结果</h4>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="订单数"
                    value={previewData.orderCount}
                    suffix="笔"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="退货数"
                    value={previewData.returnCount}
                    suffix="笔"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="问题数"
                    value={previewData.issues?.length || 0}
                    suffix="个"
                    valueStyle={{
                      color: (previewData.issues?.length || 0) > 0 ? '#cf1322' : '#3f8600',
                    }}
                  />
                </Col>
              </Row>
              <Divider />
              <List size="small">
                <List.Item className="flex justify-between">
                  <span>基础坑位费</span>
                  <span>{formatCurrency(previewData.baseFee || 0)}</span>
                </List.Item>
                <List.Item className="flex justify-between">
                  <span>+ 销售佣金</span>
                  <span className="text-green-600">
                    + {formatCurrency(previewData.totalCommission || 0)}
                  </span>
                </List.Item>
                <List.Item className="flex justify-between">
                  <span>- 退货扣款</span>
                  <span className="text-orange-500">
                    - {formatCurrency(previewData.totalReturnDeduction || 0)}
                  </span>
                </List.Item>
                <List.Item className="flex justify-between">
                  <span>- 跨场退货追扣</span>
                  <span className="text-red-500">
                    - {formatCurrency(previewData.crossSessionReturnDeduction || 0)}
                  </span>
                </List.Item>
                <List.Item className="flex justify-between">
                  <span>- 重复佣金扣除</span>
                  <span className="text-orange-500">
                    - {formatCurrency(previewData.duplicateCommissionDeduction || 0)}
                  </span>
                </List.Item>
                <Divider className="my-1" />
                <List.Item className="flex justify-between font-bold">
                  <span>应付金额</span>
                  <span className="text-blue-600 text-lg">
                    {formatCurrency(previewData.netPayable || 0)}
                  </span>
                </List.Item>
              </List>

              {previewData.issues && previewData.issues.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  className="mt-3"
                  message={`检测到 ${previewData.issues.length} 个问题需要处理`}
                  description={
                    <ul className="list-disc pl-4 mt-1">
                      {previewData.issues.map((issue) => (
                        <li key={issue.id} className="text-sm">
                          <Tag
                            color={
                              issue.severity === 'error'
                                ? 'red'
                                : issue.severity === 'warning'
                                ? 'orange'
                                : 'blue'
                            }
                          >
                            {getIssueTypeLabel(issue.type)}
                          </Tag>
                          {issue.description}
                        </li>
                      ))}
                    </ul>
                  }
                />
              )}
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="清算单详情"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={900}
      >
        {viewingSettlement && (
          <div>
            <Descriptions bordered column={2} className="mb-4">
              <Descriptions.Item label="清算单号">
                {viewingSettlement.settlementNo}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(viewingSettlement.status)}>
                  {getStatusLabel(viewingSettlement.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="达人">
                {viewingSettlement.influencerName}
              </Descriptions.Item>
              <Descriptions.Item label="合同">
                {viewingSettlement.contractNo}
              </Descriptions.Item>
              <Descriptions.Item label="周期" span={2}>
                {viewingSettlement.periodStart} ~ {viewingSettlement.periodEnd}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <h4 className="font-medium mb-3">问题清单</h4>
            {viewingSettlement.issues.map(renderIssueCard)}
          </div>
        )}
      </Modal>

      <Modal
        title="版本历史对比"
        open={isVersionModalOpen}
        onCancel={() => setIsVersionModalOpen(false)}
        footer={null}
        width={800}
      >
        {viewingSettlement && (
          <Timeline>
            {viewingSettlement.versions
              .slice()
              .reverse()
              .map((version, index, arr) => (
                <Timeline.Item
                  key={version.version}
                  color={index === 0 ? 'green' : 'blue'}
                >
                  <div className="mb-2">
                    <Space>
                      <Tag color="blue">v{version.version}</Tag>
                      <span className="font-medium">{version.changeLog}</span>
                    </Space>
                    <div className="text-gray-400 text-sm mt-1">
                      {version.createdBy} · {formatDate(version.createdAt)}
                    </div>
                  </div>
                  {index < arr.length - 1 && (
                    <Card size="small" className="bg-gray-50">
                      {renderVersionDiff(arr[index + 1], version)}
                    </Card>
                  )}
                </Timeline.Item>
              ))}
          </Timeline>
        )}
      </Modal>

      <Modal
        title="处理问题"
        open={isResolveModalOpen}
        onOk={handleSubmitResolve}
        onCancel={() => setIsResolveModalOpen(false)}
        okText="确认处理"
      >
        {resolvingIssue && (
          <div className="space-y-4">
            <Alert
              type={resolvingIssue.severity === 'error' ? 'error' : 'warning'}
              showIcon
              message={getIssueTypeLabel(resolvingIssue.type)}
              description={resolvingIssue.description}
            />
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">
                <strong>关联材料：</strong>
                <Tag color="blue">{resolvingIssue.evidenceRef}</Tag>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>证据编号：</strong>
                <code>{resolvingIssue.evidenceNo}</code>
              </p>
            </div>
            <Form form={resolveForm} layout="vertical">
              <Form.Item
                name="resolution"
                label="处理说明"
                rules={[{ required: true, message: '请输入处理说明' }]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="请说明问题原因、处理方式和依据..."
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SettlementCenter;
