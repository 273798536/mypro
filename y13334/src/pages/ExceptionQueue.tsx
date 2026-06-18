import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Button,
  Space,
  Input,
  App as AntdApp,
  Dropdown,
  Modal,
  Form,
  Input as AntInput,
  Select,
  Divider,
  Progress,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  SwapOutlined,
  DashboardOutlined,
  FileTextOutlined,
  CommentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { ProductRecord, ExceptionStatus, AttributeStatus } from '@/types';

const STATUS_MAP: Record<AttributeStatus, { color: string; label: string }> = {
  pass: { color: 'success', label: '通过' },
  warning: { color: 'warning', label: '预警' },
  fail: { color: 'error', label: '异常' },
  pending: { color: 'default', label: '待处理' },
};

const EXCEPTION_TABS = [
  {
    key: 'pending_material',
    label: (count: number) => (
      <Space>
        <WarningOutlined style={{ color: '#faad14' }} />
        待补材料 <Tag color="warning">{count}</Tag>
      </Space>
    ),
    desc: '需要补充材料后再判断，暂不影响总体统计',
  },
  {
    key: 'manual_overruled',
    label: (count: number) => (
      <Space>
        <EyeOutlined style={{ color: '#722ed1' }} />
        人工改判 <Tag color="purple">{count}</Tag>
      </Space>
    ),
    desc: '人工推翻模型判定，可追查到原始模型输出',
  },
  {
    key: 'handled',
    label: (count: number) => (
      <Space>
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
        已处理 <Tag color="success">{count}</Tag>
      </Space>
    ),
    desc: '已处理归档，保留处理记录供复核',
  },
];

const ExceptionQueue: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message, modal } = AntdApp.useApp();

  const exceptionRecords = useStore(s => s.exceptionRecords);
  const getRecordById = useStore(s => s.getRecordById);
  const updateExceptionStatus = useStore(s => s.updateExceptionStatus);
  const addProcessLog = useStore(s => s.addProcessLog);

  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'pending_material');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<ProductRecord | null>(null);
  const [transferForm] = Form.useForm();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const onTabChange = (key: string) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  const openTransferModal = (r: ProductRecord) => {
    setCurrentRecord(r);
    transferForm.setFieldsValue({
      targetStatus: 'handled',
      note: r.exceptionNote || '',
    });
    setTransferModalOpen(true);
  };

  const doTransfer = async () => {
    if (!currentRecord) return;
    const values = await transferForm.validateFields();
    updateExceptionStatus(currentRecord.id, values.targetStatus as ExceptionStatus, values.note);
    addProcessLog(currentRecord.id, {
      operator: '小孟（评测）',
      action: values.targetStatus === 'handled' ? 'manual_pass' : values.targetStatus === 'manual_overruled' ? 'overruled_pass' : 'material_requested',
      actionLabel: `异常队列流转 → ${values.targetStatus === 'handled' ? '已处理' : values.targetStatus === 'manual_overruled' ? '人工改判' : '待补材料'}`,
      comment: values.note,
      fromStatus: currentRecord.overallStatus,
      toStatus: currentRecord.overallStatus,
    });
    message.success(`已流转：${currentRecord.id}`);
    setTransferModalOpen(false);
    setCurrentRecord(null);
  };

  const buildColumns = (tabKey: ExceptionStatus) => ([
    {
      title: '记录ID',
      dataIndex: 'id',
      width: 110,
      render: (v: string) => (
        <span
          style={{ fontFamily: 'monospace', color: '#1677ff', cursor: 'pointer' }}
          onClick={() => navigate(`/record/${v}`)}
        >
          {v}
        </span>
      ),
    },
    {
      title: '商品信息',
      render: (_: any, r: ProductRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.productName}</div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
            {r.category} · {r.brand} · SKU{r.productId}
          </div>
        </div>
      ),
    },
    {
      title: '综合状态',
      width: 120,
      render: (_: any, r: ProductRecord) => {
        const s = STATUS_MAP[r.overallStatus];
        return (
          <Space direction="vertical" size={2}>
            <Tag color={s.color} style={{ fontSize: 13 }}>{s.label} {r.overallScore}</Tag>
            {r.finalConclusion.isManualOverride && <Tag color="purple" style={{ fontSize: 10 }}>已改判</Tag>}
          </Space>
        );
      },
    },
    {
      title: '异常维度',
      width: 200,
      render: (_: any, r: ProductRecord) => (
        <Space wrap size={4}>
          {r.attributes.filter(a => a.status !== 'pass').map(a => (
            <Tag
              key={a.name}
              color={STATUS_MAP[a.status as AttributeStatus].color}
              style={{ fontSize: 11, margin: 0 }}
            >
              {a.name} {a.score}
            </Tag>
          ))}
          {r.attributes.every(a => a.status === 'pass') && (
            <span style={{ color: 'rgba(0,0,0,0.35)' }}>无明显异常</span>
          )}
        </Space>
      ),
    },
    {
      title: tabKey === 'pending_material' ? '缺少材料' : tabKey === 'manual_overruled' ? '改判说明' : '处理摘要',
      dataIndex: 'exceptionNote',
      ellipsis: true,
      render: (v: string | undefined) => (
        <Tooltip title={v}>
          <Space size={4}>
            {tabKey === 'pending_material' ? <FileTextOutlined style={{ color: '#faad14' }} /> :
             tabKey === 'manual_overruled' ? <EyeOutlined style={{ color: '#722ed1' }} /> :
             <CommentOutlined style={{ color: '#52c41a' }} />}
            <span>{v || '—'}</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '处理日志',
      width: 110,
      render: (_: any, r: ProductRecord) => (
        <Tooltip title={r.processLogs.map(l => `${l.timestamp.slice(5)} ${l.actionLabel}`).join('\n')}>
          <Space>
            <ClockCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
            <span style={{ fontSize: 12 }}>{r.processLogs.length} 条</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '评测人',
      dataIndex: 'evaluator',
      width: 90,
    },
    {
      title: '操作',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, r: ProductRecord) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/record/${r.id}`)}>
            对照详情
          </Button>
          <Button type="link" size="small" icon={<DashboardOutlined />} onClick={() => navigate(`/dashboard`)}>
            看板定位
          </Button>
          <Dropdown
            menu={{
              items: EXCEPTION_TABS
                .filter(t => t.key !== tabKey)
                .map(t => ({
                  key: t.key,
                  icon: <SwapOutlined />,
                  label: `流转到：${t.key === 'handled' ? '已处理' : t.key === 'pending_material' ? '待补材料' : '人工改判'}`,
                  onClick: () => openTransferModal(r),
                })),
            }}
          >
            <Button type="link" size="small" icon={<SwapOutlined />}>流转</Button>
          </Dropdown>
        </Space>
      ),
    },
  ]);

  const summary = useMemo(() => {
    const all = [
      ...exceptionRecords.pending_material,
      ...exceptionRecords.manual_overruled,
      ...exceptionRecords.handled,
    ];
    return {
      total: all.length,
      pending: exceptionRecords.pending_material.length,
      overruled: exceptionRecords.manual_overruled.length,
      handled: exceptionRecords.handled.length,
    };
  }, [exceptionRecords]);

  return (
    <div>
      <Card className="section-card" size="small">
        <Space size={40}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 4 }}>异常队列总计</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{summary.total}</div>
          </div>
          <Progress
            type="dashboard"
            percent={summary.total > 0 ? Math.round(summary.handled / summary.total * 100) : 0}
            size={90}
            strokeColor="#52c41a"
            format={(p) => <span style={{ fontSize: 18 }}>{p}%</span>}
          />
          <Space direction="vertical" size={6}>
            <Space>
              <Tag color="warning">待补材料 {summary.pending}</Tag>
              <Tag color="purple">人工改判 {summary.overruled}</Tag>
              <Tag color="success">已处理 {summary.handled}</Tag>
            </Space>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              💡 所有队列数据与看板、明细表共用同一数据源，点击"对照详情"可核对模型输出 + 处理记录
            </div>
          </Space>
        </Space>
      </Card>

      <Card
        className="section-card"
        size="small"
        bodyStyle={{ padding: '8px 0 0 0' }}
        title={
          <Space>
            <span style={{ fontSize: 13 }}>异常队列（三分法）</span>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: 'normal' }}>
              供排班同事查看，已分清处理状态，每条均保留对证记录
            </span>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          tabBarStyle={{ paddingLeft: 16, paddingRight: 16 }}
          items={EXCEPTION_TABS.map(tabCfg => {
            const key = tabCfg.key as ExceptionStatus;
            const list = exceptionRecords[key];
            return {
              key,
              label: tabCfg.label(list.length),
              children: (
                <div style={{ padding: '8px 16px 16px' }}>
                  <div style={{
                    background: key === 'pending_material' ? '#fffbe6' :
                                key === 'manual_overruled' ? '#f9f0ff' : '#f6ffed',
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 12,
                    color: key === 'pending_material' ? '#ad6800' :
                           key === 'manual_overruled' ? '#531dab' : '#389e0d',
                  }}>
                    {tabCfg.desc}
                  </div>
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={list}
                    columns={buildColumns(key) as any}
                    scroll={{ x: 1200 }}
                    locale={{ emptyText: `该分类下暂无记录` }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (t) => `共 ${t} 条`,
                    }}
                  />
                </div>
              ),
            };
          })}
        />
      </Card>

      <Modal
        title={currentRecord ? `异常队列流转 - ${currentRecord.id}` : ''}
        open={transferModalOpen}
        onCancel={() => { setTransferModalOpen(false); setCurrentRecord(null); }}
        onOk={doTransfer}
        okText="确认流转"
        cancelText="取消"
        destroyOnClose
      >
        {currentRecord && (
          <div style={{ marginBottom: 16, fontSize: 12, color: 'rgba(0,0,0,0.65)', padding: 10, background: '#fafafa', borderRadius: 4 }}>
            <div><b>{currentRecord.productName}</b> · {currentRecord.category} · {currentRecord.brand}</div>
            <div style={{ marginTop: 4 }}>当前状态：
              <Tag color={STATUS_MAP[currentRecord.overallStatus].color} style={{ marginLeft: 4 }}>
                {STATUS_MAP[currentRecord.overallStatus].label} {currentRecord.overallScore}
              </Tag>
            </div>
          </div>
        )}
        <Form form={transferForm} layout="vertical">
          <Form.Item
            label="流转到"
            name="targetStatus"
            rules={[{ required: true, message: '请选择目标分类' }]}
          >
            <Select options={EXCEPTION_TABS.map(t => ({
              label: t.key === 'handled' ? '✅ 已处理' : t.key === 'pending_material' ? '⚠️ 待补材料' : '👁 人工改判',
              value: t.key,
            }))} />
          </Form.Item>
          <Form.Item label="备注（说明流转原因）" name="note">
            <AntInput.TextArea rows={3} placeholder="如：材料已补齐、人工复核确认类目无误、商家已修正图片等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExceptionQueue;
