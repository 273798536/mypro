import React, { useState, useEffect } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Descriptions,
  List,
  Divider,
  Form,
  Input,
  Modal,
  message,
  Alert,
  Table,
  Tooltip,
} from 'antd';
import {
  ArrowLeft,
  Download,
  Edit,
  Save,
  Scale,
  Activity,
  FileText,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import PressureChart from '../components/charts/PressureChart';
import EvidenceTimeline from '../components/EvidenceTimeline';
import {
  formatDateTime,
  getConclusionColor,
  getConclusionText,
  getStatusColor,
  getStatusText,
  getAnomalyTypeText,
  getSeverityColor,
  getSeverityText,
  generateId,
} from '../utils';
import type { CheckResult, EvidenceItem } from '../types';

const { TextArea } = Input;

const DetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    getCheckResultById,
    getLoadRecordById,
    getOilPressureById,
    getLedgerByVersion,
    updateCheckResult,
    updateLoadRecord,
    reports,
  } = useAppStore();

  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkForm] = Form.useForm();
  const [remarkModalVisible, setRemarkModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      const result = getCheckResultById(id);
      setCheckResult(result || null);
    }
  }, [id, getCheckResultById]);

  if (!checkResult) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle size={48} className="text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">未找到该校核记录</p>
          <Button type="primary" onClick={() => navigate('/')}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const loadRecord = getLoadRecordById(checkResult.loadRecordId);
  const oilPressure = getOilPressureById(checkResult.oilPressureId);
  const ledger = loadRecord
    ? getLedgerByVersion(loadRecord.deviceId, checkResult.ledgerVersion)
    : undefined;

  const relatedReports = reports.filter((r) =>
    r.checkResultIds.includes(checkResult.id)
  );

  const handleSaveRemark = (values: any) => {
    const newRemark = values.remark.trim();
    if (!newRemark) {
      message.error('请输入检修备注');
      return;
    }

    const newEvidence: EvidenceItem = {
      id: generateId(),
      type: 'maintenance_remark',
      refId: checkResult.id,
      description: newRemark,
      timestamp: new Date().toISOString(),
      operator: '设备安全员',
    };

    updateCheckResult(checkResult.id, {
      maintenanceRemark: newRemark,
      conclusionConsistent: true,
      evidenceChain: [...checkResult.evidenceChain, newEvidence],
      status: 'confirmed',
    });

    if (loadRecord) {
      updateLoadRecord(loadRecord.id, {
        remark: newRemark,
        remarkHistory: [
          ...loadRecord.remarkHistory,
          {
            id: generateId(),
            content: newRemark,
            operator: '设备安全员',
            operateTime: new Date().toISOString(),
          },
        ],
        status: 'confirmed',
      });
    }

    setCheckResult({
      ...checkResult,
      maintenanceRemark: newRemark,
      conclusionConsistent: true,
      evidenceChain: [...checkResult.evidenceChain, newEvidence],
      status: 'confirmed',
    });

    setRemarkModalVisible(false);
    remarkForm.resetFields();
    message.success('检修备注已保存');
  };

  const anomalyColumns = [
    {
      title: '异常类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color="red">{getAnomalyTypeText(type as any)}</Tag>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <span
          className="font-medium"
          style={{ color: getSeverityColor(severity as any) }}
        >
          {getSeverityText(severity as any)}
        </span>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '最大压力(MPa)',
      dataIndex: 'maxPressure',
      key: 'maxPressure',
      width: 120,
      render: (val: number) => <span className="font-mono">{val}</span>,
    },
    {
      title: '最小压力(MPa)',
      dataIndex: 'minPressure',
      key: 'minPressure',
      width: 120,
      render: (val: number) => <span className="font-mono">{val}</span>,
    },
    {
      title: '波动幅度(MPa)',
      dataIndex: 'fluctuation',
      key: 'fluctuation',
      width: 120,
      render: (val: number) => <span className="font-mono">{val}</span>,
    },
  ];

  const remarkHistoryColumns = [
    {
      title: '修改时间',
      dataIndex: 'operateTime',
      key: 'operateTime',
      width: 180,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '备注内容',
      dataIndex: 'content',
      key: 'content',
    },
  ];

  const CheckItemDisplay = ({
    title,
    check,
    unit,
  }: {
    title: string;
    check: CheckResult['overloadCheck'];
    unit: string;
  }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        {check.passed ? (
          <CheckCircle size={18} className="text-green-500" />
        ) : (
          <XCircle size={18} className="text-red-500" />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold ${
            check.passed ? 'text-gray-800' : 'text-red-500'
          }`}
        >
          {check.value}
        </span>
        <span className="text-sm text-gray-500">/ {check.threshold}{unit}</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{check.detail}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/')}
          >
            返回列表
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              校核明细
              <span className="font-mono text-base font-normal text-gray-500">
                {checkResult.recordNo}
              </span>
              <Tag color={getConclusionColor(checkResult.conclusion)}>
                {getConclusionText(checkResult.conclusion)}
              </Tag>
              <Tag color={getStatusColor(checkResult.status)}>
                {getStatusText(checkResult.status)}
              </Tag>
              {!checkResult.conclusionConsistent && (
                <Tag color="warning">口径不一致</Tag>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              校核时间：{formatDateTime(checkResult.checkTime)} | 操作人：
              {checkResult.operator} | 台账版本：
              <Tag color="blue" className="font-mono">
                {checkResult.ledgerVersion}
              </Tag>
            </p>
          </div>
        </div>
        <Space>
          {!checkResult.conclusionConsistent && (
            <Button
              type="primary"
              icon={<Edit size={16} />}
              onClick={() => setRemarkModalVisible(true)}
            >
              补充检修备注
            </Button>
          )}
          <Button icon={<Download size={16} />}>导出明细</Button>
        </Space>
      </div>

      {!checkResult.conclusionConsistent && (
        <Alert
          type="warning"
          showIcon
          message="载重记录与油压数据结论不一致"
          description="请点击上方按钮补充检修备注作为补充证据。检修备注将作为证据链的一部分保留，便于后续复核。"
          action={
            <Button size="small" type="primary" onClick={() => setRemarkModalVisible(true)}>
              补充备注
            </Button>
          }
        />
      )}

      {checkResult.maintenanceRemark && (
        <Alert
          type="info"
          showIcon
          icon={<FileText size={18} />}
          message="检修备注（补充证据）"
          description={checkResult.maintenanceRemark}
        />
      )}

      <Row gutter={16}>
        <Col span={8}>
          <CheckItemDisplay
            title="超载检测"
            check={checkResult.overloadCheck}
            unit="kg"
          />
        </Col>
        <Col span={8}>
          <CheckItemDisplay
            title="油压检测"
            check={checkResult.pressureCheck}
            unit="MPa"
          />
        </Col>
        <Col span={8}>
          <CheckItemDisplay
            title="高度检测"
            check={checkResult.heightCheck}
            unit="m"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <Scale size={18} className="text-blue-500" />
                载重记录详情
              </span>
            }
            size="small"
          >
            {loadRecord && (
              <>
                <Descriptions column={2} size="small" className="mb-4">
                  <Descriptions.Item label="设备名称">
                    {loadRecord.deviceName}
                  </Descriptions.Item>
                  <Descriptions.Item label="设备ID">
                    <span className="font-mono">{loadRecord.deviceId}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="载重时间">
                    {formatDateTime(loadRecord.loadTime)}
                  </Descriptions.Item>
                  <Descriptions.Item label="台账版本">
                    <Tag color="blue" className="font-mono">
                      {loadRecord.ledgerVersion}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="载重重量">
                    <span
                      className={
                        loadRecord.isOverload
                          ? 'text-red-500 font-semibold'
                          : ''
                      }
                    >
                      {loadRecord.loadWeight}kg
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="额定载荷">
                    {loadRecord.ratedLoad}kg
                  </Descriptions.Item>
                  <Descriptions.Item label="作业高度">
                    <span
                      className={
                        loadRecord.isHeightOver
                          ? 'text-red-500 font-semibold'
                          : ''
                      }
                    >
                      {loadRecord.height}m
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="最大高度">
                    {loadRecord.maxHeight}m
                  </Descriptions.Item>
                </Descriptions>

                <Divider className="my-3" />

                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <History size={14} />
                    备注修改历史
                  </h4>
                  <Table
                    columns={remarkHistoryColumns}
                    dataSource={loadRecord.remarkHistory}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Link size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">
                    数据关联：载重记录ID = {checkResult.loadRecordId}
                  </span>
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <Activity size={18} className="text-red-500" />
                油压序列详情
              </span>
            }
            size="small"
          >
            {oilPressure && (
              <>
                <PressureChart series={oilPressure} ledger={ledger} height={280} />

                <Divider className="my-4" />

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">采样点数</p>
                    <p className="text-lg font-bold text-gray-800">
                      {oilPressure.dataPoints.length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">异常数量</p>
                    <p
                      className={`text-lg font-bold ${
                        oilPressure.anomalies.length > 0
                          ? 'text-red-500'
                          : 'text-green-500'
                      }`}
                    >
                      {oilPressure.anomalies.length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">开始时间</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDateTime(oilPressure.startTime).split(' ')[1]}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">结束时间</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDateTime(oilPressure.endTime).split(' ')[1]}
                    </p>
                  </div>
                </div>

                {oilPressure.anomalies.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      异常检测结果
                    </h4>
                    <Table
                      columns={anomalyColumns}
                      dataSource={oilPressure.anomalies}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 800 }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Link size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">
                    数据关联：油压序列ID = {checkResult.oilPressureId} | 关联记录号 ={' '}
                    {oilPressure.recordNo}
                  </span>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <FileText size={18} className="text-orange-500" />
                证据链 - 载重记录 → 油压序列 → 检修备注 → 报告导出
              </span>
            }
            size="small"
            extra={
              <Tooltip title="证据链展示了从数据导入到最终报告的完整操作轨迹，确保日常处理与事后复盘口径一致">
                <span className="text-xs text-gray-500 cursor-help">
                  关于证据链
                </span>
              </Tooltip>
            }
          >
            <EvidenceTimeline evidence={checkResult.evidenceChain} />

            {relatedReports.length > 0 && (
              <>
                <Divider className="my-4" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    相关导出报告
                  </h4>
                  <List
                    size="small"
                    dataSource={relatedReports}
                    renderItem={(report) => (
                      <List.Item
                        actions={[
                          <Button type="link" size="small">
                            下载
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <span className="flex items-center gap-2">
                              <span className="font-mono">
                                {report.reportNo}
                              </span>
                              <Tag color={report.format === 'pdf' ? 'red' : 'green'}>
                                {report.format.toUpperCase()}
                              </Tag>
                              {report.includeEvidence && (
                                <Tag color="blue">含证据链</Tag>
                              )}
                            </span>
                          }
                          description={
                            <span className="text-xs text-gray-500">
                              生成时间：{formatDateTime(report.generateTime)} | 
                              操作人：{report.operator} | 
                              包含校核记录：{report.checkResultIds.length}条
                            </span>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {ledger && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <History size={18} className="text-purple-500" />
              关联设备台账版本信息
            </span>
          }
          size="small"
          type="inner"
        >
          <Descriptions column={4} size="small">
            <Descriptions.Item label="版本号">
              <Tag color={ledger.isCurrent ? 'green' : 'default'} className="font-mono">
                {ledger.version}
              </Tag>
              {ledger.isCurrent && <Tag color="success">当前版本</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="版本名称">
              {ledger.versionName}
            </Descriptions.Item>
            <Descriptions.Item label="生效日期">
              {ledger.effectiveDate}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatDateTime(ledger.createTime)}
            </Descriptions.Item>
            <Descriptions.Item label="额定载荷">
              {ledger.ratedLoad}kg
            </Descriptions.Item>
            <Descriptions.Item label="最大高度">
              {ledger.maxHeight}m
            </Descriptions.Item>
            <Descriptions.Item label="预警压力">
              {ledger.pressureWarning}MPa
            </Descriptions.Item>
            <Descriptions.Item label="报警压力">
              {ledger.pressureAlarm}MPa
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={4}>
              {ledger.remark}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Modal
        title="补充检修备注"
        open={remarkModalVisible}
        onCancel={() => setRemarkModalVisible(false)}
        footer={null}
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          message="请如实填写检修备注"
          description="检修备注将作为补充证据永久保留在证据链中，用于解释载重记录与油压数据结论不一致的情况。填写后将自动标记校核结果为已确认。"
          className="mb-4"
        />
        <Form form={remarkForm} layout="vertical" onFinish={handleSaveRemark}>
          <Form.Item
            name="remark"
            label="检修备注"
            rules={[{ required: true, message: '请输入检修备注' }]}
          >
            <TextArea
              rows={6}
              placeholder="请详细说明载重记录与油压数据结论不一致的原因，包括现场核实情况、设备状态、处理措施等内容..."
            />
          </Form.Item>
          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setRemarkModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" icon={<Save size={16} />}>
              保存备注
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DetailPage;
