import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  Form,
  Input,
  message,
  Descriptions,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { anomaliesApi, recordsApi } from '../api';
import type { AnomalyRecord } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const AnomaliesPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnomalyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [editModal, setEditModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<AnomalyRecord | null>(null);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    anomaliesApi.list(statusFilter ? { status: statusFilter } : undefined).then((d) => {
      setData(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleEdit = (item: AnomalyRecord) => {
    setCurrentItem(item);
    form.setFieldsValue({
      anomaly_type: item.anomaly_type,
      status: item.status,
      handler: item.handler,
      notes: item.notes,
      original_description: item.original_description,
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!currentItem) return;
    try {
      const values = await form.validateFields();
      await anomaliesApi.update(currentItem.id, {
        ...values,
        record_id: currentItem.record_id,
      });
      message.success('已更新异常处理状态');
      setEditModal(false);
      fetchData();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const goToRecord = async (recordId: number) => {
    const rec = await recordsApi.get(recordId);
    navigate(`/records/${recordId}`);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '异常类型',
      dataIndex: 'anomaly_type',
      width: 130,
      render: (v: string) => (
        <Tag color={v.includes('pollution') ? 'red' : 'gold'}>
          {v.includes('pollution') ? '验证集污染' : v || '异常'}
        </Tag>
      ),
    },
    {
      title: '原始描述（可追溯到评测结果原话）',
      dataIndex: 'original_description',
      ellipsis: true,
      render: (v: string) => (
        <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>{v}</span>
      ),
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'resolved' ? 'green' : v === 'processing' ? 'orange' : 'red'}>
          {v === 'resolved' ? '已处理' : v === 'processing' ? '处理中' : '待处理'}
        </Tag>
      ),
    },
    { title: '处理人', dataIndex: 'handler', width: 100, render: (v: string) => v || '-' },
    { title: '处理备注', dataIndex: 'notes', ellipsis: true, render: (v: string) => v || '-' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, r: AnomalyRecord) => (
        <Space>
          <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => goToRecord(r.record_id)}>
            查看记录
          </Button>
          <Button size="small" onClick={() => handleEdit(r)}>
            处理
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="异常追踪台（验证集污染不再是一句含糊警告）"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <span style={{ color: '#666' }}>状态：</span>
            <Select
              style={{ width: 140 }}
              value={statusFilter}
              allowClear
              placeholder="全部"
              onChange={setStatusFilter}
            >
              <Option value="open">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已处理</Option>
            </Select>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 15 }}
          expandable={{
            expandedRowRender: (record) => (
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="异常类型">{record.anomaly_type}</Descriptions.Item>
                <Descriptions.Item label="关联记录 ID">#{record.record_id}</Descriptions.Item>
                <Descriptions.Item label="原始描述（溯源）" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap', background: '#fffbe6', padding: 8, borderRadius: 4 }}>
                    {record.original_description}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="处理人" span={2}>{record.handler || '未分配'}</Descriptions.Item>
                <Descriptions.Item label="处理备注" span={2}>
                  {record.notes || '暂无处理备注'}
                </Descriptions.Item>
              </Descriptions>
            ),
          }}
        />
      </Card>

      <Modal
        title="处理异常 / 验证集污染"
        open={editModal}
        onCancel={() => setEditModal(false)}
        onOk={handleSave}
        width={560}
        okText="保存处理结果"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="异常类型" name="anomaly_type">
            <Select>
              <Option value="anomaly">普通异常</Option>
              <Option value="pollution">验证集污染</Option>
              <Option value="anomaly+pollution">异常 + 污染</Option>
            </Select>
          </Form.Item>
          <Form.Item label="处理状态" name="status">
            <Select>
              <Option value="open">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已处理</Option>
            </Select>
          </Form.Item>
          <Form.Item label="处理人" name="handler">
            <Input placeholder="如：小林" />
          </Form.Item>
          <Form.Item label="原始描述（不可编辑，用于溯源）" name="original_description">
            <TextArea rows={3} disabled />
          </Form.Item>
          <Form.Item label="处理备注" name="notes">
            <TextArea rows={3} placeholder="说明处理方式、结论..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AnomaliesPage;
