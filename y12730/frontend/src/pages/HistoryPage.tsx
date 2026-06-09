import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Table, Button, Space, Row, Col, Modal, Form, Input, Select,
  App as AntdApp, Tag, Divider, Alert, List, Descriptions, Typography
} from 'antd';
import {
  HistoryOutlined, PlusOutlined, BarChartOutlined, FileTextOutlined, SaveOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../api/client';
import type { HistorySnapshot, ExportReport } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const snapshotTypes = [
  { label: '复核结果快照', value: 'review' },
  { label: '误差分析快照', value: 'error' },
  { label: '冲突检测快照', value: 'conflict' },
  { label: '完整数据快照', value: 'full' }
];

const HistoryPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { message } = AntdApp.useApp();
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [allSnapshots, setAllSnapshots] = useState<HistorySnapshot[]>([]);
  const [exports, setExports] = useState<ExportReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();
  const [viewModal, setViewModal] = useState<{ open: boolean; record: HistorySnapshot | null }>({
    open: false,
    record: null
  });
  const [compareModal, setCompareModal] = useState(false);
  const [compareId1, setCompareId1] = useState<number | null>(null);
  const [compareId2, setCompareId2] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [sRes, eRes, aRes] = await Promise.all([
        api.get(`/batches/${batchId}/snapshots?limit=200`),
        api.get(`/batches/${batchId}/exports?limit=100`),
        api.get(`/snapshots/all?limit=500`)
      ]);
      setSnapshots(sRes.data || []);
      setExports(eRes.data || []);
      setAllSnapshots(aRes.data || []);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [batchId]);

  const handleCreate = async () => {
    if (!batchId) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let data = values.snapshot_data || '{}';
      if (!values.snapshot_data) {
        const snapMap: Record<string, () => Promise<string>> = {
          review: async () => {
            const r = await api.get(`/batches/${batchId}/reviews?limit=500`);
            return JSON.stringify(r.data || {});
          },
          error: async () => {
            const r = await api.get(`/batches/${batchId}/error-analysis?limit=500`);
            return JSON.stringify(r.data || {});
          },
          conflict: async () => {
            const r = await api.get(`/batches/${batchId}/conflicts?limit=500`);
            return JSON.stringify(r.data || {});
          },
          full: async () => {
            return JSON.stringify({ exported_at: new Date().toISOString() });
          }
        };
        const fn = snapMap[values.snapshot_type];
        if (fn) data = await fn();
      }

      await api.post(`/batches/${batchId}/snapshots`, {
        snapshot_name: values.snapshot_name,
        snapshot_type: values.snapshot_type,
        snapshot_data: data,
        created_by: values.created_by
      });
      message.success('快照已创建');
      setCreateModal(false);
      form.resetFields();
      load();
    } catch (e: any) {
      if (!e?.fields) message.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const compareSize = (record: HistorySnapshot) => {
    try {
      return new Blob([record.snapshot_data]).size;
    } catch {
      return 0;
    }
  };

  const prettySize = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const prettyFileSize = (n?: number) => {
    if (!n) return '-';
    return prettySize(n);
  };

  const doCompare = async () => {
    if (compareId1 && compareId2 && compareId1 !== compareId2) {
      const s1 = allSnapshots.find((s) => s.id === compareId1);
      const s2 = allSnapshots.find((s) => s.id === compareId2);
      let p1: any = {};
      let p2: any = {};
      try { p1 = JSON.parse(s1?.snapshot_data || '{}'); } catch {}
      try { p2 = JSON.parse(s2?.snapshot_data || '{}'); } catch {}
      setCompareResult({ s1, s2, p1, p2 });
    } else {
      message.warning('请选择两个不同的快照');
    }
  };

  const snapshotColumns: ColumnsType<HistorySnapshot> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '快照名称', dataIndex: 'snapshot_name' },
    {
      title: '类型',
      dataIndex: 'snapshot_type',
      width: 140,
      render: (v) => <Tag color="blue">{v}</Tag>
    },
    {
      title: '大小',
      key: 'size',
      width: 100,
      render: (_, r) => prettySize(compareSize(r))
    },
    { title: '创建人', dataIndex: 'created_by', width: 120, render: (v) => v || '-' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => setViewModal({ open: true, record: r })}>
            查看
          </Button>
        </Space>
      )
    }
  ];

  const exportColumns: ColumnsType<ExportReport> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '报告名称', dataIndex: 'report_name' },
    {
      title: '类型',
      dataIndex: 'report_type',
      width: 160,
      render: (v) => <Tag color="green">{v}</Tag>
    },
    { title: '文件大小', dataIndex: 'file_size', width: 120, render: (v) => prettyFileSize(v) },
    { title: '导出人', dataIndex: 'exported_by', width: 120, render: (v) => v || '-' },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          onClick={() => window.open(`/api/exports/${r.id}/download`, '_blank')}
        >
          下载
        </Button>
      )
    }
  ];

  const countData = (p: any) => {
    if (Array.isArray(p)) return p.length;
    if (p && typeof p === 'object') return Object.keys(p).length;
    return 0;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <h2 className="page-title">
              <HistoryOutlined /> 历史对比 & 处理痕迹
            </h2>
            <div className="page-subtitle">
              服务重启后仍可查询历史快照和导出记录，保留每一轮处理痕迹。可对任意两个快照进行对比。
            </div>
          </Col>
          <Col>
            <Space>
              <Button icon={<BarChartOutlined />} onClick={() => setCompareModal(true)}>
                跨快照对比
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                新建快照
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="为什么要保留历史痕迹？"
        description="排课老师复核的每一轮处理（导入、冲突检测、复核分级、误差分析、导出）都会生成快照或导出文件，便于追溯问题回到对应原始材料，避免反复核对。"
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <SaveOutlined /> 历史快照（{snapshots.length}）
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              columns={snapshotColumns}
              dataSource={snapshots}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <FileTextOutlined /> 历史导出（{exports.length}）
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              columns={exportColumns}
              dataSource={exports}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="新建快照"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="快照名称"
            name="snapshot_name"
            rules={[{ required: true, message: '请输入' }]}
          >
            <Input placeholder="例如：第1轮复核结果_20260609" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="快照类型"
                name="snapshot_type"
                initialValue="full"
                rules={[{ required: true }]}
              >
                <Select>
                  {snapshotTypes.map((t) => (
                    <Option key={t.value} value={t.value}>
                      {t.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="创建人" name="created_by">
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="快照数据（留空则自动采集当前批次对应类型数据）" name="snapshot_data">
            <TextArea rows={4} placeholder="选填，JSON 格式。留空自动抓取" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="快照详情"
        open={viewModal.open}
        onCancel={() => setViewModal({ open: false, record: null })}
        footer={null}
        width={720}
        destroyOnClose
      >
        {viewModal.record && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label="快照名称">{viewModal.record.snapshot_name}</Descriptions.Item>
              <Descriptions.Item label="类型">{viewModal.record.snapshot_type}</Descriptions.Item>
              <Descriptions.Item label="创建人">{viewModal.record.created_by || '-'}</Descriptions.Item>
              <Descriptions.Item label="时间">
                {dayjs(viewModal.record.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="大小">
                {prettySize(compareSize(viewModal.record))}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Typography.Paragraph
              copyable
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 6,
                maxHeight: 360,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: 12
              }}
            >
              {viewModal.record.snapshot_data}
            </Typography.Paragraph>
          </div>
        )}
      </Modal>

      <Modal
        title="跨快照对比"
        open={compareModal}
        onCancel={() => {
          setCompareModal(false);
          setCompareResult(null);
        }}
        onOk={doCompare}
        okText="对比"
        width={800}
        destroyOnClose
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="快照 A">
              <Select
                value={compareId1}
                onChange={(v) => setCompareId1(v)}
                placeholder="选择第一个快照"
                showSearch
                optionFilterProp="label"
              >
                {allSnapshots.map((s) => (
                  <Option key={s.id} value={s.id} label={s.snapshot_name}>
                    [#{s.id}] {s.snapshot_name} ({s.snapshot_type}) - {dayjs(s.created_at).format('MM-DD HH:mm')}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="快照 B">
              <Select
                value={compareId2}
                onChange={(v) => setCompareId2(v)}
                placeholder="选择第二个快照"
                showSearch
                optionFilterProp="label"
              >
                {allSnapshots.map((s) => (
                  <Option key={s.id} value={s.id} label={s.snapshot_name}>
                    [#{s.id}] {s.snapshot_name} ({s.snapshot_type}) - {dayjs(s.created_at).format('MM-DD HH:mm')}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {compareResult && (
          <>
            <Divider />
            <List
              size="small"
              header={<b>对比结果</b>}
              dataSource={[
                { title: '快照 A', desc: compareResult.s1?.snapshot_name || '-' },
                { title: '快照 B', desc: compareResult.s2?.snapshot_name || '-' },
                { title: 'A 数据规模', desc: countData(compareResult.p1) + ' 项' },
                { title: 'B 数据规模', desc: countData(compareResult.p2) + ' 项' }
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.title} description={item.desc} />
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
