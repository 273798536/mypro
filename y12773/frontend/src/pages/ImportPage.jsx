import React, { useState } from 'react';
import {
  Card, Upload, Button, Table, Alert, Space, message, Modal, Form,
  Input, InputNumber, Divider, Descriptions, Tag
} from 'antd';
import {
  UploadOutlined, FileExcelOutlined, PlusOutlined,
  CheckCircleOutlined, WarningOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { importData } from '../api.js';

const conclusionColor = {
  '通过': 'green', '不通过': 'red', '待确认': 'orange'
};

function evaluateConclusion(tv, lv) {
  if (tv == null || lv == null) return '待确认';
  return tv <= lv ? '通过' : '不通过';
}

const sampleRow = {
  batch_no: '20250512A01',
  reagent_name: '甲醇',
  specification: '色谱纯 500mL',
  manufacturer: '国药集团化学试剂有限公司',
  arrival_date: '2025-05-12',
  quantity: 20,
  unit: '瓶',
  supplier: '国药上海分公司',
  test_item: '农残-有机磷',
  test_value: 0.002,
  limit_value: 0.01,
  test_unit: 'mg/kg',
  test_method: 'GC-MS',
  test_date: '2025-05-13',
  tester: '张工'
};

const expectedCols = [
  { key: 'batch_no', label: '批次号*', example: '20250512A01', required: true },
  { key: 'reagent_name', label: '试剂名称*', example: '甲醇', required: true },
  { key: 'specification', label: '规格', example: '色谱纯 500mL' },
  { key: 'manufacturer', label: '生产厂家', example: '国药集团化学试剂有限公司' },
  { key: 'arrival_date', label: '到货日期', example: '2025-05-12' },
  { key: 'quantity', label: '数量', example: '20' },
  { key: 'unit', label: '单位', example: '瓶' },
  { key: 'supplier', label: '供应商', example: '国药上海分公司' },
  { key: 'test_item', label: '检测项目', example: '农残-有机磷' },
  { key: 'test_value', label: '检测值', example: '0.002' },
  { key: 'limit_value', label: '限值', example: '0.01' },
  { key: 'test_unit', label: '检测单位', example: 'mg/kg' },
  { key: 'test_method', label: '检测方法', example: 'GC-MS' },
  { key: 'test_date', label: '检测日期', example: '2025-05-13' },
  { key: 'tester', label: '检测人', example: '张工' }
];

const colAlias = {
  '批次号': 'batch_no', 'batch_no': 'batch_no', '批号': 'batch_no',
  '试剂名称': 'reagent_name', 'reagent_name': 'reagent_name', '试剂': 'reagent_name',
  '规格': 'specification', 'specification': 'specification',
  '生产厂家': 'manufacturer', 'manufacturer': 'manufacturer', '厂家': 'manufacturer',
  '到货日期': 'arrival_date', 'arrival_date': 'arrival_date',
  '数量': 'quantity', 'quantity': 'quantity',
  '单位': 'unit', 'unit': 'unit',
  '供应商': 'supplier', 'supplier': 'supplier',
  '检测项目': 'test_item', 'test_item': 'test_item', '检测项': 'test_item',
  '检测值': 'test_value', 'test_value': 'test_value',
  '限值': 'limit_value', 'limit_value': 'limit_value',
  '检测单位': 'test_unit', 'test_unit': 'test_unit',
  '检测方法': 'test_method', 'test_method': 'test_method',
  '检测日期': 'test_date', 'test_date': 'test_date',
  '检测人': 'tester', 'tester': 'tester'
};

function ImportPage() {
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [manualVisible, setManualVisible] = useState(false);
  const [form] = Form.useForm();

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const normalized = rows.map(r => {
          const obj = {};
          Object.keys(r).forEach(k => {
            const key = colAlias[k.trim()];
            if (key) obj[key] = r[k];
          });
          if (obj.test_value !== undefined && obj.test_value !== '') {
            obj.test_value = Number(obj.test_value);
          } else {
            obj.test_value = null;
          }
          if (obj.limit_value !== undefined && obj.limit_value !== '') {
            obj.limit_value = Number(obj.limit_value);
          } else {
            obj.limit_value = null;
          }
          if (obj.quantity !== undefined && obj.quantity !== '') {
            obj.quantity = Number(obj.quantity);
          }
          obj.unit = obj.test_unit || obj.unit || '';
          obj.conclusion = evaluateConclusion(obj.test_value, obj.limit_value);
          return obj;
        });
        setPreview(normalized);
        setFileName(file.name);
        setResult(null);
        message.success(`解析成功，共 ${normalized.length} 条记录`);
      } catch (err) {
        console.error(err);
        message.error('文件解析失败，请检查格式');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      message.warning('请先上传或手动添加数据');
      return;
    }
    setImporting(true);
    try {
      const res = await importData({ records: preview, file_name: fileName || '手动录入', operator: '当前用户' });
      setResult(res);
      message.success(`导入完成：新增 ${res.importCount}，更新 ${res.updateCount}，跳过 ${res.skipCount}`);
    } catch (e) {
      message.error(e?.response?.data?.error || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleAddManual = async () => {
    const v = await form.validateFields();
    v.unit = v.test_unit || v.unit || '';
    v.conclusion = evaluateConclusion(v.test_value, v.limit_value);
    setPreview([...preview, { ...v }]);
    form.resetFields();
    setManualVisible(false);
    setFileName('手动录入');
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: expectedCols.map(c => c.label) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '农药残台账模板');
    XLSX.writeFile(wb, '农药残留批次追踪-导入模板.xlsx');
  };

  const previewColumns = [
    { title: '批次号', dataIndex: 'batch_no', width: 120,
      render: v => v ? <code>{v}</code> : <Tag color="red">缺失</Tag> },
    { title: '试剂名称', dataIndex: 'reagent_name', width: 100,
      render: v => v || <Tag color="red">缺失</Tag> },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '厂家', dataIndex: 'manufacturer', width: 150, ellipsis: true },
    { title: '检测项', dataIndex: 'test_item', width: 130 },
    { title: '检测值', dataIndex: 'test_value', width: 80, render: v => v ?? '-' },
    { title: '限值', dataIndex: 'limit_value', width: 80, render: v => v ?? '-' },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '结论(预览)', dataIndex: 'conclusion', width: 90,
      render: v => <Tag color={conclusionColor[v]}>{v}</Tag> },
    { title: '操作', width: 80,
      render: (_, __, idx) => (
        <Button size="small" type="link" danger
                onClick={() => setPreview(preview.filter((_, i) => i !== idx))}>删除</Button>
      ) }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Alert
        type="info" showIcon
        message="重复导入自动去重说明"
        description="系统使用「批次号 + 试剂名称」作为联合唯一键。同一批次再次导入时：批次信息自动更新（不新增），同一检测项自动覆盖更新（不产生第二条冲突记录），检测项不同则补录追加。可避免同一件事出现两份互相打架的结论。"
      />

      <Card
        title={
          <Space>
            <UploadOutlined />
            台账导入
          </Space>
        }
        extra={
          <Space>
            <Button icon={<FileExcelOutlined />} onClick={downloadTemplate}>下载导入模板</Button>
            <Button icon={<PlusOutlined />} onClick={() => setManualVisible(true)}>手动录入一条</Button>
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Upload.Dragger
            accept=".xlsx,.xls,.csv"
            beforeUpload={parseFile}
            showUploadList={false}
            multiple={false}
          >
            <p className="ant-upload-drag-icon"><UploadOutlined /></p>
            <p className="ant-upload-text">点击或拖拽 Excel/CSV 文件到此区域</p>
            <p className="ant-upload-hint">
              支持 .xlsx / .xls / .csv。第一行为表头，字段名可参考模板。
              必填：批次号、试剂名称。同一批次重复导入自动去重。
            </p>
          </Upload.Dragger>

          <Divider orientation="left">
            期望列说明（顺序任意，系统按列名自动匹配）
          </Divider>

          <Descriptions bordered size="small" column={3}>
            {expectedCols.map(c => (
              <Descriptions.Item key={c.key} label={c.label}>
                {c.required && <Tag color="red">必填</Tag>}
                <span style={{ color: '#999', marginLeft: 8 }}>例：{c.example}</span>
              </Descriptions.Item>
            ))}
          </Descriptions>

          {preview.length > 0 && (
            <>
              <Divider orientation="left">
                <Space>
                  <span>导入预览</span>
                  <Tag color="blue">{fileName || '未命名'}</Tag>
                  <Tag color="cyan">{preview.length} 条</Tag>
                </Space>
              </Divider>

              <Alert
                type="warning" showIcon icon={<WarningOutlined />}
                message="去重提示"
                description="如果「批次号 + 试剂名称」已存在，将执行更新而非新增，不会产生冲突的重复记录。"
              />

              <Table columns={previewColumns} dataSource={preview} rowKey={(r, i) => i}
                     size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 10 }} />

              <Space>
                <Button type="primary" size="large" loading={importing} onClick={handleImport}>
                  <CheckCircleOutlined /> 确认导入
                </Button>
                <Button onClick={() => { setPreview([]); setFileName(''); setResult(null); }}>
                  清空预览
                </Button>
              </Space>
            </>
          )}

          {result && (
            <Alert
              type="success" showIcon icon={<InfoCircleOutlined />}
              message={`导入完成`}
              description={
                <div>
                  <p>新增批次：<strong>{result.importCount}</strong>，更新记录：<strong>{result.updateCount}</strong>，跳过：<strong>{result.skipCount}</strong></p>
                  {result.errors?.length > 0 && (
                    <p style={{ color: '#cf1322' }}>错误：{result.errors.map(e => `第${e.row}行：${e.msg}`).join('；')}</p>
                  )}
                </div>
              }
            />
          )}
        </Space>
      </Card>

      <Modal open={manualVisible} onCancel={() => setManualVisible(false)}
             title="手动录入一条台账" width={600}
             footer={[
               <Button onClick={() => setManualVisible(false)}>取消</Button>,
               <Button type="primary" onClick={handleAddManual}>加入预览</Button>
             ]}>
        <Form form={form} layout="vertical">
          <Divider orientation="left" plain>批次信息</Divider>
          <Form.Item label="批次号" name="batch_no" rules={[{ required: true }]}>
            <Input placeholder="如 20250512A01" />
          </Form.Item>
          <Form.Item label="试剂名称" name="reagent_name" rules={[{ required: true }]}>
            <Input placeholder="如 甲醇" />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="specification" label="规格" style={{ width: '50%' }}>
              <Input placeholder="如 色谱纯 500mL" />
            </Form.Item>
            <Form.Item name="manufacturer" label="生产厂家" style={{ width: '50%' }}>
              <Input placeholder="如 国药集团" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="arrival_date" label="到货日期" style={{ width: '50%' }}>
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="supplier" label="供应商" style={{ width: '50%' }}>
              <Input />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="quantity" label="数量" style={{ width: '50%' }}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit" label="单位" style={{ width: '50%' }}>
              <Input placeholder="如 瓶/桶/kg" />
            </Form.Item>
          </Space.Compact>

          <Divider orientation="left" plain>检测信息（可选）</Divider>
          <Form.Item label="检测项目" name="test_item">
            <Input placeholder="如 农残-有机磷" />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="test_value" label="检测值" style={{ width: '33%' }}>
              <InputNumber style={{ width: '100%' }} step="0.0001" />
            </Form.Item>
            <Form.Item name="limit_value" label="限值" style={{ width: '33%' }}>
              <InputNumber style={{ width: '100%' }} step="0.0001" />
            </Form.Item>
            <Form.Item name="test_unit" label="单位" style={{ width: '34%' }}>
              <Input placeholder="如 mg/kg" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="test_method" label="检测方法" style={{ width: '50%' }}>
              <Input placeholder="如 GC-MS" />
            </Form.Item>
            <Form.Item name="test_date" label="检测日期" style={{ width: '50%' }}>
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="检测人" name="tester">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

export default ImportPage;
