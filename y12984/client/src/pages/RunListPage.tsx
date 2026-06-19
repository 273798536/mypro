import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, Table, Upload, Tag, Space, Modal, message, Popconfirm, Typography } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, BarChartOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Run } from '../types';
import { runApi, importApi } from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function RunListPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await runApi.list();
      setRuns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.csv,.xlsx,.xls',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const result = await importApi.upload(file as File);
        message.success(`导入成功，共 ${result.recordCount} 条记录`);
        onSuccess?.(result);
        loadRuns();
        setTimeout(() => navigate(`/runs/${result.runId}`), 500);
      } catch (e: any) {
        const msg = e?.response?.data?.error || '导入失败';
        message.error(msg);
        onError?.(e);
      }
    }
  };

  const handleDelete = async (id: number) => {
    await runApi.remove(id);
    message.success('已删除');
    loadRuns();
  };

  const columns = [
    {
      title: '运行名称',
      dataIndex: 'run_name',
      render: (text: string, record: Run) => (
        <a onClick={() => navigate(`/runs/${record.id}`)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      )
    },
    { title: '导入文件', dataIndex: 'filename' },
    {
      title: '导入时间',
      dataIndex: 'import_time',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    { title: '记录总数', dataIndex: 'total_records', width: 100 },
    {
      title: '异常记录',
      dataIndex: 'anomaly_count',
      width: 100,
      render: (n: number) =>
        n > 0 ? <Tag color="red">{n} 条</Tag> : <Tag color="green">0</Tag>
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, record: Run) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/runs/${record.id}`)}>
            查看
          </Button>
          <Popconfirm title="确定删除本次运行记录？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChartOutlined style={{ fontSize: 22, color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>列存报表压缩评估</Title>
          </div>
          <Space>
            <Upload {...uploadProps}>
              <Button type="primary" icon={<UploadOutlined />}>
                导入报表
              </Button>
            </Upload>
          </Space>
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="card-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>运行历史</h3>
              <Upload {...uploadProps}>
                <Button icon={<PlusOutlined />}>新建评估</Button>
              </Upload>
            </div>
            <p className="hint-text" style={{ marginBottom: 16 }}>
              支持 CSV / Excel 格式导入。导入后系统将自动检测备份缺口、压缩率异常、权限缺失等问题，并按异常类型分类展示。
            </p>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={runs}
              pagination={{ pageSize: 10 }}
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
}
