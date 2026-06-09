import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Upload, Button, Table, Tag, Space, Row, Col, Tabs, Input, message, App as AntdApp, Divider, Tooltip, Alert
} from 'antd';
import { UploadOutlined, FileExcelOutlined, RocketOutlined, SearchOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '../api/client';
import type { QuestionItem, ParamRecord, ProcessBatch } from '../types';

const { TabPane } = Tabs;

const ImportPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { message: msg } = AntdApp.useApp();
  const [batch, setBatch] = useState<ProcessBatch | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [params, setParams] = useState<ParamRecord[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [pLoading, setPLoading] = useState(false);
  const [qKeyword, setQKeyword] = useState('');
  const [pKeyword, setPKeyword] = useState('');
  const [uploadingQ, setUploadingQ] = useState(false);
  const [uploadingP, setUploadingP] = useState(false);

  const load = async () => {
    if (!batchId) return;
    try {
      const res = await api.get(`/batches/${batchId}`);
      setBatch(res.data);
    } catch (e) {}
  };

  const loadQuestions = async () => {
    if (!batchId) return;
    setQLoading(true);
    try {
      const res = await api.get(`/batches/${batchId}/questions?limit=500&keyword=${encodeURIComponent(qKeyword)}`);
      setQuestions(res.data || []);
    } finally {
      setQLoading(false);
    }
  };

  const loadParams = async () => {
    if (!batchId) return;
    setPLoading(true);
    try {
      const res = await api.get(
        `/batches/${batchId}/params?limit=500&question_code=${encodeURIComponent(pKeyword)}`
      );
      setParams(res.data || []);
    } finally {
      setPLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadQuestions();
    loadParams();
  }, [batchId]);

  const handleUploadQuestions: UploadProps['customRequest'] = async (options) => {
    if (!batchId || !options.file) return;
    setUploadingQ(true);
    try {
      const formData = new FormData();
      formData.append('file', options.file as File);
      formData.append('source_remark_prefix', '');
      const res = await api.post(`/batches/${batchId}/import/questions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      msg.success(res.data.message);
      options.onSuccess?.(res.data);
      loadQuestions();
      load();
    } catch (e: any) {
      const errMsg = e?.response?.data?.detail || '上传失败';
      msg.error(errMsg);
      options.onError?.(e);
    } finally {
      setUploadingQ(false);
    }
  };

  const handleUploadParams: UploadProps['customRequest'] = async (options) => {
    if (!batchId || !options.file) return;
    setUploadingP(true);
    try {
      const formData = new FormData();
      formData.append('file', options.file as File);
      const res = await api.post(`/batches/${batchId}/import/params`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      msg.success(res.data.message);
      options.onSuccess?.(res.data);
      loadParams();
      load();
    } catch (e: any) {
      const errMsg = e?.response?.data?.detail || '上传失败';
      msg.error(errMsg);
      options.onError?.(e);
    } finally {
      setUploadingP(false);
    }
  };

  const runConflictDetect = async () => {
    if (!batchId) return;
    try {
      msg.loading({ content: '正在检测冲突...', key: 'detect', duration: 0 });
      const res = await api.post(`/batches/${batchId}/conflicts/detect`);
      msg.success({
        content: `冲突检测完成，共发现 ${res.data.conflicts_count} 条冲突`,
        key: 'detect'
      });
      setTimeout(() => navigate(`/batches/${batchId}/review`), 500);
    } catch (e: any) {
      msg.error({ content: e?.response?.data?.detail || '检测失败', key: 'detect' });
    }
  };

  const qColumns: ColumnsType<QuestionItem> = [
    { title: '原始行号', dataIndex: 'original_row_no', width: 90 },
    { title: '题目编号', dataIndex: 'question_code', width: 120 },
    { title: '题目名称', dataIndex: 'question_title', ellipsis: true },
    { title: '图片名', dataIndex: 'image_name', width: 150, render: (v) => v || '-' },
    { title: '知识点', dataIndex: 'knowledge_point', width: 150, render: (v) => v || '-' },
    { title: '难度', dataIndex: 'difficulty', width: 80 },
    {
      title: '来源备注',
      dataIndex: 'source_remark',
      render: (v: string) => (
        <Tooltip title={v}>
          <div className="source-info" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v || '-'}
          </div>
        </Tooltip>
      )
    }
  ];

  const pColumns: ColumnsType<ParamRecord> = [
    { title: '原始行号', dataIndex: 'original_row_no', width: 90 },
    { title: '题目编号', dataIndex: 'question_code', width: 120 },
    { title: '参数名', dataIndex: 'param_key', width: 160 },
    { title: '参数值', dataIndex: 'param_value' },
    { title: '来源工作表', dataIndex: 'source_sheet', width: 120, render: (v) => v || '-' },
    {
      title: '来源备注',
      dataIndex: 'source_remark',
      render: (v: string) => (
        <Tooltip title={v}>
          <div className="source-info" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v || '-'}
          </div>
        </Tooltip>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <h2 className="page-title">数据导入</h2>
            <div className="page-subtitle">
              分别导入 <b>题目清单</b> 与 <b>KKT 参数表</b>。系统会保留每条记录的 <b>原始行号、图片名、来源备注</b>，
              便于复核时追溯到原始表或记录。
            </div>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<RocketOutlined />} onClick={runConflictDetect}>
                检测冲突并进入复核
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {batch && (
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message={`当前批次：${batch.batch_name}（状态：${batch.status}）`}
          description="支持 Excel / CSV。题目清单建议包含列：题目编号、题目、图片、难度、知识点、备注、KKT参数字段；参数表建议包含列：题目编号 + 各KKT参数字段。"
        />
      )}

      <Tabs defaultActiveKey="questions">
        <TabPane tab={<span><FileExcelOutlined /> 题目清单（{questions.length}）</span>} key="questions">
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Upload
                  accept=".xlsx,.xls,.csv"
                  showUploadList={false}
                  customRequest={handleUploadQuestions}
                  disabled={uploadingQ}
                >
                  <Button icon={<UploadOutlined />} type="primary" loading={uploadingQ}>
                    上传题目清单
                  </Button>
                </Upload>
                <span style={{ marginLeft: 12, color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
                  支持 .xlsx/.xls/.csv，系统自动保留原始行号
                </span>
              </Col>
              <Col>
                <Input
                  placeholder="搜索题目编号/名称"
                  prefix={<SearchOutlined />}
                  value={qKeyword}
                  onChange={(e) => setQKeyword(e.target.value)}
                  onPressEnter={loadQuestions}
                  style={{ width: 240 }}
                  allowClear
                />
                <Button style={{ marginLeft: 8 }} onClick={loadQuestions}>
                  查询
                </Button>
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0 16px 0' }} />
            <Table
              rowKey="id"
              size="small"
              loading={qLoading}
              columns={qColumns}
              dataSource={questions}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1100 }}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><FileExcelOutlined /> KKT 参数表（{params.length}）</span>} key="params">
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Upload
                  accept=".xlsx,.xls,.csv"
                  showUploadList={false}
                  customRequest={handleUploadParams}
                  disabled={uploadingP}
                >
                  <Button icon={<UploadOutlined />} type="primary" loading={uploadingP}>
                    上传参数表
                  </Button>
                </Upload>
                <span style={{ marginLeft: 12, color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
                  每列一个参数，一行一题多参数会被拆分成多条记录
                </span>
              </Col>
              <Col>
                <Input
                  placeholder="按题目编号筛选"
                  prefix={<SearchOutlined />}
                  value={pKeyword}
                  onChange={(e) => setPKeyword(e.target.value)}
                  onPressEnter={loadParams}
                  style={{ width: 240 }}
                  allowClear
                />
                <Button style={{ marginLeft: 8 }} onClick={loadParams}>
                  查询
                </Button>
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0 16px 0' }} />
            <Table
              rowKey="id"
              size="small"
              loading={pLoading}
              columns={pColumns}
              dataSource={params}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ImportPage;
