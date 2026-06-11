import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Select, Table, Tag, Button, Space,
  Modal, Form, Input, Upload, message, Drawer, Descriptions, Image,
  Popconfirm, Tooltip
} from 'antd';
import {
  UploadOutlined, LinkOutlined, EditOutlined, DeleteOutlined,
  FileImageOutlined, ExclamationCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { MicroscopeImage, Sample, reviewStatusLabels, reviewStatusColors } from '../types';
import { imageApi, importApi, sampleApi } from '../api';
import AnnotationEditor from '../components/AnnotationEditor';

export default function AnnotationPage() {
  const [images, setImages] = useState<MicroscopeImage[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [onlyUnlinked, setOnlyUnlinked] = useState(true);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<MicroscopeImage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorImage, setEditorImage] = useState<MicroscopeImage | null>(null);
  const [linkForm] = Form.useForm();

  useEffect(() => { loadData(); }, [selectedBatch, onlyUnlinked]);
  useEffect(() => { sampleApi.batches().then(setBatches); }, []);

  const loadData = async () => {
    setLoading(true);
    const [imgData, sampleData] = await Promise.all([
      imageApi.list({ unlinked: onlyUnlinked, import_batch: undefined }),
      sampleApi.list({ reagent_batch: selectedBatch, pageSize: 1000 })
    ]);
    setImages(imgData);
    setSamples(sampleData.data || []);
    setLoading(false);
  };

  const handleImagesUpload = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    const hide = message.loading(`正在上传 ${fileList.length} 张图片...`, 0);
    try {
      const res = await importApi.importImages(fileList);
      hide();
      message.success(`成功导入 ${res.uploaded} 张图片`);
      loadData();
    } catch (e: any) {
      hide();
      message.error(e.response?.data?.error || '上传失败');
    }
  };

  const handleLink = async () => {
    try {
      const values = await linkForm.validateFields();
      await imageApi.link(currentImage!.id, values.sample_id);
      message.success('已关联样本');
      setLinkModalOpen(false);
      loadData();
    } catch {}
  };

  const openEditor = async (img: MicroscopeImage) => {
    const detail = await imageApi.get(img.id);
    setEditorImage(detail);
    setDrawerOpen(true);
  };

  const openDetail = async (img: MicroscopeImage) => {
    const detail = await imageApi.get(img.id);
    setCurrentImage(detail);
  };

  const columns: ColumnsType<MicroscopeImage> = [
    {
      title: '预览',
      width: 100,
      render: (_, r) => (
        <Image width={60} height={45} src={imageApi.fileUrl(r.id)} style={{ objectFit: 'cover', borderRadius: 4 }} />
      )
    },
    {
      title: '图片名',
      dataIndex: 'file_name',
      render: (t, r) => (
        <Space>
          <span>{t}</span>
          {r.sample_id && <Tag color="green">已关联</Tag>}
          {!r.sample_id && <Tag color="orange">未关联</Tag>}
        </Space>
      )
    },
    {
      title: '关联样本',
      render: (_, r) => r.sample_id ? (
        <Button type="link" icon={<EyeOutlined />} onClick={() => setSamples(s => s.filter(x => x.id === r.sample_id))}>
          {samples.find(s => s.id === r.sample_id)?.sample_no || r.sample_id}
        </Button>
      ) : <span style={{ color: '#999' }}>-</span>
    },
    {
      title: '来源追溯',
      render: (_, r) => (
        <div className="trace-info" style={{ margin: 0 }}>
          {r.original_row !== undefined && <span>原始行号: <b>{r.original_row}</b></span>}
          {r.import_batch && <span>导入批次: <code>{r.import_batch.slice(0, 8)}</code></span>}
          {r.source_note && <span>备注: {r.source_note}</span>}
        </div>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      render: (t) => new Date(t).toLocaleString()
    },
    {
      title: '操作',
      width: 220,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(r)}>标注</Button>
          {!r.sample_id && (
            <Button size="small" icon={<LinkOutlined />} type="primary" onClick={() => {
              setCurrentImage(r);
              linkForm.resetFields();
              setLinkModalOpen(true);
            }}>关联样本</Button>
          )}
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-card">
        <div className="page-header">
          <h2 className="page-title">图像标注（日常入口）</h2>
          <Space>
            <Select
              placeholder="筛选试剂批号"
              allowClear
              style={{ width: 200 }}
              value={selectedBatch}
              onChange={setSelectedBatch}
              options={batches.map((b: any) => ({ label: b.reagent_batch, value: b.reagent_batch }))}
            />
            <Button onClick={() => setOnlyUnlinked(!onlyUnlinked)} type={onlyUnlinked ? 'primary' : 'default'}>
              {onlyUnlinked ? '仅显示未关联' : '显示全部'}
            </Button>
            <Upload
              multiple
              accept="image/*"
              showUploadList={false}
              beforeUpload={(f, fl) => { handleImagesUpload(fl as any); return false; }}
            >
              <Button icon={<UploadOutlined />} type="primary">上传显微照片</Button>
            </Upload>
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={6}>
            <Card><Statistic title="总图片数" value={images.length} prefix={<FileImageOutlined />} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="未关联图片" value={images.filter(i => !i.sample_id).length} valueStyle={{ color: '#fa8c16' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="已关联图片" value={images.filter(i => i.sample_id).length} valueStyle={{ color: '#52c41a' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="样本总数" value={samples.length} /></Card>
          </Col>
        </Row>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={images}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: (r) => (
              <Space>
                <Image width={400} src={imageApi.fileUrl(r.id)} />
                <div>
                  <h4>标注信息</h4>
                  {(r as any).annotations?.map((a: any) => (
                    <Tag key={a.id} color="blue" style={{ margin: 4 }}>
                      {a.label} {a.note && `(${a.note})`}
                    </Tag>
                  ))}
                  {!(r as any).annotations?.length && <span style={{ color: '#999' }}>暂无标注</span>}
                </div>
              </Space>
            )
          }}
        />
      </div>

      <Modal
        title={`关联图片到样本 - ${currentImage?.file_name}`}
        open={linkModalOpen}
        onOk={handleLink}
        onCancel={() => setLinkModalOpen(false)}
        width={600}
      >
        {currentImage && (
          <Image width="100%" src={imageApi.fileUrl(currentImage.id)} style={{ marginBottom: 16 }} />
        )}
        <Form form={linkForm} layout="vertical">
          <Form.Item name="sample_id" label="选择样本（试剂批号 + 样本编号）" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="搜索样本编号或菌种名称"
              options={samples.map(s => ({
                label: `${s.reagent_batch} / ${s.sample_no} / ${s.strain_name}`,
                value: s.id
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="图像标注"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={900}
        destroyOnClose
      >
        {editorImage && (
          <AnnotationEditor image={editorImage} onChanged={() => {
            imageApi.get(editorImage.id).then(setEditorImage);
          }} />
        )}
      </Drawer>
    </div>
  );
}
