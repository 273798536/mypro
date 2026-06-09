import React, { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Switch, Tag, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../context/AppContext';
import type { ConstraintRule } from '../types';

const typeMap: Record<ConstraintRule['type'], string> = {
  range: '范围约束',
  dependency: '依赖约束',
  threshold: '阈值约束',
  extrapolation: '外推约束',
};

const ConstraintConfigPanel: React.FC = () => {
  const { state, updateRules } = useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<ConstraintRule | null>(null);

  const columns: ColumnsType<ConstraintRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (v, r) => (
        <Space>
          <Switch
            size="small"
            checked={r.enabled}
            onChange={(checked) => toggleRule(r.id, checked)}
          />
          <span>{v}</span>
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (v: ConstraintRule['type']) => <Tag>{typeMap[v]}</Tag> },
    {
      title: '参数',
      key: 'params',
      render: (_v, r) => (
        <Space size={4} wrap>
          {Object.entries(r.params).map(([k, v]) => (
            <Tag key={k}>
              {k}: {String(v)}
            </Tag>
          ))}
        </Space>
      ),
    },
    { title: '说明', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'op',
      width: 140,
      render: (_v, r) => (
        <Space>
          <Button size="small" onClick={() => editRule(r)}>编辑</Button>
          <Popconfirm title="确定删除此规则？" onConfirm={() => deleteRule(r.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const toggleRule = (id: string, enabled: boolean) => {
    const next = state.constraintRules.map((r) => (r.id === id ? { ...r, enabled } : r));
    updateRules(next);
    message.success(enabled ? '规则已启用，校验已自动更新' : '规则已禁用，校验已自动更新');
  };

  const deleteRule = (id: string) => {
    const next = state.constraintRules.filter((r) => r.id !== id);
    updateRules(next);
    message.success('规则已删除，校验已重新执行');
  };

  const editRule = (r: ConstraintRule) => {
    setEditing(r);
    form.setFieldsValue({
      name: r.name,
      type: r.type,
      description: r.description,
      ...Object.fromEntries(
        Object.entries(r.params).map(([k, v]) => [k, typeof v === 'number' ? v : String(v)])
      ),
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'threshold', enabled: true });
    setOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const paramKeys = Object.keys(values).filter(
      (k) => !['name', 'type', 'description', 'enabled'].includes(k)
    );
    const params: Record<string, number | string> = {};
    paramKeys.forEach((k) => {
      const v = values[k];
      params[k] = typeof v === 'number' ? v : String(v ?? '');
    });
    const base: ConstraintRule = {
      id: editing?.id ?? uuidv4(),
      name: values.name,
      type: values.type,
      description: values.description,
      params,
      enabled: editing?.enabled ?? true,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    let next: ConstraintRule[];
    if (editing) {
      next = state.constraintRules.map((r) => (r.id === editing.id ? base : r));
    } else {
      next = [...state.constraintRules, base];
    }
    updateRules(next);
    setOpen(false);
    message.success('规则已更新，约束校验已同步重新计算');
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Space>
          <h3 style={{ margin: 0 }}>约束规则配置</h3>
          <Button type="primary" onClick={openNew}>新增规则</Button>
          <span style={{ color: '#888', fontSize: 12 }}>
            参数变更后，约束校验会自动重新执行
          </span>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={state.constraintRules}
        pagination={false}
        size="small"
        bordered
      />
      <Modal
        open={open}
        title={editing ? '编辑约束规则' : '新增约束规则'}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
            <Input placeholder="如：外推步数上限" />
          </Form.Item>
          <Form.Item name="type" label="规则类型" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="规则描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="参数（key: value，每行一个参数名）">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Input style={{ width: 120 }} placeholder="参数名" id="p_k_1" />
                <InputNumber style={{ width: 160 }} placeholder="数值" id="p_v_1" />
              </Space>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ConstraintConfigPanel;
