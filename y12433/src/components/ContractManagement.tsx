import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Card,
  Descriptions,
} from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import type { Contract } from '../types';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../utils/settlement';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ContractManagement: React.FC = () => {
  const { contracts, addContract, updateContract, setSelectedContractId, selectedContractId } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [form] = Form.useForm();

  const columns: ColumnsType<Contract> = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: 160,
      render: (text) => <a>{text}</a>,
    },
    {
      title: '达人',
      dataIndex: 'influencerName',
      key: 'influencerName',
      width: 140,
    },
    {
      title: '合同期限',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <span>
          {record.startDate} ~ {record.endDate}
        </span>
      ),
    },
    {
      title: '基础坑位费',
      dataIndex: 'baseFee',
      key: 'baseFee',
      width: 130,
      render: (value) => formatCurrency(value),
    },
    {
      title: '佣金比例',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      width: 100,
      render: (value) => `${(value * 100).toFixed(0)}%`,
    },
    {
      title: '退货扣点',
      dataIndex: 'returnDeductionRate',
      key: 'returnDeductionRate',
      width: 100,
      render: (value) => `${(value * 100).toFixed(0)}%`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value) => formatDate(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => {
              setSelectedContractId(record.id);
            }}
          >
            生成清算
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingContract(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    form.setFieldsValue({
      ...contract,
      period: [dayjs(contract.startDate), dayjs(contract.endDate)],
    });
    setIsModalOpen(true);
  };

  const handleViewDetail = (contract: Contract) => {
    setViewingContract(contract);
    setIsDetailOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const contractData: Contract = {
        id: editingContract?.id || `contract-${Date.now()}`,
        contractNo: values.contractNo,
        influencerId: `infl-${Date.now()}`,
        influencerName: values.influencerName,
        startDate: values.period[0].format('YYYY-MM-DD'),
        endDate: values.period[1].format('YYYY-MM-DD'),
        baseFee: values.baseFee,
        commissionRate: values.commissionRate / 100,
        returnDeductionRate: values.returnDeductionRate / 100,
        status: values.status,
        createdAt: editingContract?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: editingContract?.attachments || [],
      };

      if (editingContract) {
        updateContract(contractData);
      } else {
        addContract(contractData);
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <div className="p-6">
      <Card
        title="达人合同管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增合同
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={contracts}
          rowKey="id"
          scroll={{ x: 1200 }}
          rowClassName={(record) =>
            record.id === selectedContractId ? 'bg-blue-50' : ''
          }
        />
      </Card>

      <Modal
        title={editingContract ? '编辑合同' : '新增合同'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="contractNo"
            label="合同编号"
            rules={[{ required: true, message: '请输入合同编号' }]}
          >
            <Input placeholder="如：HT-2026-05-001" />
          </Form.Item>
          <Form.Item
            name="influencerName"
            label="达人名称"
            rules={[{ required: true, message: '请输入达人名称' }]}
          >
            <Input placeholder="如：美妆达人小美" />
          </Form.Item>
          <Form.Item
            name="period"
            label="合同期限"
            rules={[{ required: true, message: '请选择合同期限' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="baseFee"
            label="基础坑位费（元）"
            rules={[{ required: true, message: '请输入基础坑位费' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="commissionRate"
              label="佣金比例（%）"
              rules={[{ required: true, message: '请输入佣金比例' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={100} />
            </Form.Item>
            <Form.Item
              name="returnDeductionRate"
              label="退货扣点比例（%）"
              rules={[{ required: true, message: '请输入退货扣点比例' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={100} />
            </Form.Item>
          </div>
          <Form.Item
            name="status"
            label="合同状态"
            rules={[{ required: true, message: '请选择合同状态' }]}
            initialValue="active"
          >
            <Select>
              <Option value="draft">草稿</Option>
              <Option value="active">生效中</Option>
              <Option value="expired">已过期</Option>
              <Option value="terminated">已终止</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="合同详情"
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={null}
        width={700}
      >
        {viewingContract && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="合同编号" span={1}>
              {viewingContract.contractNo}
            </Descriptions.Item>
            <Descriptions.Item label="达人" span={1}>
              {viewingContract.influencerName}
            </Descriptions.Item>
            <Descriptions.Item label="合同期限" span={2}>
              {viewingContract.startDate} ~ {viewingContract.endDate}
            </Descriptions.Item>
            <Descriptions.Item label="基础坑位费" span={1}>
              {formatCurrency(viewingContract.baseFee)}
            </Descriptions.Item>
            <Descriptions.Item label="状态" span={1}>
              <Tag color={getStatusColor(viewingContract.status)}>
                {getStatusLabel(viewingContract.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="佣金比例" span={1}>
              {(viewingContract.commissionRate * 100).toFixed(0)}%
            </Descriptions.Item>
            <Descriptions.Item label="退货扣点" span={1}>
              {(viewingContract.returnDeductionRate * 100).toFixed(0)}%
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={1}>
              {formatDate(viewingContract.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={1}>
              {formatDate(viewingContract.updatedAt)}
            </Descriptions.Item>
            {viewingContract.attachments.length > 0 && (
              <Descriptions.Item label="附件" span={2}>
                {viewingContract.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2">
                    <FileTextOutlined />
                    <span>{att.name}</span>
                  </div>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ContractManagement;
