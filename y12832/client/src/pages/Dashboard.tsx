import { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Table, Tag, Button, Space, Input, Select, 
  Modal, Form, Upload, message, App, Popconfirm 
} from 'antd';
import { 
  UploadOutlined, PlusOutlined, SearchOutlined, 
  ExportOutlined, FileSearchOutlined, CheckCircleOutlined,
  WarningOutlined, BarChartOutlined, HistoryOutlined
} from '@ant-design/icons';
import type { Sample, SampleStatus } from '../types';
import { 
  getSamples, getProcessingRecords, importSamples, importSamplesByFile,
  updateSampleStatus, exportReports, downloadBlob,
  statusLabels, statusColors, qualityLabels, qualityColors,
  generateReport
} from '../api';
import dayjs from 'dayjs';
import SampleDetailModal from '../components/SampleDetailModal';
import ReviewModal from '../components/ReviewModal';
import ReportModal from '../components/ReportModal';

const { Search } = Input;
const { Option } = Select;

export default function Dashboard() {
  const { message } = App.useApp();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<SampleStatus | undefined>();
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importForm] = Form.useForm();

  const stats = {
    total,
    warning: samples.filter(s => s.qualityStatus === 'warning').length,
    reviewed: samples.filter(s => s.status === 'reviewed' || s.status === 'completed' || s.status === 'exported').length,
    processing: samples.filter(s => s.status === 'processing' || s.status === 'reviewing').length,
  };

  useEffect(() => {
    loadSamples();
  }, [page, pageSize, statusFilter, barcodeSearch]);

  async function loadSamples() {
    setLoading(true);
    try {
      const res = await getSamples({ page, pageSize, status: statusFilter, barcode: barcodeSearch || undefined });
      setSamples(res.data.data);
      setTotal(res.data.total);
    } catch (e: any) {
      message.error('加载样本列表失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(sample: Sample, newStatus: SampleStatus, reason?: string) {
    try {
      await updateSampleStatus(sample.id, newStatus, reason);
      message.success('状态更新成功');
      loadSamples();
    } catch (e: any) {
      message.error('状态更新失败: ' + e.message);
    }
  }

  async function handleViewDetail(sample: Sample) {
    setSelectedSample(sample);
    setDetailModalOpen(true);
  }

  async function handleReview(sample: Sample) {
    setSelectedSample(sample);
    setReviewModalOpen(true);
  }

  async function handleViewReport(sample: Sample) {
    setSelectedSample(sample);
    setReportModalOpen(true);
  }

  async function handleExportSelected() {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的样本');
      return;
    }
    try {
      const res = await exportReports(selectedRowKeys as number[]);
      downloadBlob(res.data, `细菌耐药谱报告_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      message.success(`已导出 ${selectedRowKeys.length} 份报告`);
    } catch (e: any) {
      message.error('导出失败: ' + e.message);
    }
  }

  async function handleImportManual() {
    try {
      const values = await importForm.validateFields();
      await importSamples([values]);
      message.success('导入成功');
      setImportModalOpen(false);
      importForm.resetFields();
      loadSamples();
    } catch (e: any) {
      message.error('导入失败: ' + e.message);
    }
  }

  async function handleFileUpload(file: File) {
    try {
      const res = await importSamplesByFile(file);
      message.success(res.data.message || `成功导入 ${res.data.count} 条记录`);
      setImportModalOpen(false);
      loadSamples();
    } catch (e: any) {
      message.error('导入失败: ' + e.message);
    }
    return false;
  }

  const columns = [
    {
      title: '样本条码',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 160,
      render: (text: string, record: Sample) => (
        <Space>
          <span style={{ fontFamily: 'monospace' }}>{text}</span>
          {record.hasDuplicateBarcode && (
            <Tag color="orange" className="tag-duplicate">条码重复</Tag>
          )}
          {record.hasMissingTimePoint && (
            <Tag color="blue" className="tag-timepoint">时间缺失</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '样本名称',
      dataIndex: 'sampleName',
      key: 'sampleName',
      width: 180,
    },
    {
      title: '细菌名称',
      dataIndex: 'bacteriaName',
      key: 'bacteriaName',
      width: 140,
    },
    {
      title: '耐药谱',
      dataIndex: 'resistanceProfile',
      key: 'resistanceProfile',
      width: 280,
      ellipsis: true,
    },
    {
      title: '采集时间',
      dataIndex: 'collectionTime',
      key: 'collectionTime',
      width: 160,
      render: (text: string) => text || <Tag color="default">未填写</Tag>,
    },
    {
      title: '质量状态',
      dataIndex: 'qualityStatus',
      key: 'qualityStatus',
      width: 100,
      render: (status: string) => (
        <Tag color={qualityColors[status as keyof typeof qualityColors]}>
          {qualityLabels[status as keyof typeof qualityLabels]}
        </Tag>
      ),
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {statusLabels[status as keyof typeof statusLabels]}
        </Tag>
      ),
    },
    {
      title: '导入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: Sample) => (
        <Space size="small">
          <Button type="link" size="small" icon={<FileSearchOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'imported' || record.status === 'reviewing' ? (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleReview(record)}>
              复核
            </Button>
          ) : null}
          <Button type="link" size="small" icon={<BarChartOutlined />} onClick={() => handleViewReport(record)}>
            报告
          </Button>
          {record.status === 'imported' && (
            <Button type="link" size="small" onClick={() => handleStatusChange(record, 'reviewing', '开始复核')}>
              开始复核
            </Button>
          )}
          {record.status === 'reviewed' && (
            <Button type="link" size="small" onClick={() => handleStatusChange(record, 'processing', '进入处理')}>
              处理
            </Button>
          )}
          {record.status === 'processing' && (
            <Button type="link" size="small" onClick={() => handleStatusChange(record, 'completed', '处理完成')}>
              完成
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">🧫 细菌耐药谱看板</div>
        <div className="page-subtitle">
          微生物耐药性监测 · 质量控制 · 报告导出 · 完整追溯
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card">
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">样本总数</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div>
              <div className="stat-value" style={{ color: '#faad14' }}>{stats.warning}</div>
              <div className="stat-label">质量异常</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div>
              <div className="stat-value" style={{ color: '#1677ff' }}>{stats.processing}</div>
              <div className="stat-label">处理中</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div>
              <div className="stat-value" style={{ color: '#52c41a' }}>{stats.reviewed}</div>
              <div className="stat-label">已完成复核</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card 
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: 16 }}
        title={
          <Space>
            <SearchOutlined />
            <span>筛选条件</span>
          </Space>
        }
        extra={
          <Space>
            <Search
              placeholder="搜索样本条码"
              allowClear
              style={{ width: 220 }}
              onSearch={value => {
                setBarcodeSearch(value);
                setPage(1);
              }}
            />
            <Select
              placeholder="按状态筛选"
              allowClear
              style={{ width: 150 }}
              onChange={value => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <Option value="imported">已导入</Option>
              <Option value="reviewing">复核中</Option>
              <Option value="reviewed">已复核</Option>
              <Option value="processing">处理中</Option>
              <Option value="completed">已完成</Option>
              <Option value="exported">已导出</Option>
            </Select>
            <Button icon={<HistoryOutlined />} onClick={loadSamples}>刷新</Button>
          </Space>
        }
      >
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setImportModalOpen(true)}>
            导入样本
          </Button>
          <Button 
            icon={<ExportOutlined />} 
            onClick={handleExportSelected}
            disabled={selectedRowKeys.length === 0}
          >
            批量导出报告 ({selectedRowKeys.length})
          </Button>
          <Popconfirm
            title="清除筛选"
            description="确定要清除所有筛选条件吗？"
            onConfirm={() => {
              setStatusFilter(undefined);
              setBarcodeSearch('');
              setPage(1);
            }}
          >
            <Button>清除筛选</Button>
          </Popconfirm>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={samples}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <SampleDetailModal
        open={detailModalOpen}
        sample={selectedSample}
        onClose={() => setDetailModalOpen(false)}
        onRefresh={loadSamples}
      />

      <ReviewModal
        open={reviewModalOpen}
        sample={selectedSample}
        onClose={() => setReviewModalOpen(false)}
        onSuccess={() => {
          setReviewModalOpen(false);
          loadSamples();
        }}
      />

      <ReportModal
        open={reportModalOpen}
        sample={selectedSample}
        onClose={() => setReportModalOpen(false)}
      />

      <Modal
        title="导入样本数据"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          importForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Tabs
          items={[
            {
              key: 'file',
              label: '文件导入',
              children: (
                <div style={{ padding: '20px 0' }}>
                  <Upload.Dragger
                    accept=".csv,.xlsx,.xls"
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                    multiple={false}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
                    <p className="ant-upload-hint">
                      支持 CSV、Excel(.xlsx/.xls) 格式，表头需包含：barcode, sampleName, bacteriaName
                    </p>
                  </Upload.Dragger>
                </div>
              ),
            },
            {
              key: 'manual',
              label: '手动录入',
              children: (
                <Form
                  form={importForm}
                  layout="vertical"
                  style={{ marginTop: 20 }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="barcode"
                        label="样本条码"
                        rules={[{ required: true, message: '请输入样本条码' }]}
                      >
                        <Input placeholder="如：BAC-2026-0001" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="sampleName"
                        label="样本名称"
                        rules={[{ required: true, message: '请输入样本名称' }]}
                      >
                        <Input placeholder="如：血液培养样本-01" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="bacteriaName"
                        label="细菌名称"
                        rules={[{ required: true, message: '请输入细菌名称' }]}
                      >
                        <Input placeholder="如：金黄色葡萄球菌" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="sequencingBatch"
                        label="测序批次"
                      >
                        <Input placeholder="如：BATCH-2026-06-001" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="resistanceProfile"
                    label="耐药谱"
                  >
                    <Input.TextArea 
                      rows={3} 
                      placeholder="如：青霉素R;氨苄西林R;头孢唑啉S;万古霉素S" 
                    />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="collectionTime"
                        label="采集时间"
                      >
                        <Input placeholder="如：2026-06-01 08:30:00" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="testTime"
                        label="检测时间"
                      >
                        <Input placeholder="如：2026-06-02 10:00:00" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="notes"
                    label="备注"
                  >
                    <Input.TextArea rows={2} placeholder="其他说明信息" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" onClick={handleImportManual} block>
                      提交导入
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}

function Tabs({ items }: { items: { key: string; label: string; children: React.ReactNode }[] }) {
  const [activeKey, setActiveKey] = useState(items[0].key);
  return (
    <div>
      <div style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
        <Space>
          {items.map(item => (
            <Button
              key={item.key}
              type={activeKey === item.key ? 'primary' : 'text'}
              onClick={() => setActiveKey(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </Space>
      </div>
      {items.find(i => i.key === activeKey)?.children}
    </div>
  );
}
