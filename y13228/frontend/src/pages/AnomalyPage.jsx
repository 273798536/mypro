import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Input, Space, App as AntApp, Timeline } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, FireOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { alertsAPI, resolveAlertAPI } from '../api.js';

const LEVEL_MAP = {
  info: { label: '提示', color: 'blue' },
  warning: { label: '警告', color: 'orange' },
  danger: { label: '严重', color: 'red' },
};

const TYPE_LABEL = {
  file_mismatch: '文件名不匹配',
  duplicate_alias: '别名重复（已单独拎出）',
  program_order: '演出顺序缺失',
  source_missing: '来源缺失（排练群截图/曲目表等）',
};

export default function AnomalyPage({ refreshKey, onResolve }) {
  const { message, modal } = AntApp.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('unresolved');

  const load = () => {
    setLoading(true);
    const params = filter === 'all' ? {} : { resolved: filter === 'resolved' ? 1 : 0 };
    alertsAPI(params).then(r => setData(r)).finally(() => setLoading(false));
  };
  useEffect(load, [refreshKey, filter]);

  const onResolveOne = (row) => {
    modal.confirm({
      title: `标记已解决：${TYPE_LABEL[row.alert_type] || row.alert_type}`,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>曲目：<b>{row.track_name || '（未关联曲目）'}</b></p>
          <p style={{ marginBottom: 8 }}>异常：{row.alert_detail}</p>
          <p style={{ marginBottom: 8 }}>处理说明（会保存到记录里）：</p>
          <Input id="resolve-remark" placeholder="例如：已电话和阿蓝核对，确认无误 / 文件名已重新对齐" />
        </div>
      ),
      okText: '标记已解决',
      onOk: async () => {
        const remark = document.getElementById('resolve-remark').value;
        await resolveAlertAPI(row.id, remark);
        message.success('已解决');
        onResolve && onResolve();
      },
    });
  };

  const columns = [
    { title: '级别', dataIndex: 'alert_level', width: 80, render: v => LEVEL_MAP[v] ? <Tag color={LEVEL_MAP[v].color} icon={v === 'danger' ? <FireOutlined /> : <ExclamationCircleOutlined />}>{LEVEL_MAP[v].label}</Tag> : v },
    { title: '异常类型', dataIndex: 'alert_type', width: 180, render: v => <Tag color="purple">{TYPE_LABEL[v] || v}</Tag> },
    { title: '异常描述', dataIndex: 'alert_detail', render: v => v, ellipsis: true },
    { title: '关联曲目', width: 160, render: (_, r) => r.track_name ? (
      <Space direction="vertical" size={2}>
        <span style={{ fontWeight: 500 }}>{r.track_name}</span>
        <span className="small-desc">{r.file_name || '无文件名'}</span>
        {r.track_status ? <Tag>{r.track_status === 'pending' ? '待处理' : r.track_status === 'confirmed' ? '已确认' : r.track_status}</Tag> : null}
      </Space>
    ) : <span className="small-desc">（未关联曲目）</span> },
    { title: '发现时间', dataIndex: 'created_at', width: 160, render: v => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '状态', dataIndex: 'resolved', width: 100, render: v => v ? <Tag color="green" icon={<CheckCircleOutlined />}>已解决</Tag> : <Tag color="orange">待处理</Tag> },
    { title: '解决信息', width: 200, render: (_, r) => r.resolved ? (
      <Space direction="vertical" size={2}>
        <span className="small-desc">处理人：{r.resolved_by}</span>
        <span className="small-desc">{r.resolved_remark}</span>
        <span className="small-desc">{r.resolved_at && dayjs(r.resolved_at).format('MM-DD HH:mm')}</span>
      </Space>
    ) : '-' },
    { title: '操作', width: 100, fixed: 'right', render: (_, r) => !r.resolved && (
      <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => onResolveOne(r)}>解决</Button>
    ) },
  ];

  const unresolved = data.filter(r => !r.resolved).length;
  const danger = data.filter(r => !r.resolved && r.alert_level === 'danger').length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <Space>
          <Button type={filter === 'unresolved' ? 'primary' : 'default'} onClick={() => setFilter('unresolved')}>
            待处理 {filter === 'unresolved' ? `(${unresolved})` : ''}
          </Button>
          <Button type={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')}>全部 ({data.length})</Button>
          <Button type={filter === 'resolved' ? 'primary' : 'default'} onClick={() => setFilter('resolved')}>已解决</Button>
        </Space>
        <Space style={{ marginLeft: 'auto' }}>
          {danger > 0 && <Tag color="red" icon={<FireOutlined />}>严重异常 {danger} 条，请优先处理别名冲突</Tag>}
        </Space>
        <Button onClick={load}>刷新</Button>
      </div>
      <Table
        rowKey="id" dataSource={data} columns={columns} size="middle"
        loading={loading}
        scroll={{ x: 1300 }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
      />
      <div style={{ marginTop: 20, padding: 16, background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#ad6800' }}>💡 说明</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#613400' }}>
          <li><b>文件名不匹配</b>：曲名和文件名在去掉特殊字符后互相不包含（保住了来源和处理状态。</li>
          <li><b>别名重复</b>：多条曲目共享同一别名 —— <b>已单独拎出到「别名冲突」页</b>，避免混进正常结果。</li>
          <li><b>来源缺失</b>：排练群截图、曲目表等来源字段为空 —— 至少要把「来源」和「处理状态」保住。</li>
          <li><b>演出顺序缺失</b>：正场曲目没有 program_order，可在「曲目清单」编辑补充。</li>
        </ul>
      </div>
    </div>
  );
}
