import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Tag, Space, Card, Row, Col, Modal, Form, Input, App as AntdApp, Statistic, Tooltip
} from 'antd';
import { PlusOutlined, PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../api/client';
import type { ProcessBatch, BatchStatus } from '../types';

const statusColorMap: Record<BatchStatus, string> = {
  待导入: 'default',
  已导入: 'blue',
  冲突检测中: 'processing',
  待复核: 'orange',
  复核中: 'gold',
  已完成: 'green'
};

const BatchList: React.FC = () => {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [list, setList] = useState<ProcessBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/batches?limit=200');
      setList(res.data.items || []);
    } catch (e) {
      console.error(e);
      message.error('加载批次列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await api.post('/batches', values);
      message.success('创建成功');
      setCreateModal(false);
      form.resetFields();
      navigate(`/batches/${res.data.id}`);
    } catch (e: any) {
      if (!e?.fields) message.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<ProcessBatch> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 70
    },
    {
      title: '批次名称',
      dataIndex: 'batch_name',
      render: (t: string, r) => (
        <a onClick={() => navigate(`/batches/${r.id}`)}>{t}</a>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (s: BatchStatus) => <Tag color={statusColorMap[s]}>{s}</Tag>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, r) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/batches/${r.id}`)}
            >
              详情
            </Button>
          </Tooltip>
          <Tooltip title="开始处理">
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/batches/${r.id}/import`)}
            >
              进入
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <h2 className="page-title">KKT 条件练习台 — 批次总览</h2>
            <div className="page-subtitle">
              管理所有排课处理批次。重启后仍可追溯历史处理痕迹。
            </div>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
              新建处理批次
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic title="总批次数" value={list.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="待复核"
              value={list.filter((b) => ['待复核', '复核中'].includes(b.status)).length}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="已完成"
              value={list.filter((b) => b.status === '已完成').length}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="今日新增"
              value={
                list.filter((b) =>
                  dayjs(b.created_at).isAfter(dayjs().startOf('day'))
              ).length
              }
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 20 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新建处理批次"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="批次名称"
            name="batch_name"
            rules={[{ required: true, message: '请输入批次名称' }]}
          >
            <Input placeholder="例如：2026春_KKT条件_第1批" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="选填，例如：期中复习练习" />
          </Form.Item>
          <Form.Item label="操作员" name="operator">
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BatchList;
