import React, { useEffect, useState } from 'react';
import {
  List,
  Tag,
  Button,
  Space,
  Input,
  Modal,
  App as AntdApp,
  Table,
  Row,
  Col,
  Card,
  Statistic,
  Descriptions
} from 'antd';
import { PlusOutlined, RollbackOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';

import { royaltyApi } from '../api/index.js';
import { useAppStore } from '../store/index.js';
import { StatusTag, formatTime } from '../utils/components.jsx';

export default function VersionsPage() {
  const { message, modal } = AntdApp.useApp();
  const operator = useAppStore((s) => s.operator);
  const [versions, setVersions] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  async function load() {
    const data = await royaltyApi.getVersions();
    setVersions(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function createSnapshot() {
    await royaltyApi.createVersion(labelInput || '手动快照', operator);
    message.success('快照已创建');
    setCreateOpen(false);
    setLabelInput('');
    load();
  }

  async function restoreVersion(id, label) {
    modal.confirm({
      title: `恢复版本：${label}？`,
      content:
        '恢复操作会先为当前数据自动创建一个快照，再切换到所选版本。全部过程有历史记录，随时可以再切回来。',
      okButtonProps: { danger: false, type: 'primary' },
      onOk: async () => {
        await royaltyApi.restoreVersion(id, operator);
        message.success('已恢复');
        load();
      }
    });
  }

  async function showDetail(id) {
    const v = await royaltyApi.getVersion(id);
    setDetail(v);
    setDetailOpen(true);
  }

  const filtered = versions.filter((v) => {
    if (!keyword) return true;
    return (
      v.label.toLowerCase().includes(keyword.toLowerCase()) ||
      v.operator.toLowerCase().includes(keyword.toLowerCase())
    );
  });

  const columns = [
    {
      title: '作品名称',
      dataIndex: 'workTitle',
      render: (v) => v || '-'
    },
    { title: '演唱者', dataIndex: 'singerName' },
    { title: '声部', dataIndex: 'part' },
    {
      title: '分账比例',
      dataIndex: 'shareRatio',
      render: (v) => (v != null && v !== '' ? `${v}%` : '-')
    },
    { title: '授权到期日', dataIndex: 'authorizationExpiry' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v) => <StatusTag status={v} />
    },
    {
      title: '排练/授权备注',
      dataIndex: 'rehearsalNote',
      ellipsis: true
    },
    {
      title: '人工备注',
      dataIndex: 'manualNote',
      ellipsis: true
    }
  ];

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }} wrap>
        <h2 style={{ margin: 0 }}>📚 版本管理（版本一多也知道哪份最新）</h2>
        <Space style={{ marginLeft: 'auto' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索版本标签或操作人"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            手动建快照
          </Button>
        </Space>
      </Space>

      <Tag color="blue" style={{ marginBottom: 16 }}>
        共 {filtered.length} 个版本快照 · 第 1 条为最新
      </Tag>

      {filtered.length === 0 ? (
        <div style={{ color: '#8c8c8c', padding: '48px 0', textAlign: 'center' }}>
          暂无版本快照。导入 Excel 或手动创建快照后会出现在这里。
        </div>
      ) : (
        <List
          dataSource={filtered}
          renderItem={(v, idx) => (
            <div className="history-item">
              <Row align="middle" justify="space-between">
                <Col span={18}>
                  <Space>
                    {idx === 0 && <Tag color="blue">最新</Tag>}
                    <strong style={{ fontSize: 15 }}>{v.label}</strong>
                    <Tag color="purple">{v.recordCount} 条记录</Tag>
                  </Space>
                  <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
                    操作人：{v.operator} · 创建时间：{formatTime(v.createdAt)} · 版本 ID：{v.id.slice(0, 12)}
                  </div>
                </Col>
                <Col>
                  <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(v.id)}>
                      查看内容
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<RollbackOutlined />}
                      onClick={() => restoreVersion(v.id, v.label)}
                    >
                      恢复此版本
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>
          )}
        />
      )}

      <Modal
        title="创建手动快照"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={createSnapshot}
        okText="创建"
      >
        <Input
          placeholder="版本标签，如：第一次交付、复核后版本"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
        />
      </Modal>

      <Modal
        title={detail ? `版本详情：${detail.label}` : ''}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={1100}
      >
        {detail && (
          <div>
            <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="操作人">{detail.operator}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatTime(detail.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="记录数">{detail.recordCount}</Descriptions.Item>
            </Descriptions>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="可放行"
                    value={detail.records.filter((r) => r.status === 'ready').length}
                    valueStyle={{ color: '#389e0d' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="材料待补"
                    value={detail.records.filter((r) => r.status === 'pending').length}
                    valueStyle={{ color: '#d46b08' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="授权过期"
                    value={detail.records.filter((r) => r.status === 'expired').length}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="数据来源数" value={new Set(detail.records.map((r) => r.source)).size} />
                </Card>
              </Col>
            </Row>

            <Table
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={detail.records}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
