import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  message,
  Tag,
  Drawer,
  Descriptions,
  Modal,
  Form,
  Input
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface FailedRecord {
  id: number;
  failureNo: string;
  source: string;
  recordType: string;
  retryCategory: string;
  errorMessage: string;
  errorDetail?: string;
  originalData?: any;
  isResolved: boolean;
  resolutionMethod?: string;
  resolutionRemark?: string;
  affectedReportFields?: string[];
  excludedFromReport: boolean;
  createdAt: string;
}

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

function FailedRecordsPage() {
  const [data, setData] = useState<FailedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedItem, setSelectedItem] = useState<FailedRecord | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [resolveVisible, setResolveVisible] = useState(false);
  const [resolveForm] = Form.useForm();
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    source: '',
    retryCategory: '',
    isResolved: '',
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
        source: filters.source || undefined,
        retryCategory: filters.retryCategory || undefined,
        isResolved: filters.isResolved === '' ? undefined : filters.isResolved
      };

      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/reports/failed-records', { params });
      setData(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      message.error('获取失败记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (filters.source) params.source = filters.source;
      if (filters.retryCategory) params.retryCategory = filters.retryCategory;
      if (filters.isResolved !== '') params.isResolved = filters.isResolved;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }

      window.open(`/api/reports/failed-records/export?${new URLSearchParams(params).toString()}`, '_blank');
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleResolve = async (values: any) => {
    if (!selectedItem) return;
    try {
      await api.post(`/queue/${selectedItem.id}/close`, {
        closeReason: values.resolutionRemark
      });
      message.success('标记已解决成功');
      setResolveVisible(false);
      resolveForm.resetFields();
      fetchData();
      setDetailVisible(false);
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const canResolve = user?.role === 'supervisor' || user?.role === 'reviewer';

  const columns: ColumnsType<FailedRecord> = [
    {
      title: '失败编号',
      dataIndex: 'failureNo',
      width: 150,
      render: (text) => <code>{text}</code>
    },
    {
      title: '数据来源',
      dataIndex: 'source',
      width: 100,
      render: (text) => sourceLabels[text] || text
    },
    {
      title: '错误分类',
      dataIndex: 'retryCategory',
      width: 120,
      render: (text) => (
        <Tag color={text === 'unknown' ? 'default' : 'warning'}>
          {categoryLabels[text] || text}
        </Tag>
      )
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      width: 250,
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'isResolved',
      width: 100,
      render: (text) => text ? (
        <Tag color="success">已解决</Tag>
      ) : (
        <Tag color="error">未解决</Tag>
      )
    },
    {
      title: '是否排除报表',
      dataIndex: 'excludedFromReport',
      width: 100,
      render: (text) => text ? <Tag color="blue">已排除</Tag> : '否'
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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedItem(record);
              setDetailVisible(true);
            }}
          >
            详情
          </Button>
          {canResolve && !record.isResolved && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setSelectedItem(record);
                setResolveVisible(true);
              }}
            >
              标记解决
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">失败记录</h1>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          导出Excel
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={[16, 16]}>
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
            placeholder="解决状态"
            style={{ width: 140 }}
            allowClear
            value={filters.isResolved === '' ? undefined : filters.isResolved}
            onChange={(v) => setFilters({ ...filters, isResolved: v })}
          >
            <Select.Option value="true">已解决</Select.Option>
            <Select.Option value="false">未解决</Select.Option>
          </Select>
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
          scroll={{ x: 1100 }}
          className="queue-table"
        />
      </Card>

      <Drawer
        title="失败详情"
        placement="right"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedItem && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="失败编号">{selectedItem.failureNo}</Descriptions.Item>
              <Descriptions.Item label="数据来源">{sourceLabels[selectedItem.source]}</Descriptions.Item>
              <Descriptions.Item label="记录类型">{selectedItem.recordType}</Descriptions.Item>
              <Descriptions.Item label="错误分类">{categoryLabels[selectedItem.retryCategory]}</Descriptions.Item>
              <Descriptions.Item label="解决状态">
                {selectedItem.isResolved ? <Tag color="success">已解决</Tag> : <Tag color="error">未解决</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="是否排除报表">
                {selectedItem.excludedFromReport ? <Tag color="blue">已排除</Tag> : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(selectedItem.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            </Descriptions>

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

            {selectedItem.errorDetail && (
              <div className="detail-section">
                <div className="detail-section-title">错误详情</div>
                <pre style={{
                  background: '#fafafa',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 11,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {selectedItem.errorDetail}
                </pre>
              </div>
            )}

            {selectedItem.originalData && (
              <div className="detail-section">
                <div className="detail-section-title">原始数据</div>
                <pre style={{
                  background: '#f0f5ff',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 11,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {JSON.stringify(selectedItem.originalData, null, 2)}
                </pre>
              </div>
            )}

            {selectedItem.affectedReportFields && selectedItem.affectedReportFields.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">受影响的报表字段</div>
                <div>
                  {selectedItem.affectedReportFields.map((field: string, i: number) => (
                    <Tag key={i} color="red">{field}</Tag>
                  ))}
                </div>
              </div>
            )}

            {selectedItem.isResolved && (
              <div className="detail-section">
                <div className="detail-section-title">解决信息</div>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="解决方式">{selectedItem.resolutionMethod}</Descriptions.Item>
                  <Descriptions.Item label="解决备注">{selectedItem.resolutionRemark}</Descriptions.Item>
                </Descriptions>
              </div>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title="标记已解决"
        open={resolveVisible}
        onCancel={() => setResolveVisible(false)}
        onOk={() => resolveForm.submit()}
      >
        <Form form={resolveForm} onFinish={handleResolve} layout="vertical">
          <Form.Item
            name="resolutionRemark"
            label="解决备注"
            rules={[{ required: true, message: '请输入解决备注' }]}
          >
            <TextArea rows={4} placeholder="请说明解决方式和依据" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default FailedRecordsPage;
