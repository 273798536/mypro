import React, { useState, useMemo } from 'react';
import {
  Tabs, Form, Input, InputNumber, DatePicker, Select, Button, Table, Modal,
  Switch, Upload, message, Popconfirm, Tag, Space, Card, Row, Col, Alert,
} from 'antd';
import {
  Plus, Edit2, Trash2, Download, Upload as UploadIcon, Eye, Clock,
  Settings, Package, Activity, CheckCircle2, XCircle, History,
} from 'lucide-react';
import { useAppStore } from '../store';
import { MaterialBatch, SystemConfig } from '../types';
import { COLORS } from '../constants';
import { validateReading } from '../utils/algorithms';
import type { UploadProps } from 'antd';

const { TextArea } = Input;
const CURRENT_USER = '当前用户';
const baseCol = { xs: 24, sm: 12, md: 8 };

const DataEntry: React.FC = () => {
  const {
    batches, configs, auditTrails, addBatch, updateBatch, deleteBatch,
    addReading, bulkAddReadings, updateConfig,
  } = useAppStore();

  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [configForm] = Form.useForm();
  const [isLateSupplement, setIsLateSupplement] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [batchModal, setBatchModal] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [auditModal, setAuditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<MaterialBatch | null>(null);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const batchOptions = useMemo(() => batches.map((b) => ({ label: `${b.batchNo} - ${b.materialType}`, value: b.id })), [batches]);
  const entityAuditTrails = useMemo(() => selectedEntityId ? auditTrails.filter((t) => t.entityId === selectedEntityId).sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()) : [], [auditTrails, selectedEntityId]);

  const handleReadingSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = { ...values, readingTime: values.readingTime.toDate(), isLateSupplement };
      const { valid, errors } = validateReading(data, configs);
      if (!valid) { setFormErrors(errors); return; }
      await addReading(data);
      message.success('读数添加成功');
      form.resetFields();
      setFormErrors([]);
    } catch (error: any) {
      setFormErrors([error.message || '表单验证失败']);
    }
  };

  const handleFieldChange = () => {
    const values = form.getFieldsValue();
    if (values.readingTime) {
      const data = { ...values, readingTime: values.readingTime.toDate(), isLateSupplement };
      setFormErrors(validateReading(data, configs).errors);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let data: any[] = [];
        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          data = content.split('\n').slice(1).filter(Boolean).map((line) => {
            const [sensorId, readingTime, radiationValue, materialBatchId, emissivity, ambientTemp, remark] = line.split(',');
            return { sensorId, readingTime: new Date(readingTime), radiationValue: parseFloat(radiationValue), materialBatchId, emissivity: emissivity ? parseFloat(emissivity) : null, ambientTemp: parseFloat(ambientTemp), remark: remark?.trim() || '', isLateSupplement: false };
          });
        }
        setPreviewData(data);
        message.success(`解析成功，共 ${data.length} 条数据`);
      } catch {
        message.error('文件解析失败，请检查格式');
      }
    };
    reader.readAsText(file);
  };

  const uploadProps: UploadProps = { accept: '.csv,.json', showUploadList: false, beforeUpload: (f) => { parseFile(f); return false; } };

  const downloadTemplate = () => {
    const template = '传感器ID,读数时间,辐射强度,材料批次ID,发射率,环境温度,备注\nS001,2024-01-01T12:00:00,15000,BAT-2024-001,0.85,25,测试数据';
    const url = URL.createObjectURL(new Blob([template], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = '读数导入模板.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkSubmit = async () => {
    await bulkAddReadings(previewData);
    message.success(`成功导入 ${previewData.length} 条数据`);
    setPreviewData([]);
  };

  const handleBatchSubmit = async () => {
    try {
      const values = await batchForm.validateFields();
      if (batches.find((b) => b.batchNo === values.batchNo && b.id !== editingBatch?.id)) {
        message.error('批次编号已存在'); return;
      }
      if (editingBatch) {
        await updateBatch(editingBatch.id, values, CURRENT_USER, '编辑批次信息');
        message.success('批次更新成功');
      } else {
        await addBatch(values);
        message.success('批次创建成功');
      }
      setBatchModal(false);
      batchForm.resetFields();
      setEditingBatch(null);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleEditBatch = (b: MaterialBatch) => { setEditingBatch(b); batchForm.setFieldsValue(b); setBatchModal(true); };

  const handleConfigSubmit = async () => {
    try {
      const values = await configForm.validateFields();
      if (!editingConfig) return;
      await updateConfig(editingConfig.id, values.configValue, CURRENT_USER, values.reason);
      message.success('配置更新成功');
      setConfigModal(false);
      configForm.resetFields();
      setEditingConfig(null);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleEditConfig = (c: SystemConfig) => {
    setEditingConfig(c);
    configForm.setFieldsValue({ configValue: c.configValue, reason: '' });
    setConfigModal(true);
  };

  const readingCols = [
    { title: '传感器ID', dataIndex: 'sensorId' },
    { title: '读数时间', dataIndex: 'readingTime', render: (t: Date) => t.toLocaleString() },
    { title: '辐射强度', dataIndex: 'radiationValue' },
    { title: '材料批次', dataIndex: 'materialBatchId' },
    { title: '发射率', dataIndex: 'emissivity' },
    { title: '环境温度', dataIndex: 'ambientTemp' },
  ];

  const batchCols = [
    { title: '批次编号', dataIndex: 'batchNo' },
    { title: '材料类型', dataIndex: 'materialType' },
    { title: '默认发射率', dataIndex: 'defaultEmissivity' },
    { title: '描述', dataIndex: 'description' },
    { title: '创建时间', dataIndex: 'createdAt', render: (t: Date) => t.toLocaleString() },
    { title: '操作', render: (_: any, r: MaterialBatch) => (
      <Space>
        <Button type="link" size="small" icon={<Edit2 size={14} />} onClick={() => handleEditBatch(r)}>编辑</Button>
        <Button type="link" size="small" icon={<History size={14} />} onClick={() => { setSelectedEntityId(r.id); setAuditModal(true); }}>历史</Button>
        <Popconfirm title="确认删除此批次？" onConfirm={() => deleteBatch(r.id)}><Button type="link" danger size="small" icon={<Trash2 size={14} />}>删除</Button></Popconfirm>
      </Space>
    ) },
  ];

  const configCols = [
    { title: '配置项名称', dataIndex: 'description', render: (t: string, r: SystemConfig) => <span className={r.isModified ? 'font-semibold' : ''}>{t}</span> },
    { title: '当前值', dataIndex: 'configValue', render: (v: any, r: SystemConfig) => <span className={r.isModified ? 'text-yellow-400 font-semibold' : ''}>{v}</span> },
    { title: '是否已修改', dataIndex: 'isModified', render: (v: boolean) => v ? <Tag color="gold"><CheckCircle2 size={12} className="inline mr-1" />已修改</Tag> : <Tag><XCircle size={12} className="inline mr-1" />默认</Tag> },
    { title: '修改时间', dataIndex: 'modifiedAt', render: (t: Date | null) => t ? t.toLocaleString() : '-' },
    { title: '操作', render: (_: any, r: SystemConfig) => (
      <Space>
        <Button type="link" size="small" icon={<Edit2 size={14} />} onClick={() => handleEditConfig(r)}>编辑</Button>
        <Button type="link" size="small" icon={<History size={14} />} onClick={() => { setSelectedEntityId(r.id); setAuditModal(true); }}>历史</Button>
      </Space>
    ) },
  ];

  const auditCols = [
    { title: '字段', dataIndex: 'fieldName' },
    { title: '原值', dataIndex: 'oldValue' },
    { title: '新值', dataIndex: 'newValue' },
    { title: '修改人', dataIndex: 'modifiedBy' },
    { title: '修改时间', dataIndex: 'modifiedAt', render: (t: Date) => t.toLocaleString() },
    { title: '原因', dataIndex: 'reason' },
  ];

  const tabItems = [
    {
      key: 'reading',
      label: <span className="flex items-center gap-2"><Activity size={16} />辐射读数录入</span>,
      children: (
        <div className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">手动录入</h3>
              <div className="flex items-center gap-2"><Clock size={14} className="text-slate-400" /><span className="text-slate-400 text-sm">晚补标记</span><Switch checked={isLateSupplement} onChange={setIsLateSupplement} /></div>
            </div>
            {formErrors.length > 0 && <Alert message="校验错误" description={formErrors.map((e, i) => <div key={i}>{e}</div>)} type="error" showIcon className="mb-4" />}
            <Form form={form} layout="vertical" onValuesChange={handleFieldChange}>
              <Row gutter={16}>
                <Col {...baseCol}><Form.Item name="sensorId" label="传感器ID" rules={[{ required: true }]}><Input placeholder="请输入传感器ID" /></Form.Item></Col>
                <Col {...baseCol}><Form.Item name="readingTime" label="读数时间" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                <Col {...baseCol}><Form.Item name="radiationValue" label="辐射强度(W/m²)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={100} max={100000} /></Form.Item></Col>
                <Col {...baseCol}><Form.Item name="materialBatchId" label="材料批次" rules={[{ required: true }]}><Select placeholder="请选择批次" options={batchOptions} /></Form.Item></Col>
                <Col {...baseCol}><Form.Item name="emissivity" label="发射率(可选)"><InputNumber style={{ width: '100%' }} min={0.01} max={1.0} step={0.01} /></Form.Item></Col>
                <Col {...baseCol}><Form.Item name="ambientTemp" label="环境温度(°C)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={24}><Form.Item name="remark" label="备注"><TextArea rows={2} placeholder="请输入备注" /></Form.Item></Col>
              </Row>
              <Button type="primary" icon={<Plus size={16} />} onClick={handleReadingSubmit} style={{ backgroundColor: COLORS.primary }}>提交录入</Button>
            </Form>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">批量导入</h3>
              <Space><Button icon={<Download size={14} />} onClick={downloadTemplate}>下载模板</Button><Upload {...uploadProps}><Button type="primary" icon={<UploadIcon size={14} />}>选择文件</Button></Upload></Space>
            </div>
            {previewData.length > 0 && (
              <>
                <div className="mb-4 text-slate-400">待提交数据：<span className="text-white font-semibold">{previewData.length}</span> 条</div>
                <Table dataSource={previewData} columns={readingCols} size="small" pagination={{ pageSize: 5 }} className="mb-4" rowKey={(r, i) => `preview-${i}`} />
                <Space><Button type="primary" icon={<CheckCircle2 size={14} />} onClick={handleBulkSubmit} style={{ backgroundColor: COLORS.primary }}>确认提交</Button><Button onClick={() => setPreviewData([])}>取消</Button></Space>
              </>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'batch',
      label: <span className="flex items-center gap-2"><Package size={16} />材料批次管理</span>,
      children: (
        <Card className="bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">批次列表</h3>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => { setEditingBatch(null); batchForm.resetFields(); setBatchModal(true); }} style={{ backgroundColor: COLORS.primary }}>新增批次</Button>
          </div>
          <Table dataSource={batches} rowKey="id" pagination={{ pageSize: 10 }} columns={batchCols} />
        </Card>
      ),
    },
    {
      key: 'config',
      label: <span className="flex items-center gap-2"><Settings size={16} />参数校验配置</span>,
      children: (
        <Card className="bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">参数配置</h3>
            <span className="text-slate-400 text-sm"><Tag color="gold" className="mr-2">高亮</Tag>表示已修改的参数</span>
          </div>
          <Table dataSource={configs} rowKey="id" pagination={false} columns={configCols} />
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-2">数据录入</h2>
        <p className="text-slate-400">录入辐射读数、管理材料批次和配置校验参数</p>
      </Card>
      <Card className="bg-slate-800 border-slate-700" styles={{ body: { padding: 0 } }}>
        <Tabs items={tabItems} className="p-4" style={{ '--ant-tabs-color': COLORS.text, '--ant-tabs-item-color': COLORS.textSecondary, '--ant-tabs-item-hover-color': COLORS.text, '--ant-tabs-item-active-color': COLORS.primary, '--ant-tabs-ink-bar-color': COLORS.primary, '--ant-tabs-nav-list-gap': '32px' } as React.CSSProperties} />
      </Card>
      <Modal title={editingBatch ? '编辑批次' : '新增批次'} open={batchModal} onCancel={() => setBatchModal(false)} onOk={handleBatchSubmit} okText="确认" cancelText="取消">
        <Form form={batchForm} layout="vertical">
          <Form.Item name="batchNo" label="批次编号" rules={[{ required: true }]}><Input placeholder="如 BAT-2024-001" /></Form.Item>
          <Form.Item name="materialType" label="材料类型" rules={[{ required: true }]}><Input placeholder="如 不锈钢" /></Form.Item>
          <Form.Item name="defaultEmissivity" label="默认发射率" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0.01} max={1.0} step={0.01} /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={3} placeholder="请输入批次描述" /></Form.Item>
        </Form>
      </Modal>
      <Modal title="编辑参数" open={configModal} onCancel={() => setConfigModal(false)} onOk={handleConfigSubmit} okText="确认" cancelText="取消">
        <Form form={configForm} layout="vertical">
          <div className="mb-4 p-3 bg-slate-100 rounded-lg"><div className="text-sm text-slate-600">配置项：{editingConfig?.description}</div></div>
          <Form.Item name="configValue" label="参数值" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reason" label="修改原因" rules={[{ required: true }]}><TextArea rows={3} placeholder="请输入修改原因" /></Form.Item>
        </Form>
      </Modal>
      <Modal title="修改历史" open={auditModal} onCancel={() => setAuditModal(false)} footer={null} width={800}>
        {entityAuditTrails.length > 0 ? <Table dataSource={entityAuditTrails} rowKey="id" pagination={{ pageSize: 5 }} size="small" columns={auditCols} /> : <div className="text-center py-8 text-slate-400"><Eye size={32} className="mx-auto mb-2 opacity-50" />暂无修改记录</div>}
      </Modal>
    </div>
  );
};

export default DataEntry;
