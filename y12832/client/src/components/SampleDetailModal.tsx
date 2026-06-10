import { useState, useEffect } from 'react';
import { 
  Modal, Descriptions, Tag, Timeline, Space, Button, Form, 
  Input, Select, Card, Tabs, App, Table, message, Tooltip, Popover
} from 'antd';
import { 
  ClockCircleOutlined, UserOutlined, ExclamationCircleOutlined,
  SearchOutlined, FileTextOutlined, CheckCircleOutlined,
  ArrowRightOutlined, HistoryOutlined
} from '@ant-design/icons';
import type { Sample, ProcessingRecord, AuditLog, TraceData, QualityStatus } from '../types';
import { 
  getProcessingRecords, getAuditLogs, createDifferenceAnalysis,
  updateProcessingRecord, traceException, 
  recordTypeLabels, recordResultLabels, recordResultColors,
  statusLabels, statusColors, qualityLabels, qualityColors,
  auditActionLabels
} from '../api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface Props {
  open: boolean;
  sample: Sample | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function SampleDetailModal({ open, sample, onClose, onRefresh }: Props) {
  const { message } = App.useApp();
  const [records, setRecords] = useState<ProcessingRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [analysisForm] = Form.useForm();
  const [recordForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (open && sample) {
      loadData();
    }
  }, [open, sample]);

  async function loadData() {
    if (!sample) return;
    setLoading(true);
    try {
      const [recordsRes, logsRes] = await Promise.all([
        getProcessingRecords(sample.id),
        getAuditLogs(sample.id),
      ]);
      setRecords(recordsRes.data.data);
      setAuditLogs(logsRes.data.data);
    } catch (e: any) {
      message.error('加载数据失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAnalysis() {
    if (!sample) return;
    try {
      const values = await analysisForm.validateFields();
      await createDifferenceAnalysis(sample.id, values);
      message.success('差异分析记录已创建');
      analysisForm.resetFields();
      loadData();
    } catch (e: any) {
      message.error('创建失败: ' + e.message);
    }
  }

  async function handleUpdateRecord(record: ProcessingRecord) {
    try {
      const values = await recordForm.validateFields();
      await updateProcessingRecord(record.id, {
        ...values,
        isReviewed: true,
      });
      message.success('记录更新成功');
      recordForm.resetFields();
      loadData();
    } catch (e: any) {
      message.error('更新失败: ' + e.message);
    }
  }

  async function handleTrace(recordId: number) {
    try {
      const res = await traceException(recordId);
      setTraceData(res.data.data);
      setTraceModalOpen(true);
    } catch (e: any) {
      message.error('追溯失败: ' + e.message);
    }
  }

  if (!sample) return null;

  const overviewTab = {
    key: 'overview',
    label: '基本信息',
    children: (
      <div>
        <Card title="样本基本信息" style={{ marginBottom: 16 }} size="small">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="样本条码">
              <Space>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sample.barcode}</span>
                {sample.hasDuplicateBarcode && (
                  <Tag color="orange" className="tag-duplicate">条码重复</Tag>
                )}
                {sample.hasMissingTimePoint && (
                  <Tag color="blue" className="tag-timepoint">时间缺失</Tag>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="样本名称">{sample.sampleName}</Descriptions.Item>
            <Descriptions.Item label="细菌名称">{sample.bacteriaName}</Descriptions.Item>
            <Descriptions.Item label="测序批次">{sample.sequencingBatch || '-'}</Descriptions.Item>
            <Descriptions.Item label="采集时间">
              {sample.collectionTime || <Tag color="default">未填写</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="检测时间">
              {sample.testTime || <Tag color="default">未填写</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="质量状态">
              <Tag color={qualityColors[sample.qualityStatus]}>
                {qualityLabels[sample.qualityStatus]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="处理状态">
              <Tag color={statusColors[sample.status]}>
                {statusLabels[sample.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="耐药谱" span={2}>
              {sample.resistanceProfile || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="质量备注" span={2}>
              {sample.qualityNotes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {sample.notes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="导入人">{sample.importedBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="导入时间">
              {dayjs(sample.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {sample.reviewedBy && (
              <>
                <Descriptions.Item label="复核人">{sample.reviewedBy}</Descriptions.Item>
                <Descriptions.Item label="复核时间">
                  {sample.reviewedAt ? dayjs(sample.reviewedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>

        <Card title="质量警告" size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {sample.hasDuplicateBarcode && (
              <div style={{ padding: 12, background: '#fff7e6', borderRadius: 6, borderLeft: '4px solid #fa8c16' }}>
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>条码重复警告</div>
                    <div style={{ fontSize: 13, color: '#8c8c8c' }}>
                      该条码在系统中存在多条记录，请注意核对样本来源
                    </div>
                  </div>
                </Space>
              </div>
            )}
            {sample.hasMissingTimePoint && (
              <div style={{ padding: 12, background: '#e6f7ff', borderRadius: 6, borderLeft: '4px solid #1890ff' }}>
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>时间点缺失警告</div>
                    <div style={{ fontSize: 13, color: '#8c8c8c' }}>
                      采集时间或检测时间缺失，可能影响耐药谱分析准确性
                    </div>
                  </div>
                </Space>
              </div>
            )}
            {!sample.hasDuplicateBarcode && !sample.hasMissingTimePoint && (
              <div style={{ padding: 12, background: '#f6ffed', borderRadius: 6, borderLeft: '4px solid #52c41a' }}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>质量检查通过</div>
                    <div style={{ fontSize: 13, color: '#8c8c8c' }}>
                      未发现条码重复或时间点缺失问题
                    </div>
                  </div>
                </Space>
              </div>
            )}
          </Space>
        </Card>
      </div>
    ),
  };

  const recordsTab = {
    key: 'records',
    label: '处理记录',
    children: (
      <div>
        <Card 
          size="small" 
          style={{ marginBottom: 16 }}
          title={
            <Space>
              <FileTextOutlined />
              <span>创建差异分析记录</span>
            </Space>
          }
        >
          <Form form={analysisForm} layout="vertical">
            <Form.Item
              name="description"
              label="分析描述"
              rules={[{ required: true, message: '请输入分析描述' }]}
            >
              <Input placeholder="简要描述本次差异分析的目的，如：与参考菌株耐药谱比较" />
            </Form.Item>
            <Form.Item
              name="differenceDetails"
              label="差异详情"
              rules={[{ required: true, message: '请输入差异详情' }]}
            >
              <TextArea 
                rows={4} 
                placeholder="详细描述发现的差异，如：青霉素药敏结果与预期不符，参考库显示敏感但本次检测为耐药..." 
              />
            </Form.Item>
            <Form.Item name="analysisData" label="分析数据(可选)">
              <TextArea rows={2} placeholder="附加的分析数据或计算过程" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleCreateAnalysis}>
                创建差异分析记录
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card 
          size="small"
          title={
            <Space>
              <HistoryOutlined />
              <span>处理记录列表 ({records.length})</span>
            </Space>
          }
        >
          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              暂无处理记录
            </div>
          ) : (
            <Timeline
              mode="left"
              items={records.map(record => ({
                color: record.result === 'pass' ? 'green' : record.result === 'fail' ? 'red' : record.result === 'warning' ? 'orange' : record.result === 'fixed' ? 'blue' : 'gray',
                label: dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                children: (
                  <div className="timeline-item-content">
                    <div style={{ marginBottom: 8 }}>
                      <Space wrap>
                        <Tag color="blue">{recordTypeLabels[record.recordType] || record.recordType}</Tag>
                        <Tag color={recordResultColors[record.result]}>
                          {recordResultLabels[record.result]}
                        </Tag>
                        {record.isReviewed && (
                          <Tag color="green" icon={<CheckCircleOutlined />}>已复核</Tag>
                        )}
                        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                          <UserOutlined /> {record.createdBy}
                        </span>
                      </Space>
                    </div>
                    {record.description && (
                      <div style={{ marginBottom: 8 }}><strong>描述：</strong>{record.description}</div>
                    )}
                    {record.differenceDetails && (
                      <div style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                        <strong>差异详情：</strong>{record.differenceDetails}
                      </div>
                    )}
                    {record.exceptionDetails && (
                      <div style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                        <strong>异常详情：</strong>{record.exceptionDetails}
                      </div>
                    )}
                    {record.handlingOpinion && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>处理意见：</strong>{record.handlingOpinion}
                      </div>
                    )}
                    {record.reviewComment && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>复核意见：</strong>{record.reviewComment}
                      </div>
                    )}
                    {record.reviewedBy && (
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        <ClockCircleOutlined /> {record.reviewedBy} 于 {dayjs(record.reviewedAt!).format('YYYY-MM-DD HH:mm')} 复核
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Tooltip title="追溯：查看完整处理轨迹">
                          <Button 
                            size="small" 
                            icon={<SearchOutlined />}
                            onClick={() => handleTrace(record.id)}
                          >
                            追溯
                          </Button>
                        </Tooltip>
                        <Popover
                          title="更新处理记录"
                          trigger="click"
                          content={
                            <Form form={recordForm} layout="vertical" style={{ width: 300 }}>
                              <Form.Item name="result" label="处理结果">
                                <Select placeholder="请选择结果">
                                  <Option value="pass">通过</Option>
                                  <Option value="fail">不通过</Option>
                                  <Option value="warning">异常</Option>
                                  <Option value="fixed">已修正</Option>
                                </Select>
                              </Form.Item>
                              <Form.Item name="handlingOpinion" label="处理意见">
                                <TextArea rows={2} placeholder="输入处理意见" />
                              </Form.Item>
                              <Form.Item name="reviewComment" label="复核意见">
                                <TextArea rows={2} placeholder="输入复核意见（如时间点缺失原因）" />
                              </Form.Item>
                              <Form.Item>
                                <Button type="primary" block onClick={() => handleUpdateRecord(record)}>
                                  提交更新
                                </Button>
                              </Form.Item>
                            </Form>
                          }
                        >
                          <Button size="small">更新记录</Button>
                        </Popover>
                      </Space>
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      </div>
    ),
  };

  const auditTab = {
    key: 'audit',
    label: '审计日志',
    children: (
      <Card size="small">
        {auditLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            暂无审计日志
          </div>
        ) : (
          <Table
            size="small"
            dataSource={auditLogs}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: '时间',
                dataIndex: 'timestamp',
                key: 'timestamp',
                width: 160,
                render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
              },
              {
                title: '操作',
                dataIndex: 'action',
                key: 'action',
                width: 120,
                render: (action: string) => (
                  <Tag color="blue">{auditActionLabels[action] || action}</Tag>
                ),
              },
              {
                title: '字段',
                dataIndex: 'fieldName',
                key: 'fieldName',
                width: 120,
                render: (f: string) => f || '-',
              },
              {
                title: '变更内容',
                key: 'change',
                render: (_: any, record: AuditLog) => (
                  <Space>
                    {record.oldValue && <span style={{ color: '#ff4d4f', textDecoration: 'line-through' }}>{record.oldValue}</span>}
                    {record.oldValue && record.newValue && <ArrowRightOutlined />}
                    {record.newValue && <span style={{ color: '#52c41a' }}>{record.newValue}</span>}
                    {!record.oldValue && !record.newValue && <span style={{ color: '#8c8c8c' }}>-</span>}
                  </Space>
                ),
              },
              {
                title: '原因',
                dataIndex: 'reason',
                key: 'reason',
                render: (r: string) => r || '-',
              },
              {
                title: '操作人',
                dataIndex: 'operator',
                key: 'operator',
                width: 100,
              },
            ]}
          />
        )}
      </Card>
    ),
  };

  return (
    <>
      <Modal
        title={`样本详情 - ${sample.barcode}`}
        open={open}
        onCancel={onClose}
        width={900}
        footer={[
          <Button key="close" onClick={onClose}>关闭</Button>,
        ]}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[overviewTab, recordsTab, auditTab]}
        />
      </Modal>

      <Modal
        title="🔍 异常追溯 - 完整处理轨迹"
        open={traceModalOpen}
        onCancel={() => setTraceModalOpen(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setTraceModalOpen(false)}>关闭</Button>,
        ]}
      >
        {traceData && (
          <div>
            <Card 
              size="small" 
              style={{ marginBottom: 16 }}
              title={
                <Space>
                  <SearchOutlined />
                  <span>追溯起点 - {recordTypeLabels[traceData.record.recordType]}</span>
                </Space>
              }
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="记录ID">#{traceData.record.id}</Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(traceData.record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="创建人">{traceData.record.createdBy}</Descriptions.Item>
                <Descriptions.Item label="结果">
                  <Tag color={recordResultColors[traceData.record.result]}>
                    {recordResultLabels[traceData.record.result]}
                  </Tag>
                </Descriptions.Item>
                {traceData.record.description && (
                  <Descriptions.Item label="描述" span={2}>
                    {traceData.record.description}
                  </Descriptions.Item>
                )}
                {traceData.record.differenceDetails && (
                  <Descriptions.Item label="差异详情" span={2}>
                    {traceData.record.differenceDetails}
                  </Descriptions.Item>
                )}
                {traceData.record.handlingOpinion && (
                  <Descriptions.Item label="处理意见" span={2}>
                    {traceData.record.handlingOpinion}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card 
              size="small" 
              style={{ marginBottom: 16 }}
              title={
                <Space>
                  <FileTextOutlined />
                  <span>关联样本清单</span>
                </Space>
              }
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="样本条码">
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {traceData.sample.barcode}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="样本名称">{traceData.sample.sampleName}</Descriptions.Item>
                <Descriptions.Item label="细菌名称">{traceData.sample.bacteriaName}</Descriptions.Item>
                <Descriptions.Item label="质量状态">
                  <Tag color={qualityColors[traceData.sample.qualityStatus]}>
                    {qualityLabels[traceData.sample.qualityStatus]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="耐药谱" span={2}>
                  {traceData.sample.resistanceProfile || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card 
              size="small" 
              style={{ marginBottom: 16 }}
              title={
                <Space>
                  <HistoryOutlined />
                  <span>完整处理记录 ({traceData.relatedRecords.length})</span>
                </Space>
              }
            >
              <Timeline
                mode="left"
                items={traceData.relatedRecords.map(record => ({
                  color: record.id === traceData.record.id ? '#1677ff' : 
                         record.result === 'pass' ? 'green' : 
                         record.result === 'fail' ? 'red' : 
                         record.result === 'warning' ? 'orange' : 'gray',
                  label: dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                  children: (
                    <div className="timeline-item-content" style={record.id === traceData.record.id ? {
                      border: '2px solid #1677ff',
                      background: '#e6f4ff',
                    } : {}}>
                      <Space wrap>
                        <Tag color="blue">{recordTypeLabels[record.recordType]}</Tag>
                        <Tag color={recordResultColors[record.result]}>
                          {recordResultLabels[record.result]}
                        </Tag>
                        {record.id === traceData.record.id && (
                          <Tag color="blue">当前追溯点</Tag>
                        )}
                        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                          <UserOutlined /> {record.createdBy}
                        </span>
                      </Space>
                      {record.handlingOpinion && (
                        <div style={{ marginTop: 4 }}>
                          <strong>处理意见：</strong>{record.handlingOpinion}
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            </Card>

            <Card 
              size="small"
              title={
                <Space>
                  <HistoryOutlined />
                  <span>审计轨迹 - 谁、什么时候、为什么改</span>
                </Space>
              }
            >
              {traceData.auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                  暂无审计记录
                </div>
              ) : (
                <Table
                  size="small"
                  dataSource={traceData.auditLogs as any[]}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: '时间',
                      dataIndex: 'timestamp',
                      key: 'timestamp',
                      width: 150,
                      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
                    },
                    {
                      title: '操作',
                      dataIndex: 'action',
                      key: 'action',
                      width: 100,
                      render: (a: string) => <Tag>{auditActionLabels[a] || a}</Tag>,
                    },
                    {
                      title: '字段',
                      dataIndex: 'fieldName',
                      key: 'fieldName',
                      width: 120,
                      render: (f: string) => f || '-',
                    },
                    {
                      title: '变更',
                      key: 'change',
                      render: (_: any, r: AuditLog) => (
                        <Space size="small">
                          {r.oldValue && <span style={{ color: '#ff4d4f' }}>{r.oldValue}</span>}
                          {r.oldValue && r.newValue && ' → '}
                          {r.newValue && <span style={{ color: '#52c41a' }}>{r.newValue}</span>}
                        </Space>
                      ),
                    },
                    {
                      title: '原因',
                      dataIndex: 'reason',
                      key: 'reason',
                      ellipsis: true,
                      render: (r: string) => r || '-',
                    },
                    {
                      title: '操作人',
                      dataIndex: 'operator',
                      key: 'operator',
                      width: 90,
                    },
                  ]}
                />
              )}
            </Card>
          </div>
        )}
      </Modal>
    </>
  );
}
