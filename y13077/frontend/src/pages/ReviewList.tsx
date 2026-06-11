import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Space,
  Popconfirm,
  message,
  Typography
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Review, ReviewStatus, ReviewConclusion, statusTextMap, conclusionTextMap } from '../types';
import { reviewApi } from '../services/api';

const { Title } = Typography;

interface ListResponse {
  list: Review[];
  total: number;
  page: number;
  pageSize: number;
}

const statusColorMap: Record<ReviewStatus, string> = {
  pending: 'gold',
  processing: 'blue',
  completed: 'green',
  has_issues: 'red'
};

const conclusionColorMap: Record<ReviewConclusion, string> = {
  pass: 'green',
  fail: 'red',
  pending: 'default'
};

const ReviewList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const response = await reviewApi.getList(page, pageSize);
      const result = response.data as { success: boolean; data: ListResponse };
      if (result.success && result.data) {
        setData(result.data.list);
        setTotal(result.data.total);
      }
    } catch (error) {
      message.error('获取预审列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, pageSize]);

  const handleCreate = async (values: { name: string; description?: string }) => {
    try {
      const response = await reviewApi.create(values);
      const result = response.data;
      if (result.success) {
        message.success('创建预审成功');
        setModalVisible(false);
        form.resetFields();
        fetchList();
      }
    } catch (error) {
      message.error('创建预审失败');
      console.error(error);
    }
  };

  const handleCreateSample = async () => {
    try {
      const response = await reviewApi.createSample();
      const result = response.data;
      if (result.success) {
        message.success('创建样例预审成功');
        fetchList();
      }
    } catch (error) {
      message.error('创建样例预审失败');
      console.error(error);
    }
  };

  const handleCreateTest = async () => {
    try {
      const response = await reviewApi.createTest();
      const result = response.data;
      if (result.success) {
        message.success('创建测试数据成功');
        fetchList();
      }
    } catch (error) {
      message.error('创建测试数据失败');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await reviewApi.delete(id);
      const result = response.data;
      if (result.success) {
        message.success('删除成功');
        fetchList();
      }
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (text: string, record: Review) => (
        <Space>
          <span>{text}</span>
          {record.isGrayRelease && (
            <Tag color="purple">样例</Tag>
          )}
        </Space>
      )
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ReviewStatus) => (
        <Tag color={statusColorMap[status]}>
          {statusTextMap[status]}
        </Tag>
      )
    },
    {
      title: '结论',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 120,
      render: (conclusion: ReviewConclusion) => (
        <Tag color={conclusionColorMap[conclusion]}>
          {conclusionTextMap[conclusion]}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_: unknown, record: Review) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/reviews/${record.id}`)}
          >
            查看详情
          </Button>
          <Popconfirm
            title="确定删除该预审吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <Title level={3} style={{ margin: 0 }}>预审列表</Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            创建预审
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleCreateSample}
          >
            创建样例
          </Button>
          <Button
            icon={<ExperimentOutlined />}
            onClick={handleCreateTest}
          >
            创建测试数据
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          }
        }}
        scroll={{ x: 900 }}
      />

      <Modal
        title="创建预审"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="预审名称"
            rules={[{ required: true, message: '请输入预审名称' }]}
          >
            <Input placeholder="请输入预审名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入描述（可选）"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReviewList;
