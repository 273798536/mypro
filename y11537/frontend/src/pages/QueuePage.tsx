import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Drawer,
  Descriptions,
  Form,
  Modal,
  message,
  Spin,
  Tooltip,
  Card
} from 'antd';
import {
  EyeOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  StopOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface QueueItem {
  id: number;
  queueNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: string;
  status: string;
  retryCategory: string;
  retryCount: number;
  maxRetryCount?: number;
  source: string;
  errorMessage?: string;
  nextRetryTime?: string;
  createdAt: string;
  isProxy: boolean;
  originalData?: any;
}

const statusColors: Record<string, string> = {
  pending: 'gold',
  processing: 'blue',
  retrying: 'cyan',
  success: 'green',
  failed: 'red',
  dead_letter: 'red',
  manual_review: 'purple',
  compensated: 'geekblue',
  closed: 'default'
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  retrying: '重试中',
  success: '成功',
  failed: '失败',
  dead_letter: '死信',
  manual_review: '待人工审核',
  compensated: '已补偿入账',
  closed: '已关闭'
};

const categoryLabels: Record<string, string> = {
  network_error: '网络错误',
  data_conflict: '数据冲突',
  validation_error: '验证错误',
  duplicate_record: '重复记录',
  missing_data: '数据缺失',
  system_error: '系统错误',
  unknown: '未知错误'
};

const sourceLabels: Record<string, string> = {
  registration_form: '报名表',
  signin_qrcode: '签到二维码',
  homework: '课后作业',
  manual_price: '手工改价表',
  history_archive: '历史压缩包'
};

function QueuePage() {
  const [data, setData] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [takeoverVisible, setTakeoverVisible] = useState(false);
  const [closeVisible, setCloseVisible] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [takeoverForm] = Form.useForm();
  const [closeForm] = Form.useForm();
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    status: '',
    retryCategory: '',
    source: '',
    employeeId: '',
    dateRange: null as any
  });

  useEffect(() => {
    fetchData();
  }, [page, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
        status: filters.status || undefined,
        retryCategory: filters.retryCategory || undefined,
        source: filters.source || undefined,
        employeeId: filters.employeeId || undefined
      };

      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/queue', { params });
      setData(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      message.error('获取队列数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (item: QueueItem) => {
    setSelectedItem(item);
    try {
      const response = await api.get(`/queue/${item.id}`);
      setAuditLogs(response.data.auditLogs || []);
    } catch (error) {
      message.error('获取详情失败');
    }
    setDetailVisible(true);
  };

  const handleManualTakeover = async (values: any) => {
    if (!selectedItem) return;
    try {
      await api.post(`/queue/${selectedItem.id}/manual-takeover`, {
        correctedData: values.correctedData ? JSON.parse(values.correctedData) : null,
        handleRemark: values.handleRemark
      });
      message.success('人工接管成功');
      setTakeoverVisible(false);
      takeoverForm.resetFields();
      fetchData();
      setDetailVisible(false);
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleCompensate = async () => {
    if (!selectedItem) return;
    Modal.confirm({
      title: '确认补偿入账',
      content: '确认将此记录补偿入账吗？入账后将创建正式签到记录。',
      onOk: async () => {
        try {
          await api.post(`/queue/${selectedItem.id}/compensate`, {
            closeReason: '人工审核通过，补偿入账'
          });
          message.success('补偿入账成功');
          fetchData();
          setDetailVisible(false);
        } catch (error: any) {
          message.error(error.response?.data?.error || '操作失败');
        }
      }
    });
  };

  const handleClose = async (values: any) => {
    if (!selectedItem) return;
    try {
      await api.post(`/queue/${selectedItem.id}/close`, {
        closeReason: values.closeReason
      });
      message.success('关闭成功');
      setCloseVisible(false);
      closeForm.resetFields();
      fetchData();
      setDetailVisible(false);
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleRetry = async (item: QueueItem) => {
    Modal.confirm({
      title: '确认重试',
      content: '确认重新加入重试队列吗？',
      onOk: async () => {
        try {
          await api.post(`/queue/${item.id}/retry`);
          message.success('已加入重试队列');
          fetchData();
        } catch (error: any) {
          message.error(error.response?.data?.error || '操作失败');
        }
      }
    });
  };

  const canTakeover = user?.role === 'supervisor' || user?.role === 'reviewer';
  const canCompensate = user?.role === 'supervisor';
  const canClose = user?.role === 'supervisor';
  const canRetry = user?.role !== 'read_only';

  const columns: ColumnsType<QueueItem> = [
    {
      title: '队列编号',
      dataIndex: 'queueNo',
      width: 140,
      render: (text) => <code>{text}</code>
    },
    {
      title: '员工信息',
      dataIndex: 'employeeName',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.employeeName}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.employeeId}</div>
        </div>
      )
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 120
    },
    {
      title: '培训信息',
      dataIndex: 'trainingName',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{record.trainingName}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.trainingDate}
          </div>
        </div>
      )
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      render: (text) => sourceLabels[text] || text
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (text) => (
        <Tag color={statusColors[text]} className="status-tag">
          {statusLabels[text] || text}
        </Tag>
      )
    },
    {
      title: '错误分类',
      dataIndex: 'retryCategory',
      width: 120,
      render: (text) => categoryLabels[text] || text
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      width: 80,
      render: (text, record) => (
        <span>
          {text}/{record.maxRetryCount || 5}
        </span>
      )
    },
    {
      title: '代签',
      dataIndex: 'isProxy',
      width: 60,
      render: (text) => text ? <Tag color="orange">是</Tag> : '否'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {canRetry && !['success', 'compensated', 'closed'].includes(record.status) && (
            <Tooltip title="手动重试">
              <Button
                type="link"
                size="small"
                icon={<RollbackOutlined />}
                onClick={() => handleRetry(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">补偿队列</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={[16, 16]}>
          <Select
            placeholder="状态"
            style={{ width: 140 }}
            allowClear
            value={filters.status || undefined}
            onChange={(v) => setFilters({ ...filters, status: v })}
          >
            {Object.entries(statusLabels).map(([key, label]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="错误分类"
            style={{ width: 140 }}
            allowClear
            value={filters.retryCategory || undefined}
            onChange={(v) => setFilters({ ...filters, retryCategory: v })}
          >
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="数据来源"
            style={{ width: 140 }}
            allowClear
            value={filters.source || undefined}
            onChange={(v) => setFilters({ ...filters, source: v })}
          >
            {Object.entries(sourceLabels).map(([key, label]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>
          <Input
            placeholder="员工ID"
            style={{ width: 140 }}
            allowClear
            value={filters.employeeId}
            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
          />
          <RangePicker
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />
          <Button type="primary" onClick={fetchData}>
            查询
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (p) => setPage(p)
          }}
          scroll={{ x: 1400 }}
          className="queue-table"
        />
      </Card>

      <Drawer
        title="队列详情"
        placement="right"
        width={640}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        className="detail-drawer"
      >
        {selectedItem && (
          <Spin spinning={!selectedItem}>
            <div className="detail-section">
              <div className="detail-section-title">基本信息</div>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="队列编号">{selectedItem.queueNo}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusColors[selectedItem.status]}>
                    {statusLabels[selectedItem.status]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="员工姓名">{selectedItem.employeeName}</Descriptions.Item>
                <Descriptions.Item label="员工ID">{selectedItem.employeeId}</Descriptions.Item>
                <Descriptions.Item label="部门" span={2}>{selectedItem.department}</Descriptions.Item>
                <Descriptions.Item label="培训名称" span={2}>{selectedItem.trainingName}</Descriptions.Item>
                <Descriptions.Item label="培训日期">{selectedItem.trainingDate}</Descriptions.Item>
                <Descriptions.Item label="数据来源">{sourceLabels[selectedItem.source]}</Descriptions.Item>
                <Descriptions.Item label="错误分类">{categoryLabels[selectedItem.retryCategory]}</Descriptions.Item>
                <Descriptions.Item label="重试次数">{selectedItem.retryCount}/{selectedItem.maxRetryCount || 5}</Descriptions.Item>
                <Descriptions.Item label="是否代签" span={2}>
                  {selectedItem.isProxy ? '是' : '否'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {selectedItem.errorMessage && (
              <div className="detail-section">
                <div className="detail-section-title">错误信息</div>
                <pre style={{
                  background: '#fff1f0',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: '#cf1322'
                }}>
                  {selectedItem.errorMessage}
                </pre>
              </div>
            )}

            {auditLogs.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">操作轨迹</div>
                {auditLogs.map((log: any) => (
                  <div key={log.id} style={{
                    padding: '12px',
                    background: '#fafafa',
                    borderRadius: 4,
                    marginBottom: 8
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{log.operatorName || '系统'}</span>
                      <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                        {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </span>
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <div>操作: {log.action}</div>
                      {log.changeReason && <div>原因: {log.changeReason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              {canTakeover && selectedItem.status === 'dead_letter' && (
                <Button
                  type="primary"
                  icon={<UserOutlined />}
                  onClick={() => {
                    setTakeoverVisible(true);
                    takeoverForm.setFieldsValue({
                      correctedData: JSON.stringify(selectedItem.originalData || {}, null, 2),
                      handleRemark: ''
                    });
                  }}
                >
                  人工接管
                </Button>
              )}
              {canCompensate && selectedItem.status === 'manual_review' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleCompensate}
                >
                  补偿入账
                </Button>
              )}
              {canRetry && !['success', 'compensated', 'closed'].includes(selectedItem.status) && (
                <Button
                  icon={<SyncOutlined />}
                  onClick={() => handleRetry(selectedItem)}
                >
                  手动重试
                </Button>
              )}
              {canClose && !['success', 'compensated', 'closed'].includes(selectedItem.status) && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => setCloseVisible(true)}
                >
                  关闭
                </Button>
              )}
            </div>
          </Spin>
        )}
      </Drawer>

      <Modal
        title="人工接管"
        open={takeoverVisible}
        onCancel={() => setTakeoverVisible(false)}
        onOk={() => takeoverForm.submit()}
        width={600}
      >
        <Form form={takeoverForm} onFinish={handleManualTakeover} layout="vertical">
          <Form.Item
            name="correctedData"
            label="修正后数据 (JSON格式)"
            rules={[{ required: true, message: '请输入修正后数据' }]}
          >
            <TextArea rows={8} placeholder="请输入JSON格式的修正数据" />
          </Form.Item>
          <Form.Item
            name="handleRemark"
            label="处理备注"
            rules={[{ required: true, message: '请输入处理备注' }]}
          >
            <TextArea rows={3} placeholder="请说明处理原因和依据" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="关闭队列项"
        open={closeVisible}
        onCancel={() => setCloseVisible(false)}
        onOk={() => closeForm.submit()}
      >
        <Form form={closeForm} onFinish={handleClose} layout="vertical">
          <Form.Item
            name="closeReason"
            label="关闭原因"
            rules={[{ required: true, message: '请输入关闭原因' }]}
          >
            <TextArea rows={4} placeholder="请说明关闭原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default QueuePage;
