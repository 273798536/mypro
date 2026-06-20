import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Alert,
  Select,
} from 'antd';
import { UploadOutlined, PlusOutlined, ExportOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { runsApi, importApi } from '../api';
import type { EvaluationRun } from '../types';

const { TextArea } = Input;

const RunList: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<EvaluationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [versionFilter, setVersionFilter] = useState<string | undefined>();
  const [versions, setVersions] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchData = () => {
    setLoading(true);
    runsApi.list(versionFilter ? { model_version: versionFilter } : undefined).then((d) => {
      setData(d);
      setLoading(false);
      const uniq = Array.from(new Set(d.map((x) => x.model_version))) as string[];
      setVersions(uniq);
    });
  };

  useEffect(() => {
    fetchData();
  }, [versionFilter]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (fileList.length === 0) {
        message.warning('请上传评测结果文件');
        return;
      }
      setImporting(true);
      const fd = new FormData();
      fd.append('model_version', values.model_version);
      fd.append('evaluator', values.evaluator);
      fd.append('notes', values.notes || '');
      fd.append('file', fileList[0].originFileObj);
      const result = await importApi.upload(fd);
      setLastResult(result);
      message.success(`导入成功！共 ${result.record_count} 条记录`);
      setOpen(false);
      form.resetFields();
      setFileList([]);
      fetchData();
      if (result.run_id) {
        setTimeout(() => navigate(`/runs/${result.run_id}`), 600);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '模型版本',
      dataIndex: 'model_version',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '原始文件名', dataIndex: 'original_filename', ellipsis: true },
    { title: '复核人', dataIndex: 'evaluator', width: 100 },
    { title: '记录条数', dataIndex: 'record_count', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'processing' ? 'orange' : 'default'}>
          {s}
        </Tag>
      ),
    },
    {
      title: '导入时间',
      dataIndex: 'created_at',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    { title: '备注', dataIndex: 'notes', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, r: EvaluationRun) => (
        <Space>
          <Button type="primary" size="small" onClick={() => navigate(`/runs/${r.id}`)}>
            复核 <ArrowRightOutlined />
          </Button>
          <Button
            size="small"
            icon={<ExportOutlined />}
            onClick={async () => {
              const data = await runsApi.export(r.id);
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `gatekeeper_run_${r.id}_${r.model_version}.json`;
              a.click();
            }}
          >
            导出
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <span style={{ color: '#666' }}>模型版本筛选：</span>
          <Select
            style={{ width: 160 }}
            allowClear
            placeholder="全部"
            value={versionFilter}
            onChange={setVersionFilter}
            options={versions.map((v) => ({ value: v, label: v }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          导入评测结果
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="导入新的评测结果（材料入库）"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={importing}
        width={560}
        okText="开始导入"
      >
        {lastResult && lastResult.warnings?.length > 0 && (
          <Alert
            type="warning"
            message="上次导入提示"
            description={
              <ul>
                {lastResult.warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            }
            style={{ marginBottom: 12 }}
            closable
          />
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            label="模型版本"
            name="model_version"
            rules={[{ required: true, message: '请输入模型版本号' }]}
          >
            <Input placeholder="如：v1.3.0，用于版本对比与追溯" />
          </Form.Item>
          <Form.Item
            label="复核人"
            name="evaluator"
            rules={[{ required: true, message: '请输入复核人姓名' }]}
          >
            <Input placeholder="如：小林" />
          </Form.Item>
          <Form.Item label="备注（可选）" name="notes">
            <TextArea rows={2} placeholder="本次评测的备注信息，如是否修复某bug等" />
          </Form.Item>
          <Form.Item label="评测结果文件（CSV / Excel）" required>
            <Upload
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => setFileList(fileList)}
              maxCount={1}
              accept=".csv,.xlsx,.xls"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
              字段名不一致会自动归一化，来源和原始字段全部保留。
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RunList;
