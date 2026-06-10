import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Space, Tag, Button, Modal, Descriptions, Progress } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getBatches, getBatchDetail } from '../api.js';

const statusColor = {
  通过: 'green', '不通过': 'red', '待确认': 'orange'
};

function BatchList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const load = () => {
    setLoading(true);
    getBatches({ keyword }).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = (id) => {
    getBatchDetail(id).then(d => { setDetail(d); setDetailVisible(true); });
  };

  const columns = [
    { title: '批次号', dataIndex: 'batch_no', width: 140, render: v => <code>{v}</code> },
    { title: '试剂名称', dataIndex: 'reagent_name', width: 120 },
    { title: '规格', dataIndex: 'specification', width: 140 },
    { title: '生产厂家', dataIndex: 'manufacturer', ellipsis: true },
    { title: '到货日期', dataIndex: 'arrival_date', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 100,
      render: (v, r) => v ? `${v} ${r.unit || ''}` : '-' },
    { title: '检测项', dataIndex: 'test_count', width: 80, align: 'center' },
    { title: '进度', width: 200, render: (_, r) => {
        const total = r.test_count || 1;
        const done = (r.confirmed_count || 0) + (r.reported_count || 0);
        const pct = Math.round(done / total * 100);
        return <Progress percent={pct} size="small" />;
      } },
    { title: '更新时间', dataIndex: 'updated_at', width: 160,
      render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '操作', width: 100,
      render: (_, r) => <Button type="link" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>详情</Button> }
  ];

  return (
    <Card
      title="试剂批次台账"
      extra={
        <Space>
          <Input allowClear prefix={<SearchOutlined />} placeholder="搜索批次号/试剂名/厂家"
                 value={keyword} onChange={e => setKeyword(e.target.value)}
                 onPressEnter={load} style={{ width: 280 }} />
          <Button type="primary" onClick={load}>查询</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
             pagination={{ pageSize: 10, showSizeChanger: true }} size="middle" />

      <Modal open={detailVisible} onCancel={() => setDetailVisible(false)}
             title="批次详情" footer={null} width={800}>
        {detail && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="批次号"><code>{detail.batch_no}</code></Descriptions.Item>
              <Descriptions.Item label="试剂名称">{detail.reagent_name}</Descriptions.Item>
              <Descriptions.Item label="规格">{detail.specification || '-'}</Descriptions.Item>
              <Descriptions.Item label="生产厂家">{detail.manufacturer || '-'}</Descriptions.Item>
              <Descriptions.Item label="到货日期">{detail.arrival_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="数量">{detail.quantity ? `${detail.quantity} ${detail.unit || ''}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="供应商">{detail.supplier || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
            </Descriptions>
            <div>
              <div className="section-title">检测记录（{detail.tests?.length || 0} 项）</div>
              <Table size="small" rowKey="id" pagination={false} dataSource={detail.tests || []}
                     columns={[
                       { title: '检测项目', dataIndex: 'test_item', width: 160 },
                       { title: '检测值', dataIndex: 'test_value', width: 100,
                         render: (v, r) => v != null ? `${v} ${r.unit || ''}` : '-' },
                       { title: '限值', dataIndex: 'limit_value', width: 100,
                         render: (v, r) => v != null ? `${v} ${r.unit || ''}` : '-' },
                       { title: '结论', dataIndex: 'conclusion', width: 100,
                         render: v => <Tag color={statusColor[v] || 'default'}>{v}</Tag> },
                       { title: '检测人', dataIndex: 'tester', width: 100 },
                       { title: '检测日期', dataIndex: 'test_date', width: 120 }
                     ]} />
            </div>
          </Space>
        )}
      </Modal>
    </Card>
  );
}

export default BatchList;
