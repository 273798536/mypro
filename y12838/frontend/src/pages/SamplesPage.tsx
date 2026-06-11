import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Select, Input, Modal, Form,
  message, Drawer, Descriptions, Image, Alert, Popconfirm
} from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Sample, activityLevelLabels, activityLevelColors,
  reviewStatusLabels, reviewStatusColors, MicroscopeImage
} from '../types';
import { sampleApi, imageApi } from '../api';

export default function SamplesPage() {
  const [data, setData] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [batchFilter, setBatchFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [searchText, setSearchText] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [current, setCurrent] = useState<Sample | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();

  useEffect(() => { sampleApi.batches().then(setBatches); }, []);
  useEffect(() => { loadData(); }, [page, pageSize, batchFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await sampleApi.list({
        reagent_batch: batchFilter,
        review_status: statusFilter,
        page,
        pageSize
      });
      let list = res.data || [];
      if (searchText) {
        const s = searchText.toLowerCase();
        list = list.filter((x: Sample) =>
          x.sample_no.toLowerCase().includes(s) ||
          x.strain_name.toLowerCase().includes(s) ||
          (x.conclusion || '').toLowerCase().includes(s) ||
          (x.sequencing_result || '').toLowerCase().includes(s)
        );
      }
      setData(list);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (s: Sample) => {
    const detail = await sampleApi.get(s.id);
    setCurrent(detail);
    setDrawerOpen(true);
  };

  const openEdit = (s: Sample) => {
    setCurrent(s);
    editForm.setFieldsValue({
      strain_name: s.strain_name,
      activity_level: s.activity_level,
      conclusion: s.conclusion,
      sequencing_result: s.sequencing_result,
      source_note: s.source_note,
      review_status: s.review_status,
      reviewer: s.reviewer
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await editForm.validateFields();
      await sampleApi.update(current!.id, values);
      message.success('已保存');
      setEditOpen(false);
      loadData();
    } catch {}
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await sampleApi.create(values);
      message.success('已创建');
      setCreateOpen(false);
      createForm.resetFields();
      loadData();
    } catch (e: any) {
      if (e.response?.status === 409) {
        message.error('同一试剂批号下该样本编号已存在，请使用导入功能进行更新');
      } else {
        message.error(e.response?.data?.error || '创建失败');
      }
    }
  };

  const handleDelete = async (id: string) => {
    await sampleApi.remove(id);
    message.success('已删除');
    loadData();
  };

  const columns: ColumnsType<Sample> = [
    { title: '原始行号', dataIndex: 'original_row', width: 80, render: v => <Tag color="default">R{v}</Tag> },
    { title: '试剂批号', dataIndex: 'reagent_batch', width: 120 },
    { title: '样本编号', dataIndex: 'sample_no', width: 100 },
    { title: '菌种名称', dataIndex: 'strain_name', width: 140 },
    {
      title: '活性等级', dataIndex: 'activity_level', width: 100,
      render: v => v ? <Tag color={activityLevelColors[v]}>{activityLevelLabels[v]}</Tag> : '-'
    },
    {
      title: '复核状态', dataIndex: 'review_status', width: 100,
      render: v => <Tag color={reviewStatusColors[v]}>
        {v === 'conflict' && <ExclamationCircleOutlined />} {reviewStatusLabels[v]}
      </Tag>
    },
    { title: '测序结果', dataIndex: 'sequencing_result', width: 140, ellipsis: true },
    { title: '结论', dataIndex: 'conclusion', width: 180, ellipsis: true },
    {
      title: '来源追溯', width: 220,
      render: (_, r) => (
        <div className="trace-info" style={{ margin: 0, padding: '4px 8px' }}>
          <span>文件: <code style={{ fontSize: 11 }}>{r.source_file}</code></span>
          <span>批次: <code style={{ fontSize: 11 }}>{r.import_batch.slice(0, 8)}</code></span>
        </div>
      )
    },
    {
      title: '操作', width: 200,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确定删除该样本？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-card">
        <div className="page-header">
          <h2 className="page-title">样本清单</h2>
          <Space>
            <Input
              placeholder="搜索样本/菌种/结论..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onPressEnter={loadData}
              style={{ width: 240 }}
              allowClear
            />
            <Select
              placeholder="试剂批号"
              allowClear
              style={{ width: 180 }}
              value={batchFilter}
              onChange={setBatchFilter}
              options={batches.map((b: any) => ({ label: b.reagent_batch, value: b.reagent_batch }))}
            />
            <Select
              placeholder="复核状态"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={Object.entries(reviewStatusLabels).map(([v, l]) => ({ label: l, value: v }))}
            />
            <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateOpen(true)}>新增样本</Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: t => `共 ${t} 条`
          }}
        />
      </div>

      <Drawer
        title={`样本详情 - ${current?.sample_no}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
      >
        {current && (
          <div>
            {current.review_status === 'conflict' && (
              <Alert type="error" showIcon message="存在冲突" description="重复导入数据与已复核结论不一致，请人工核查。" style={{ marginBottom: 16 }} />
            )}
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="试剂批号">{current.reagent_batch}</Descriptions.Item>
              <Descriptions.Item label="样本编号">{current.sample_no}</Descriptions.Item>
              <Descriptions.Item label="菌种名称">{current.strain_name}</Descriptions.Item>
              <Descriptions.Item label="活性等级">
                {current.activity_level ? <Tag color={activityLevelColors[current.activity_level]}>{activityLevelLabels[current.activity_level]}</Tag> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="复核状态">
                <Tag color={reviewStatusColors[current.review_status]}>{reviewStatusLabels[current.review_status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="复核人">{current.reviewer || '-'}</Descriptions.Item>
              <Descriptions.Item label="测序结果" span={2}>
                {current.sequencing_result || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最终结论" span={2}>{current.conclusion || '-'}</Descriptions.Item>
              <Descriptions.Item label="原始行号" span={2}>
                <Tag>R{current.original_row}</Tag>，来源文件：<code>{current.source_file}</code>
              </Descriptions.Item>
              <Descriptions.Item label="导入批次" span={2}><code>{current.import_batch}</code></Descriptions.Item>
              <Descriptions.Item label="来源备注" span={2}>{current.source_note || '-'}</Descriptions.Item>
            </Descriptions>

            <div className="trace-info">
              <span>创建：{new Date(current.created_at).toLocaleString()}</span>
              <span>更新：{new Date(current.updated_at).toLocaleString()}</span>
            </div>

            <h4 style={{ marginTop: 16 }}>关联显微照片（{current.images?.length || 0}张）</h4>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {current.images?.map((img: MicroscopeImage) => (
                <div key={img.id} style={{ width: 200 }}>
                  <Image width={200} height={140} src={imageApi.fileUrl(img.id)} style={{ objectFit: 'cover', borderRadius: 4 }} />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{img.file_name}</div>
                </div>
              ))}
              {!current.images?.length && <span style={{ color: '#999' }}>暂无关联图片</span>}
            </div>
          </div>
        )}
      </Drawer>

      <Modal title="编辑样本" open={editOpen} onOk={handleSave} onCancel={() => setEditOpen(false)} width={560}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="strain_name" label="菌种名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="activity_level" label="活性等级">
            <Select options={Object.entries(activityLevelLabels).map(([v, l]) => ({ label: l, value: v }))} />
          </Form.Item>
          <Form.Item name="review_status" label="复核状态">
            <Select options={Object.entries(reviewStatusLabels).map(([v, l]) => ({ label: l, value: v }))} />
          </Form.Item>
          <Form.Item name="reviewer" label="复核人"><Input /></Form.Item>
          <Form.Item name="sequencing_result" label="测序结果"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="conclusion" label="最终结论"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="source_note" label="来源备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新增样本" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} width={560}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="reagent_batch" label="试剂批号" rules={[{ required: true }]}><Input placeholder="如：R20240601" /></Form.Item>
          <Form.Item name="sample_no" label="样本编号" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="strain_name" label="菌种名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="source_note" label="来源备注"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
