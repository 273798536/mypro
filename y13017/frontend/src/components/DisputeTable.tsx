import React, { useState } from 'react';
import { Table, Tag, Input, Select, Button, message, Space, Tooltip } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Dispute, STATUS_LABEL } from '../types';
import { updateRemark, updateStatus } from '../api';

interface Props {
  data: Dispute[];
  onUpdated: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending_materials', label: STATUS_LABEL.pending_materials },
  { value: 'processed', label: STATUS_LABEL.processed },
  { value: 'manual_review', label: STATUS_LABEL.manual_review }
];

const statusClass = (status: string) => {
  if (status === 'processed') return 'status-processed';
  if (status === 'manual_review') return 'status-manual';
  return 'status-pending';
};

const DisputeTable: React.FC<Props> = ({ data, onUpdated }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (record: Dispute) => {
    setEditingId(record.id);
    setEditingValue(record.remark || '');
  };

  const saveRemark = async (record: Dispute) => {
    if (editingValue === (record.remark || '')) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    try {
      await updateRemark(record.id, editingValue, '项目经理');
      message.success('备注已更新');
      setEditingId(null);
      onUpdated();
    } catch (err: any) {
      message.error('更新失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (record: Dispute, newStatus: string) => {
    try {
      await updateStatus(record.id, newStatus, '项目经理');
      message.success(`状态已更新为「${STATUS_LABEL[newStatus]}」`);
      onUpdated();
    } catch (err: any) {
      message.error('更新失败: ' + (err.response?.data?.error || err.message));
    }
  };

  const columns: ColumnsType<Dispute> = [
    {
      title: '争议款编号',
      dataIndex: 'case_no',
      key: 'case_no',
      fixed: 'left',
      width: 140,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1677ff' }}>{v}</div>
          {r.is_manual_override ? (
            <Tag color="red" style={{ marginTop: 4, fontSize: 11 }}>人工改判</Tag>
          ) : null}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v, r) => (
        <Select
          size="small"
          value={v}
          options={STATUS_OPTIONS}
          style={{ width: 110 }}
          onChange={(nv) => handleStatusChange(r, nv)}
          optionLabelProp="label"
        >
          {STATUS_OPTIONS.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>
              <span className={`status-tag ${statusClass(opt.value)}`}>{opt.label}</span>
            </Select.Option>
          ))}
        </Select>
      )
    },
    { title: '卡号', dataIndex: 'card_no', key: 'card_no', width: 140 },
    { title: '交易日期', dataIndex: 'txn_date', key: 'txn_date', width: 110 },
    {
      title: '交易金额',
      key: 'txn',
      width: 130,
      render: (_, r) => (
        <span>
          {r.txn_currency} {r.txn_amount?.toLocaleString()}
        </span>
      )
    },
    { title: '授权号', dataIndex: 'approval_no', key: 'approval_no', width: 110 },
    { title: '商户', dataIndex: 'merchant', key: 'merchant', width: 160, ellipsis: true },
    { title: '争议类型', dataIndex: 'dispute_type', key: 'dispute_type', width: 120 },
    {
      title: '税费',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      width: 90,
      render: (v) => v != null ? v.toLocaleString() : <span style={{ color: '#bfbfbf' }}>-</span>
    },
    {
      title: '汇率',
      dataIndex: 'exchange_rate',
      key: 'exchange_rate',
      width: 90,
      render: (v) => v != null ? v : <span style={{ color: '#bfbfbf' }}>-</span>
    },
    {
      title: '清算金额',
      key: 'settle',
      width: 130,
      render: (_, r) => r.settle_amount != null
        ? <span>{r.settle_currency} {r.settle_amount.toLocaleString()}</span>
        : <span style={{ color: '#bfbfbf' }}>-</span>
    },
    {
      title: '附件/凭证',
      key: 'attachments',
      width: 120,
      render: (_, r) => (
        <div>
          <div>附件总数: <strong>{r.attachment_count}</strong></div>
          {r.late_attachment_count > 0 && (
            <div style={{ color: '#722ed1', fontSize: 12, marginTop: 2 }}>
              ⚠ 晚到凭证: {r.late_attachment_count}
            </div>
          )}
        </div>
      )
    },
    {
      title: '备注 (可编辑)',
      dataIndex: 'remark',
      key: 'remark',
      width: 220,
      render: (v, r) => {
        if (editingId === r.id) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                size="small"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onPressEnter={() => saveRemark(r)}
                placeholder="输入备注..."
                autoFocus
              />
              <Button
                size="small"
                type="primary"
                loading={saving}
                onClick={() => saveRemark(r)}
              >
                保存
              </Button>
              <Button size="small" onClick={() => setEditingId(null)}>取消</Button>
            </Space.Compact>
          );
        }
        return (
          <div className="remark-editable" onClick={() => startEdit(r)}>
            <Tooltip title="点击编辑备注">
              {v ? (
                <span style={{ color: '#262626' }}>{v} <EditOutlined style={{ fontSize: 11, color: '#bfbfbf' }} /></span>
              ) : (
                <span className="remark-empty">点击添加备注 <EditOutlined style={{ fontSize: 11 }} /></span>
              )}
            </Tooltip>
          </div>
        );
      }
    },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 160 }
  ];

  return (
    <div className="section-card">
      <div className="section-title">争议款对账列表</div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        scroll={{ x: 1600 }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        size="middle"
      />
    </div>
  );
};

export default DisputeTable;
