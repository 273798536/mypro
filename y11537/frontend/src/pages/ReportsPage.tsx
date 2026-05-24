import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  message,
  Tag,
  Drawer,
  Descriptions
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  DiffOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface SigninRecord {
  id: number;
  signinNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: string;
  signinTime: string;
  signinType: string;
  source: string;
  isProxy: boolean;
  isCompensated: boolean;
  isValid: boolean;
  createdAt: string;
}

const signinTypeLabels: Record<string, string> = {
  normal: '正常签到',
  retry: '重试签到',
  manual: '手工签到',
  compensation: '补偿签到'
};

const sourceLabels: Record<string, string> = {
  registration_form: '报名表',
  signin_qrcode: '签到二维码',
  homework: '课后作业',
  manual_price: '手工改价表',
  history_archive: '历史压缩包'
};

function ReportsPage() {
  const [data, setData] = useState<SigninRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedItem, setSelectedItem] = useState<SigninRecord | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [diffVisible, setDiffVisible] = useState(false);
  const [diffData, setDiffData] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    department: '',
    trainingId: '',
    source: '',
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
        department: filters.department || undefined,
        trainingId: filters.trainingId || undefined,
        source: filters.source || undefined
      };

      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/reports/signin', { params });
      setData(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      message.error('获取报表数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (filters.department) params.department = filters.department;
      if (filters.trainingId) params.trainingId = filters.trainingId;
      if (filters.source) params.source = filters.source;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }

      window.open(`/api/reports/signin/export?${new URLSearchParams(params).toString()}`, '_blank');
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleViewDiff = async (record: SigninRecord) => {
    try {
      const response = await api.get(`/reports/diff/signin_record/${record.id}`);
      setDiffData(response.data.data);
      setSelectedItem(record);
      setDiffVisible(true);
    } catch (error) {
      message.error('获取差异数据失败');
    }
  };

  const columns: ColumnsType<SigninRecord> = [
    {
      title: '签到编号',
      dataIndex: 'signinNo',
      width: 150,
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
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.trainingDate}</div>
        </div>
      )
    },
    {
      title: '签到时间',
      dataIndex: 'signinTime',
      width: 160,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '签到类型',
      dataIndex: 'signinType',
      width: 100,
      render: (text) => signinTypeLabels[text] || text
    },
    {
      title: '数据来源',
      dataIndex: 'source',
      width: 100,
      render: (text) => sourceLabels[text] || text
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.isProxy && <Tag color="orange">代签</Tag>}
          {record.isCompensated && <Tag color="blue">补偿</Tag>}
          {!record.isValid && <Tag color="red">无效</Tag>}
          {record.isValid && !record.isCompensated && !record.isProxy && (
            <Tag color="green">正常</Tag>
          )}
        </Space>
      )
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
          <Button
            type="link"
            size="small"
            icon={<DiffOutlined />}
            onClick={() => handleViewDiff(record)}
          >
            变更
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">签到报表</h1>
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
          <Input
            placeholder="部门"
            style={{ width: 140 }}
            allowClear
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          />
          <Input
            placeholder="培训ID"
            style={{ width: 140 }}
            allowClear
            value={filters.trainingId}
            onChange={(e) => setFilters({ ...filters, trainingId: e.target.value })}
          />
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
          scroll={{ x: 1300 }}
          className="queue-table"
        />
      </Card>

      <Drawer
        title="签到详情"
        placement="right"
        width={500}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedItem && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="签到编号">{selectedItem.signinNo}</Descriptions.Item>
            <Descriptions.Item label="员工姓名">{selectedItem.employeeName}</Descriptions.Item>
            <Descriptions.Item label="员工ID">{selectedItem.employeeId}</Descriptions.Item>
            <Descriptions.Item label="部门">{selectedItem.department}</Descriptions.Item>
            <Descriptions.Item label="培训名称">{selectedItem.trainingName}</Descriptions.Item>
            <Descriptions.Item label="培训ID">{selectedItem.trainingId}</Descriptions.Item>
            <Descriptions.Item label="培训日期">{selectedItem.trainingDate}</Descriptions.Item>
            <Descriptions.Item label="签到时间">{dayjs(selectedItem.signinTime).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="签到类型">{signinTypeLabels[selectedItem.signinType]}</Descriptions.Item>
            <Descriptions.Item label="数据来源">{sourceLabels[selectedItem.source]}</Descriptions.Item>
            <Descriptions.Item label="是否代签">{selectedItem.isProxy ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="是否补偿">{selectedItem.isCompensated ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="是否有效">{selectedItem.isValid ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(selectedItem.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title="变更历史"
        placement="right"
        width={600}
        open={diffVisible}
        onClose={() => setDiffVisible(false)}
      >
        {diffData.length === 0 ? (
          <p style={{ color: '#8c8c8c', textAlign: 'center', padding: 50 }}>暂无变更记录</p>
        ) : (
          diffData.map((diff: any, index: number) => (
            <div key={index} className="diff-card">
              <div style={{
                padding: '12px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontWeight: 500 }}>{diff.operator} - {diff.action}</span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                  {dayjs(diff.createdAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
              {diff.changeReason && (
                <div style={{ padding: '8px 12px', background: '#e6f7ff' }}>
                  <span style={{ color: '#1890ff' }}>原因: {diff.changeReason}</span>
                </div>
              )}
              {diff.beforeData && (
                <div className="diff-before">
                  <div style={{ fontSize: 12, color: '#cf1322', marginBottom: 4 }}>变更前:</div>
                  <pre style={{
                    margin: 0,
                    fontSize: 11,
                    background: 'transparent',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {JSON.stringify(diff.beforeData, null, 2)}
                  </pre>
                </div>
              )}
              {diff.afterData && (
                <div className="diff-after">
                  <div style={{ fontSize: 12, color: '#389e0d', marginBottom: 4 }}>变更后:</div>
                  <pre style={{
                    margin: 0,
                    fontSize: 11,
                    background: 'transparent',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {JSON.stringify(diff.afterData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </Drawer>
    </div>
  );
}

export default ReportsPage;
