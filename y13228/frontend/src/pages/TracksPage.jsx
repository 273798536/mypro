import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Space, Button, Input, Select, Switch, Modal, Form, InputNumber, Drawer, Descriptions, Timeline, Popconfirm, App as AntApp, Tooltip
} from 'antd';
import {
  EditOutlined, HistoryOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined, PlusOutlined, ExclamationCircleOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  tracksAPI, createTrackAPI, updateTrackAPI, deleteTrackAPI, trackHistoryAPI, downloadFile, exportHistoryUrl } from '../api.js';

const STATUS_MAP = {
  pending: { label: '待处理', color: 'orange' },
  confirmed: { label: '已确认', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
};

const ANOMALY_LABEL = {
  file_mismatch: { label: '文件名不匹配', color: 'orange' },
  duplicate_alias: { label: '别名重复', color: 'magenta' },
  source_missing: { label: '来源缺失', color: 'gold' },
  program_order: { label: '顺序缺失', color: 'blue' },
};

export default function TracksPage({ refreshKey, stats, onChange }) {
  const { message, modal } = AntApp.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: null, is_encore: null, anomaly_only: false, keyword: '' });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);

  const load = () => {
    setLoading(true);
    tracksAPI({ ...filters, offset: (page - 1) * pageSize, limit: pageSize })
      .then(r => { setData(r.list); setTotal(r.total); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [refreshKey, page, pageSize]);
  useEffect(load, [filters.status, filters.is_encore, filters.anomaly_only, filters.keyword]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_encore: false, status: 'pending' });
    setEditOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({ ...row });
    setEditOpen(true);
  };
  const onSubmit = async (values) => {
    try {
      if (editing) {
        await updateTrackAPI(editing.id, { ...values, _reason: '前端编辑备注/字段修改' });
        message.success('已更新，历史记录已保存');
      } else {
        await createTrackAPI(values);
        message.success('已新建曲目');
      }
      setEditOpen(false);
      load();
      onChange && onChange();
    } catch {}
  };
  const onDelete = async (id) => {
    await deleteTrackAPI(id);
    message.success('已删除');
    load();
    onChange && onChange();
  };
  const openDetail = async (row) => {
    setDetail(row);
    setDrawerOpen(true);
    const h = await trackHistoryAPI(row.id);
    setHistory(h);
  };

  const rowClassName = (r) => {
    if (r.anomaly_type === 'duplicate_alias') return 'track-row-conflict';
    if (r.anomaly_type === 'file_mismatch' || r.anomaly_type === 'source_missing') return 'track-row-warning';
    if (r.open_alerts > 0) return 'track-row-warning';
    return '';
  };

  const columns = [
    { title: '顺序', dataIndex: 'program_order', width: 70, render: v => v || <span className="small-desc">-</span>, sorter: (a, b) => (a.program_order || 999) - (b.program_order || 999) },
    { title: '编号', dataIndex: 'track_no', width: 80 },
    { title: '曲目名称', dataIndex: 'track_name', width: 160, render: (v, r) => (
      <Space direction="vertical" size={2}>
        <span style={{ fontWeight: 500 }}>{v}</span>
        {r.is_encore ? <Tag color="magenta" style={{ margin: 0 }}>🎤 返场曲</Tag> : null}
      </Space>
    )},
    { title: '别名', dataIndex: 'track_aliases', width: 180, render: v => v ? <span className="small-desc">{v}</span> : '-' },
    { title: '文件名', dataIndex: 'file_name', width: 200, render: (v, r) => (
      <Space direction="vertical" size={2}>
        <span>{v || <Tag color="red">未关联</Tag>}</span>
        {r.anomaly_type === 'file_mismatch' && <Tag color="orange" style={{ margin: 0 }} className="anomaly-tag">⚠ 疑似不匹配</Tag>}
      </Space>
    )},
    { title: '来源', dataIndex: 'source', width: 200, render: (v, r) => (
      <Space direction="vertical" size={2}>
        <span>{v || <Tag color="gold">缺失</Tag>}</span>
        <span className="small-desc">{r.source_type}</span>
      </Space>
    )},
    { title: '处理状态', dataIndex: 'status', width: 100, render: v => STATUS_MAP[v] ? <Tag color={STATUS_MAP[v].color}>{STATUS_MAP[v].label}</Tag> : v },
    { title: '异常', width: 130, render: (_, r) => (
      <Space direction="vertical" size={2}>
        {r.anomaly_type ? <Tag color={ANOMALY_LABEL[r.anomaly_type]?.color || 'default'}>{ANOMALY_LABEL[r.anomaly_type]?.label || r.anomaly_type}</Tag> : r.open_alerts > 0 ? <Tag color="red">未读{r.open_alerts}条</Tag> : <Tag color="green">正常</Tag>}
        <span className="small-desc">{r.anomaly_detail || ''}</span>
      </Space>
    )},
    { title: '运营备注', dataIndex: 'remark', width: 180, render: v => v ? <span title={v}>{v.length > 15 ? v.slice(0, 15) + '…' : v}</span> : '-' },
    { title: '授权备注', dataIndex: 'auth_remark', width: 160, render: v => v ? <Tag color="purple">{v}</Tag> : '-' },
    { title: '最后操作', width: 160, render: (_, r) => (
      <Space direction="vertical" size={2}>
        <span className="small-desc">操作人：{r.operator}</span>
        <span className="small-desc">{r.updated_at ? dayjs(r.updated_at).format('MM-DD HH:mm') : ''}</span>
      </Space>
    )},
    { title: '操作', width: 180, fixed: 'right', render: (_, r) => (
      <Space size="small">
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
        <Button size="small" icon={<HistoryOutlined />} onClick={() => openDetail(r)}>历史</Button>
        <Popconfirm title="确认删除？" onConfirm={() => onDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          allowClear prefix={<SearchOutlined />} placeholder="搜索曲名/别名/文件名/备注"
          style={{ width: 260 }} value={filters.keyword}
          onChange={e => setFilters({ ...filters, keyword: e.target.value })}
          onPressEnter={load}
        />
        <Select
          placeholder="处理状态" allowClear style={{ width: 130 }}
          value={filters.status}
          onChange={v => setFilters({ ...filters, status: v })}
          options={[
            { value: 'pending', label: '待处理' },
            { value: 'confirmed', label: '已确认' },
            { value: 'rejected', label: '已驳回' },
          ]}
        />
        <Select
          placeholder="是否返场" allowClear style={{ width: 130 }}
          value={filters.is_encore}
          onChange={v => setFilters({ ...filters, is_encore: v })}
          options={[
            { value: 1, label: '🎤 返场曲' },
            { value: 0, label: '正场曲目' },
          ]}
        />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Switch checked={filters.anomaly_only} onChange={c => setFilters({ ...filters, anomaly_only: c })} />
          <span className="small-desc">只看异常</span>
        </span>
        <Button icon={<PlusOutlined />} type="primary" onClick={openCreate}>新增曲目</Button>
        <Button onClick={load}>刷新</Button>
      </div>
      <Table
        rowKey="id" size="middle"
        loading={loading}
        dataSource={data}
        columns={columns}
        rowClassName={rowClassName}
        scroll={{ x: 1600 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, showQuickJumper: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: t => `共 ${t} 条`
        }}
      />

      <Modal
        title={editing ? `编辑曲目 #${editing.id}` : '新增曲目'}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        width={680}
        okText="保存"
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} style={{ paddingTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="track_no" label="曲目编号"><Input /></Form.Item>
            <Form.Item name="program_order" label="演出顺序"><InputNumber min={0} style={{ width: '100% }} /></Form.Item>
          </div>
          <Form.Item name="track_name" label="曲目名称" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="track_aliases" label="别名（逗号分隔，用于查重）"><Input placeholder="例如：青花、Blue White Porcelain" /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="file_name" label="文件名（含后缀）"><Input placeholder="例如：01-青花瓷.mp3" /></Form.Item>
            <Form.Item name="status" label="处理状态" initialValue="pending">
              <Select options={[
                { value: 'pending', label: '待处理' },
                { value: 'confirmed', label: '已确认' },
                { value: 'rejected', label: '已驳回' },
              ]} /></Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="source" label="来源（保住来源）"><Input placeholder="排练群截图-YYYY-MM-DD" /></Form.Item>
            <Form.Item name="source_type" label="来源类型" initialValue="manual"><Select options={[
              { value: 'screenshot', label: '群截图' },
              { value: 'program_sheet', label: '曲目表' },
              { value: 'encore_sheet', label: '返场确认单' },
              { value: 'old_screenshot', label: '旧截图' },
              { value: 'csv_upload', label: 'CSV导入' },
              { value: 'manual', label: '人工录入' },
            ]} /></Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="is_encore" label="是否返场曲" valuePropName="checked" initialValue={false}>
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
            <div />
          </div>
          <Form.Item name="remark" label="运营备注（前端改此备注后后端&导出同步）"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="auth_remark" label="授权备注（补入后可一键对齐文件、曲目表、清单）"><Input.TextArea rows={2} placeholder="团长授权加演-AUTHXXXX" /></Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`曲目明细 & 修改历史 #${detail?.id || ''}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={620}
        extra={<Button size="small" icon={<DownloadOutlined />} onClick={() => downloadFile(exportHistoryUrl(detail.id), `曲目_${detail?.id}_历史.csv`}>导出历史CSV</Button>}
      >
        {detail && (
          <div>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="曲目名称">{detail.track_name}</Descriptions.Item>
              <Descriptions.Item label="别名">{detail.track_aliases || '-'}</Descriptions.Item>
              <Descriptions.Item label="编号 / 顺序">{detail.track_no || '-'} / {detail.program_order || '-'}</Descriptions.Item>
              <Descriptions.Item label="文件名">{detail.file_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="返场">{detail.is_encore ? '🎤 返场曲' : '正场'}</Descriptions.Item>
              <Descriptions.Item label="来源">{detail.source || '-'} <span className="small-desc">({detail.source_type})</span></Descriptions.Item>
              <Descriptions.Item label="状态">{STATUS_MAP[detail.status]?.label || detail.status}</Descriptions.Item>
              <Descriptions.Item label="异常类型 / 详情">{detail.anomaly_type ? `${ANOMALY_LABEL[detail.anomaly_type]?.label || detail.anomaly_type} - ${detail.anomaly_detail || ''}` : '无'}</Descriptions.Item>
              <Descriptions.Item label="运营备注">{detail.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="授权备注">{detail.auth_remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="最后操作人 / 时间">{detail.operator} / {detail.updated_at}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{detail.created_at}</Descriptions.Item>
            </Descriptions>
            <div className="section-title">修改历史（阿蓝临时改判全留痕，下一班能看到全过程）</div>
            {history.length === 0 ? <div className="empty-tip">暂无修改历史</div> : (
              <Timeline
                className="alert-timeline"
                items={history.map(h => ({
                  color: h.field_name === 'status' ? 'green' : h.field_name === 'remark' ? 'blue' : h.field_name === 'auth_remark' ? 'purple' : 'gray',
                  children: (
                    <div className="history-item">
                      <div>
                        <span className="field">{fieldLabel(h.field_name)}：</span>
                        <span style={{ textDecoration: 'line-through', color: '#999' }}>{h.old_value === null || h.old_value === '' ? '(空)' : String(h.old_value)}</span>
                        <span className="change"> → {h.new_value === null || h.new_value === '' ? '(空)' : String(h.new_value)}</span>
                      </div>
                      <div className="meta">
                        <Tag className="operator-tag" color="geekblue">{h.operator || 'system'}</Tag>
                        {h.change_reason && <span style={{ marginRight: 10 }}>原因：{h.change_reason}</span>}
                        <span>{h.created_at}</span>
                      </div>
                    </div>
                  ),
                }))}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function fieldLabel(f) {
  const m = {
    track_no: '曲目编号',
    track_name: '曲目名称',
    track_aliases: '别名',
    file_name: '文件名',
    source: '来源',
    source_type: '来源类型',
    program_order: '演出顺序',
    is_encore: '是否返场',
    status: '处理状态',
    remark: '运营备注',
    auth_remark: '授权备注',
    anomaly_type: '异常类型',
    anomaly_detail: '异常详情',
  };
  return m[f] || f;
}
