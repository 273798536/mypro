import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select,
  message, Card, Alert, Tooltip, Popconfirm
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  InfoCircleOutlined, BulbOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { guideAPI } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

const positionMap = {
  sidebar_top: { text: '侧边栏顶部', color: 'blue' },
  main_top: { text: '主内容顶部', color: 'orange' },
  main_middle: { text: '主内容中间', color: 'green' },
  main_right: { text: '主内容右侧', color: 'purple' },
  sidebar_bottom: { text: '侧边栏底部', color: 'cyan' }
};

function GuideManagement() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [form] = Form.useForm();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const response = await guideAPI.list(false);
      setGuides(response.data);
    } catch (error) {
      message.error('加载操作指引失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGuide(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (guide) => {
    setEditingGuide(guide);
    form.setFieldsValue(guide);
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingGuide) {
        await guideAPI.update(editingGuide.id, values);
        message.success('更新成功');
      } else {
        await guideAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadGuides();
    } catch (error) {
      message.error(error.response?.data?.detail || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await guideAPI.delete(id);
      message.success('删除成功');
      loadGuides();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          <span>{record.icon && <span style={{ marginRight: 4 }}>{record.icon}</span>}</span>
          {text}
          {!record.is_active && <Tag color="default">已停用</Tag>}
        </Space>
      )
    },
    {
      title: '标识',
      dataIndex: 'section_key',
      key: 'section_key',
      render: k => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{k}</code>
    },
    {
      title: '显示位置',
      dataIndex: 'position_hint',
      key: 'position_hint',
      render: p => {
        const info = positionMap[p] || { text: p, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: t => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => isAdmin && (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除此指引？"
            onConfirm={() => handleDelete(record.id)}
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
    <div className="page-container">
      <Alert
        message={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            操作指引说明
          </Space>
        }
        description={
          <div>
            <p>操作指引会显示在界面的指定位置，帮助排班同事快速了解：</p>
            <ul style={{ margin: '8px 0 0 20px' }}>
              <li>📁 <strong>材料上传区</strong> - 侧边栏顶部，告知哪里放材料</li>
              <li>⚠️ <strong>异常查看区</strong> - 主内容顶部，告知哪里看异常</li>
              <li>✏️ <strong>人工修正区</strong> - 主内容中间，操作说明</li>
              <li>📤 <strong>报告导出区</strong> - 侧边栏底部，告知哪里重新导出</li>
              <li>📊 <strong>状态跟踪区</strong> - 主内容右侧，状态查看说明</li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card
        title="操作指引管理"
        extra={isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建指引
          </Button>
        )}
      >
        <Table
          columns={columns}
          dataSource={guides}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: record => (
              <div style={{ padding: '0 24px', background: '#fafafa', borderRadius: 4 }}>
                <p style={{ margin: '8px 0' }}><strong>内容：</strong></p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{record.content}</p>
              </div>
            )
          }}
        />
      </Card>

      <Modal
        title={editingGuide ? '编辑操作指引' : '新建操作指引'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="section_key"
            label="唯一标识"
            rules={[{ required: true, message: '请输入唯一标识' }]}
          >
            <Input placeholder="例如：upload_materials" disabled={!!editingGuide} />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="例如：📁 材料上传区" />
          </Form.Item>
          <Form.Item
            name="icon"
            label="图标（Emoji）"
          >
            <Input placeholder="例如：📁" maxLength={4} />
          </Form.Item>
          <Form.Item
            name="position_hint"
            label="显示位置"
            rules={[{ required: true, message: '请选择显示位置' }]}
          >
            <Select placeholder="选择显示位置">
              {Object.entries(positionMap).map(([key, value]) => (
                <Option key={key} value={key}>{value.text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="指引内容"
            rules={[{ required: true, message: '请输入指引内容' }]}
          >
            <TextArea rows={4} placeholder="详细的操作说明..." />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序号"
          >
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="是否启用"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>启用</Option>
              <Option value={false}>停用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingGuide ? '保存' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default GuideManagement;
