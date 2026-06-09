import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Table, Button, Space, Row, Col, App as AntdApp, Tag, Alert, Radio, Input
} from 'antd';
import {
  ExportOutlined, TeamOutlined, UserOutlined, WarningOutlined, FileTextOutlined, DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../api/client';
import type { ExportReport } from '../types';

const ExportPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { message } = AntdApp.useApp();
  const [list, setList] = useState<ExportReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [operator, setOperator] = useState('');
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/batches/${batchId}/exports?limit=200`);
      setList(res.data || []);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [batchId]);

  const doExport = async (type: 'teacher' | 'student' | 'conflicts' | 'json') => {
    if (!batchId) return;
    setRunning(type);
    try {
      const endpointMap: Record<string, string> = {
        teacher: 'teacher',
        student: 'student',
        conflicts: 'conflicts',
        json: 'json'
      };
      const url = `/batches/${batchId}/exports/${endpointMap[type]}`;
      const params: Record<string, any> = { exported_by: operator || undefined };
      if (type !== 'json') params.fmt = format;
      const res = await api.post(url, null, { params });
      message.success('导出成功');
      setTimeout(() => {
        window.open(`/api/exports/${res.data.id}/download`, '_blank');
      }, 300);
      load();
    } catch (e) {
      message.error('导出失败');
    } finally {
      setRunning(null);
    }
  };

  const prettySize = (n?: number) => {
    if (!n) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const typeColorMap: Record<string, string> = {
    teacher_report: 'blue',
    student_report: 'green',
    conflicts: 'orange',
    json_snapshot: 'purple'
  };

  const typeLabelMap: Record<string, string> = {
    teacher_report: '教师复核报告',
    student_report: '学生使用报告',
    conflicts: '冲突记录',
    json_snapshot: '完整快照(JSON)'
  };

  const columns: ColumnsType<ExportReport> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '报告名称', dataIndex: 'report_name' },
    {
      title: '类型',
      dataIndex: 'report_type',
      width: 160,
      render: (v) => <Tag color={typeColorMap[v] || 'default'}>{typeLabelMap[v] || v}</Tag>
    },
    { title: '文件大小', dataIndex: 'file_size', width: 120, render: (v) => prettySize(v) },
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
      width: 140,
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => window.open(`/api/exports/${r.id}/download`, '_blank')}
        >
          下载
        </Button>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">
          <ExportOutlined /> 报告导出
        </h2>
        <div className="page-subtitle">
          提供多种报告：排课老师使用的复核报告（含完整信息）、学生使用的报告（含可用性标识）、冲突记录、完整 JSON 快照。
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="导出说明"
        description={
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li><b>教师复核报告：</b>包含原始行号、图片名、来源备注、异常分类、结果分级、误差分析等全部字段</li>
            <li><b>学生使用报告：</b>简化版本，仅显示题目信息和"直接使用 / 暂缓使用 / 找老师复核"的使用建议，保护内部复核细节</li>
            <li><b>冲突记录：</b>导出题目清单与参数表的所有冲突及解决建议</li>
            <li><b>完整快照(JSON)：</b>包含批次内所有数据的 JSON 存档，用于历史追溯或二次处理</li>
          </ul>
        }
      />

      <Card title="导出选项">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>导出格式</div>
            <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)} optionType="button">
              <Radio.Button value="xlsx">Excel (.xlsx)</Radio.Button>
              <Radio.Button value="csv">CSV (.csv)</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>导出人（选填）</div>
            <Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="例如：张老师" />
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              type="primary"
              size="large"
              icon={<TeamOutlined />}
              loading={running === 'teacher'}
              onClick={() => doExport('teacher')}
            >
              导出教师复核报告
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              type="primary"
              size="large"
              icon={<UserOutlined />}
              loading={running === 'student'}
              onClick={() => doExport('student')}
              style={{ background: '#389e0d', borderColor: '#389e0d' }}
            >
              导出学生使用报告
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              type="primary"
              size="large"
              icon={<WarningOutlined />}
              loading={running === 'conflicts'}
              onClick={() => doExport('conflicts')}
              style={{ background: '#d46b08', borderColor: '#d46b08' }}
            >
              导出冲突记录
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              block
              size="large"
              icon={<FileTextOutlined />}
              loading={running === 'json'}
              onClick={() => doExport('json')}
            >
              导出完整 JSON 快照
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="历史导出（{list.length}）" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default ExportPage;
