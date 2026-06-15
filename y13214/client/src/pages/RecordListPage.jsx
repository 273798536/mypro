import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Space,
  Upload,
  Modal,
  Form,
  App as AntdApp,
  Checkbox,
  Tag,
  Drawer,
  InputNumber,
  DatePicker,
  Tooltip,
  Row,
  Col
} from 'antd';
import {
  UploadOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
  HistoryOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { royaltyApi } from '../api/index.js';
import { useAppStore } from '../store/index.js';
import { StatusTag, SourceBadge, missingFields, formatTime } from '../utils/components.jsx';

const { TextArea } = Input;
const { Option } = Select;

export default function RecordListPage() {
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();
  const [searchParams] = useSearchParams();

  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const operator = useAppStore((s) => s.operator);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setFilters({ status });
  }, [searchParams]);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      if (filters.hideExpired) params.hideExpired = true;
      const data = await royaltyApi.getRecords(params);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters]);

  const parts = useMemo(() => {
    const s = new Set();
    records.forEach((r) => r.part && s.add(r.part));
    return Array.from(s);
  }, [records]);

  const columns = [
    {
      title: '作品名称',
      dataIndex: 'workTitle',
      width: 180,
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => navigate(`/records/${r.id}`)}>{v || '(未命名)'}</a>
          <SourceBadge source={r.source} />
        </Space>
      )
    },
    {
      title: '演唱者',
      dataIndex: 'singerName',
      width: 120
    },
    {
      title: '声部',
      dataIndex: 'part',
      width: 100,
      filters: parts.map((p) => ({ text: p, value: p })),
      onFilter: (v, r) => r.part === v
    },
    {
      title: '分账比例',
      dataIndex: 'shareRatio',
      width: 100,
      render: (v) => (v != null && v !== '' ? `${v}%` : '-')
    },
    {
      title: '授权到期日',
      dataIndex: 'authorizationExpiry',
      width: 130,
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <span>{v || '-'}</span>
          {r.isExpired && <Tag color="red">已过期</Tag>}
        </Space>
      ),
      sorter: (a, b) => {
        const da = a.authorizationExpiry ? new Date(a.authorizationExpiry).getTime() : 0;
        const db = b.authorizationExpiry ? new Date(b.authorizationExpiry).getTime() : 0;
        return da - db;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <StatusTag status={v} />
          {v === 'pending' && missingFields(r).length > 0 && (
            <Space size={2} wrap>
              {missingFields(r).slice(0, 2).map((m) => (
                <Tag key={m} color="orange" style={{ fontSize: 10, padding: '0 4px' }}>
                  缺{m}
                </Tag>
              ))}
            </Space>
          )}
        </Space>
      ),
      filters: [
        { text: '可放行', value: 'ready' },
        { text: '材料待补', value: 'pending' },
        { text: '授权过期', value: 'expired' }
      ],
      onFilter: (v, r) => r.status === v
    },
    {
      title: '排练/授权备注',
      dataIndex: 'rehearsalNote',
      width: 160,
      ellipsis: true
    },
    {
      title: '人工备注',
      dataIndex: 'manualNote',
      width: 160,
      ellipsis: true
    },
    {
      title: '导入时间',
      dataIndex: 'importedAt',
      width: 170,
      render: (v) => formatTime(v),
      defaultSortOrder: 'descend',
      sorter: (a, b) => new Date(a.importedAt) - new Date(b.importedAt)
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => navigate(`/records/${r.id}`)}>
            详情
          </Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(r)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  async function onDelete(r) {
    modal.confirm({
      title: '确认删除？',
      content: '删除操作会进入历史记录，可以通过版本快照回溯。',
      okButtonProps: { danger: true },
      onOk: async () => {
        await royaltyApi.deleteRecord(r.id);
        message.success('已删除');
        load();
      }
    });
  }

  function openEdit(r) {
    setEditRecord(r);
    form.setFieldsValue({
      ...r,
      authorizationExpiry: r.authorizationExpiry ? dayjs(r.authorizationExpiry) : null
    });
    setEditOpen(true);
  }

  async function handleSubmit(values) {
    const payload = {
      ...values,
      authorizationExpiry: values.authorizationExpiry
        ? values.authorizationExpiry.format('YYYY-MM-DD')
        : '',
      operator
    };
    if (editRecord) {
      await royaltyApi.updateRecord(editRecord.id, payload);
      message.success('已更新');
      setEditOpen(false);
    } else {
      await royaltyApi.createRecord(payload);
      message.success('已创建');
      setCreateOpen(false);
    }
    form.resetFields();
    load();
  }

  async function handleImport(file) {
    try {
      const r = await royaltyApi.importFile(file, operator);
      message.success(`成功导入 ${r.imported} 条记录`);
      load();
    } catch (e) {
      message.error('导入失败: ' + (e.response?.data?.error || e.message));
    }
    return false;
  }

  async function openVersions() {
    const v = await royaltyApi.getVersions();
    setVersions(v);
    setVersionOpen(true);
  }

  async function restoreVersion(id) {
    modal.confirm({
      title: '确认恢复该版本？',
      content: '当前数据会被覆盖，但会先创建一个快照以便回滚。',
      onOk: async () => {
        await royaltyApi.restoreVersion(id, operator);
        message.success('已恢复版本');
        load();
        setVersionOpen(false);
      }
    });
  }

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="搜索作品/演唱者/声部"
          style={{ width: 240 }}
          prefix={<FilterOutlined />}
          value={filters.keyword}
          onChange={(e) => setFilters({ keyword: e.target.value })}
        />
        <Select
          allowClear
          placeholder="按状态筛选"
          style={{ width: 140 }}
          value={filters.status || undefined}
          onChange={(v) => setFilters({ status: v || '' })}
        >
          <Option value="ready">可放行</Option>
          <Option value="pending">材料待补</Option>
          <Option value="expired">授权过期</Option>
        </Select>
        <Checkbox
          checked={filters.hideExpired}
          onChange={(e) => setFilters({ hideExpired: e.target.checked })}
        >
          隐藏过期记录
        </Checkbox>
        <Tooltip title="刷新会保留筛选条件（已持久化）">
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
        </Tooltip>
        <Button onClick={resetFilters}>重置筛选</Button>

        <Space style={{ marginLeft: 'auto' }}>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls,.csv">
            <Button icon={<UploadOutlined />}>导入 Excel/CSV</Button>
          </Upload>
          <Button icon={<ExportOutlined />} onClick={() => royaltyApi.exportExcel()}>
            导出
          </Button>
          <Button icon={<HistoryOutlined />} onClick={openVersions}>
            版本切换
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新增记录
          </Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={records}
        scroll={{ x: 1400 }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={editRecord ? '编辑记录' : '新增记录'}
        open={createOpen || editOpen}
        onCancel={() => {
          setCreateOpen(false);
          setEditOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="workTitle" label="作品名称" rules={[{ required: true }]}>
                <Input placeholder="如：黄河大合唱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="singerName" label="演唱者" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="part" label="声部">
                <Select allowClear placeholder="如：女高/男低">
                  <Option value="女高">女高</Option>
                  <Option value="女低">女低</Option>
                  <Option value="男高">男高</Option>
                  <Option value="男低">男低</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shareRatio" label="分账比例(%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="authorizationExpiry" label="授权到期日" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactInfo" label="联系方式">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="manualStatus" label="人工状态（覆盖自动判断）">
                <Select allowClear>
                  <Option value="ready">标记可放行</Option>
                  <Option value="pending">标记材料待补</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="rehearsalNote" label="排练/授权备注">
                <TextArea rows={2} placeholder="排练安排或授权补充说明" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="manualNote" label="人工备注">
                <TextArea rows={2} placeholder="给接手同事看的说明" />
              </Form.Item>
            </Col>
          </Row>
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button
              onClick={() => {
                setCreateOpen(false);
                setEditOpen(false);
              }}
            >
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Space>
        </Form>
      </Modal>

      <Drawer title="版本管理（版本可追溯，知道哪份最新）" open={versionOpen} onClose={() => setVersionOpen(false)} width={600}>
        {versions.length === 0 ? (
          <div style={{ color: '#8c8c8c' }}>暂无版本快照，导入或保存时会自动创建。</div>
        ) : (
          <div>
            <Tag color="green" style={{ marginBottom: 16 }}>
              当前共有 {versions.length} 个版本，第 1 条为最新
            </Tag>
            {versions.map((v, i) => (
              <div
                key={v.id}
                className="history-item"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {i === 0 && <Tag color="blue">最新</Tag>}
                    {v.label}
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
                    {v.operator} · {formatTime(v.createdAt)} · {v.recordCount} 条记录
                  </div>
                </div>
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => restoreVersion(v.id)}
                >
                  恢复此版本
                </Button>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
