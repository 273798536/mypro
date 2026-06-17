import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Popconfirm,
  InputNumber,
  Radio,
} from 'antd';
import {
  ImportOutlined,
  ExportOutlined,
  EyeOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  EditOutlined,
  LinkOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type {
  EvaluationRecord,
  Statistics,
  ModelVersion,
  EvaluationStatus,
} from '../types';
import {
  STATUS_TEXT_MAP,
  STATUS_COLOR_MAP,
  MODEL_TYPE_TEXT_MAP,
  EvaluationStatus as StatusEnum,
} from '../types';

const { Option } = Select;
const { TextArea } = Input;

export default function ListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EvaluationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [filters, setFilters] = useState({
    batchId: '',
    status: undefined as EvaluationStatus | undefined,
    modelVersionId: '',
    isDuplicate: undefined as boolean | undefined,
    hasWithdrawal: undefined as boolean | undefined,
  });

  const [withdrawModal, setWithdrawModal] = useState<{
    visible: boolean;
    record: EvaluationRecord | null;
  }>({ visible: false, record: null });
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    record: EvaluationRecord | null;
  }>({ visible: false, record: null });
  const [reviseModal, setReviseModal] = useState<{
    visible: boolean;
    record: EvaluationRecord | null;
  }>({ visible: false, record: null });
  const [linkModal, setLinkModal] = useState<{
    visible: boolean;
    record: EvaluationRecord | null;
  }>({ visible: false, record: null });
  const [importModal, setImportModal] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedModelVersion, setSelectedModelVersion] = useState('');
  const [form] = Form.useForm();
  const [reviseForm] = Form.useForm();
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadStatistics();
    loadModelVersions();
  }, [pagination, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getEvaluations({
        ...filters,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(result.list);
      setTotal(result.total);
    } catch (e: any) {
      message.error(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const result = await api.getStatistics(filters.batchId || undefined);
      setStatistics(result);
    } catch (e: any) {
      console.error('加载统计数据失败:', e);
    }
  };

  const loadModelVersions = async () => {
    try {
      const result = await api.getModelVersions();
      setModelVersions(result);
      if (result.length > 0 && !selectedModelVersion) {
        setSelectedModelVersion(result[0].id);
      }
    } catch (e: any) {
      console.error('加载模型版本失败:', e);
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
  };

  const handleReset = () => {
    setFilters({
      batchId: '',
      status: undefined,
      modelVersionId: '',
      isDuplicate: undefined,
      hasWithdrawal: undefined,
    });
    setPagination({ ...pagination, page: 1 });
  };

  const handleExport = () => {
    api.exportCsv(filters.batchId || undefined, filters.status);
    message.success('CSV导出已开始');
  };

  const handleImport = async () => {
    if (!selectedModelVersion) {
      message.error('请选择模型版本');
      return;
    }
    if (fileList.length === 0) {
      message.error('请上传CSV文件');
      return;
    }

    setImportLoading(true);
    try {
      const result = await api.importCsv(
        fileList[0].originFileObj!,
        selectedModelVersion
      );
      message.success(
        `导入成功：共${result.total}条，成功${result.success}条，重复${result.duplicates}条，失败${result.failed}条`
      );
      if (result.errors.length > 0) {
        Modal.warning({
          title: '导入警告',
          content: (
            <div>
              <p>以下行导入失败：</p>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ),
        });
      }
      setImportModal(false);
      setFileList([]);
      loadData();
      loadStatistics();
    } catch (e: any) {
      message.error(e.message || '导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const handleWithdraw = async (values: any) => {
    if (!withdrawModal.record) return;
    try {
      await api.withdraw(withdrawModal.record.id, values);
      message.success('撤回成功');
      setWithdrawModal({ visible: false, record: null });
      form.resetFields();
      loadData();
      loadStatistics();
    } catch (e: any) {
      message.error(e.message || '撤回失败');
    }
  };

  const handleConfirm = async (values: any) => {
    if (!confirmModal.record) return;
    try {
      await api.confirm(confirmModal.record.id, values);
      message.success('确认成功');
      setConfirmModal({ visible: false, record: null });
      form.resetFields();
      loadData();
      loadStatistics();
    } catch (e: any) {
      message.error(e.message || '确认失败');
    }
  };

  const handleRevise = async (values: any) => {
    if (!reviseModal.record) return;
    try {
      await api.revise(reviseModal.record.id, values);
      message.success('改判成功');
      setReviseModal({ visible: false, record: null });
      reviseForm.resetFields();
      loadData();
      loadStatistics();
    } catch (e: any) {
      message.error(e.message || '改判失败');
    }
  };

  const handleLinkConclusion = async (values: any) => {
    if (!linkModal.record) return;
    try {
      await api.linkConclusion(linkModal.record.id, values);
      message.success('关联成功');
      setLinkModal({ visible: false, record: null });
      form.resetFields();
      loadData();
    } catch (e: any) {
      message.error(e.message || '关联失败');
    }
  };

  const statCards = statistics
    ? [
        { label: '总记录数', value: statistics.total, color: '#1677ff' },
        { label: '已评测', value: statistics.evaluated, color: '#52c41a' },
        { label: '正确', value: statistics.correct, color: '#52c41a' },
        { label: '错误', value: statistics.incorrect, color: '#ff4d4f' },
        { label: '准确率', value: `${statistics.accuracy}%`, color: '#faad14' },
        { label: '已撤回', value: statistics.withdrawn, color: '#faad14' },
        { label: '已确认', value: statistics.confirmed, color: '#13c2c2' },
        { label: '重复评测', value: statistics.duplicates, color: '#722ed1' },
      ]
    : [];

  const columns = [
    {
      title: '病历ID',
      dataIndex: 'medicalRecordId',
      key: 'medicalRecordId',
      width: 120,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '问题ID',
      dataIndex: 'questionId',
      key: 'questionId',
      width: 80,
    },
    {
      title: '问题内容',
      dataIndex: 'questionContent',
      key: 'questionContent',
      width: 200,
      ellipsis: true,
    },
    {
      title: '模型',
      key: 'model',
      width: 150,
      render: (_: any, record: EvaluationRecord) => (
        <Space direction="vertical" size={0}>
          <span>{record.modelVersion.name}</span>
          <Tag color={record.modelVersion.type === 'NEW' ? 'green' : record.modelVersion.type === 'OLD' ? 'default' : 'blue'}>
            {MODEL_TYPE_TEXT_MAP[record.modelVersion.type]}
          </Tag>
        </Space>
      ),
    },
    {
      title: '是否正确',
      key: 'isCorrect',
      width: 100,
      render: (_: any, record: EvaluationRecord) => {
        if (record.isCorrect === undefined) return '-';
        return record.isCorrect ? (
          <Tag color="success">正确</Tag>
        ) : (
          <Tag color="error">错误</Tag>
        );
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (val: number | undefined) =>
        val !== undefined ? `${(val * 100).toFixed(1)}%` : '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: any, record: EvaluationRecord) => (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_COLOR_MAP[record.status]}>
            {record.statusText}
          </Tag>
          <Space size={4}>
            {record.isDuplicate && <Tag color="default">重复</Tag>}
            {record.hasWithdrawal && <Tag color="warning">有撤回</Tag>}
            {record.revisionComparison && (
              <Tag color="purple">有改判</Tag>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_: any, record: EvaluationRecord) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/detail/${record.id}`)}
          >
            详情
          </Button>
          {record.status !== StatusEnum.WITHDRAWN &&
            record.status !== StatusEnum.DUPLICATE && (
              <Button
                type="link"
                size="small"
                danger
                icon={<RollbackOutlined />}
                onClick={() =>
                  setWithdrawModal({ visible: true, record })
                }
              >
                撤回
              </Button>
            )}
          {record.status === StatusEnum.EVALUATED && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => setConfirmModal({ visible: true, record })}
            >
              确认
            </Button>
          )}
          {(record.status === StatusEnum.EVALUATED ||
            record.status === StatusEnum.CONFIRMED) && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setReviseModal({ visible: true, record })}
            >
              改判
            </Button>
          )}
          {record.status === StatusEnum.WITHDRAWN &&
            !record.finalConclusionId && (
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => setLinkModal({ visible: true, record })}
              >
                关联结论
              </Button>
            )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((stat, i) => (
          <Col span={3} key={i}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        style={{ marginBottom: 16 }}
        title="筛选条件"
        extra={
          <Space>
            <Button onClick={handleReset}>重置</Button>
            <Button type="primary" onClick={handleSearch}>
              查询
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>批次ID</div>
            <Input
              placeholder="请输入批次ID"
              value={filters.batchId}
              onChange={(e) =>
                setFilters({ ...filters, batchId: e.target.value })
              }
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>状态</div>
            <Select
              placeholder="请选择状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(val) => setFilters({ ...filters, status: val })}
            >
              {Object.entries(STATUS_TEXT_MAP).map(([key, text]) => (
                <Option key={key} value={key}>
                  {text}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>模型版本</div>
            <Select
              placeholder="请选择模型版本"
              allowClear
              style={{ width: '100%' }}
              value={filters.modelVersionId}
              onChange={(val) =>
                setFilters({ ...filters, modelVersionId: val })
              }
            >
              {modelVersions.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.name} ({MODEL_TYPE_TEXT_MAP[m.type]})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>是否重复</div>
            <Select
              placeholder="全部"
              allowClear
              style={{ width: '100%' }}
              value={
                filters.isDuplicate === true
                  ? 'true'
                  : filters.isDuplicate === false
                  ? 'false'
                  : undefined
              }
              onChange={(val) =>
                setFilters({
                  ...filters,
                  isDuplicate: val ? val === 'true' : undefined,
                })
              }
            >
              <Option value="true">是</Option>
              <Option value="false">否</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card
        title="评测记录列表"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportModal(true)}
            >
              导入CSV
            </Button>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              导出CSV
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setPagination({ page, pageSize }),
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="撤回记录"
        open={withdrawModal.visible}
        onCancel={() => setWithdrawModal({ visible: false, record: null })}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleWithdraw}>
          <Form.Item
            name="reason"
            label="撤回原因"
            rules={[{ required: true, message: '请输入撤回原因' }]}
          >
            <TextArea rows={4} placeholder="请输入撤回原因" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认撤回
              </Button>
              <Button
                onClick={() =>
                  setWithdrawModal({ visible: false, record: null })
                }
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="人工确认"
        open={confirmModal.visible}
        onCancel={() => setConfirmModal({ visible: false, record: null })}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleConfirm}>
          <Form.Item
            name="confirmReason"
            label="确认说明（可选）"
          >
            <TextArea rows={3} placeholder="请输入确认说明" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认
              </Button>
              <Button
                onClick={() =>
                  setConfirmModal({ visible: false, record: null })
                }
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="改判记录"
        open={reviseModal.visible}
        onCancel={() => setReviseModal({ visible: false, record: null })}
        footer={null}
        width={600}
      >
        <Form
          form={reviseForm}
          layout="vertical"
          onFinish={handleRevise}
          initialValues={{
            isCorrect: reviseModal.record?.isCorrect ?? true,
          }}
        >
          <Form.Item
            name="isCorrect"
            label="新的判定结果"
            rules={[{ required: true, message: '请选择判定结果' }]}
          >
            <Radio.Group>
              <Radio value={true}>正确</Radio>
              <Radio value={false}>错误</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="judgeReason"
            label="新的判定理由"
            rules={[{ required: true, message: '请输入判定理由' }]}
          >
            <TextArea rows={3} placeholder="请输入新的判定理由" />
          </Form.Item>
          <Form.Item
            name="revisionReason"
            label="改判原因"
            rules={[{ required: true, message: '请输入改判原因' }]}
          >
            <TextArea rows={3} placeholder="请说明为什么需要改判" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认改判
              </Button>
              <Button
                onClick={() =>
                  setReviseModal({ visible: false, record: null })
                }
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="关联最终结论"
        open={linkModal.visible}
        onCancel={() => setLinkModal({ visible: false, record: null })}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleLinkConclusion}>
          <Form.Item
            name="conclusionId"
            label="结论记录ID"
            rules={[{ required: true, message: '请输入结论记录ID' }]}
          >
            <Input placeholder="请输入作为最终结论的记录ID" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认关联
              </Button>
              <Button
                onClick={() => setLinkModal({ visible: false, record: null })}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入CSV"
        open={importModal}
        onCancel={() => {
          setImportModal(false);
          setFileList([]);
        }}
        footer={
          <Space>
            <Button
              onClick={() => {
                setImportModal(false);
                setFileList([]);
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={importLoading}
              onClick={handleImport}
            >
              确认导入
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>选择模型版本</div>
          <Select
            style={{ width: '100%' }}
            value={selectedModelVersion}
            onChange={setSelectedModelVersion}
          >
            {modelVersions.map((m) => (
              <Option key={m.id} value={m.id}>
                {m.name} ({MODEL_TYPE_TEXT_MAP[m.type]})
              </Option>
            ))}
          </Select>
        </div>
        <div style={{ marginBottom: 8 }}>上传CSV文件</div>
        <Upload
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={() => false}
          accept=".csv"
          maxCount={1}
        >
          <Button icon={<FileTextOutlined />}>选择文件</Button>
        </Upload>
        <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
          CSV文件需包含以下列：病历ID、问题ID、问题内容、模型回答
        </div>
      </Modal>
    </div>
  );
}
