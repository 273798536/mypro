import React, { useMemo } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  Space,
  Table,
  Tag,
  Progress,
  Tooltip,
  App as AntdApp,
  Popover,
  Alert,
  Descriptions,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { RangePicker } from 'antd/es/date-picker';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { AttributeStatus, ExceptionStatus, ProductRecord } from '@/types';

const STATUS_COLOR: Record<AttributeStatus, string> = {
  pass: 'success',
  warning: 'warning',
  fail: 'error',
  pending: 'default',
};
const STATUS_LABEL: Record<AttributeStatus, string> = {
  pass: '通过',
  warning: '预警',
  fail: '异常',
  pending: '待处理',
};

const DetailTable: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();

  const filter = useStore(s => s.filter);
  const setFilter = useStore(s => s.setFilter);
  const resetFilter = useStore(s => s.resetFilter);
  const filteredRecords = useStore(s => s.filteredRecords);
  const allRecords = useStore(s => s.allRecords);
  const updateExceptionStatus = useStore(s => s.updateExceptionStatus);
  const addProcessLog = useStore(s => s.addProcessLog);

  const categories = useMemo(() => Array.from(new Set(allRecords.map(r => r.category))), [allRecords]);
  const brands = useMemo(() => Array.from(new Set(allRecords.map(r => r.brand))), [allRecords]);
  const evaluators = useMemo(() => Array.from(new Set(allRecords.map(r => r.evaluator))), [allRecords]);

  const addToException = (record: ProductRecord, status: ExceptionStatus, note: string) => {
    updateExceptionStatus(record.id, status, note);
    addProcessLog(record.id, {
      operator: '小孟（评测）',
      action: status === 'pending_material' ? 'material_requested' : status === 'manual_overruled' ? 'overruled_pass' : 'manual_pass',
      actionLabel: `加入异常队列: ${status === 'handled' ? '已处理' : status === 'pending_material' ? '待补材料' : '人工改判'}`,
      comment: note,
      fromStatus: record.overallStatus,
      toStatus: record.overallStatus,
    });
    message.success(`已加入异常队列：${record.id}`);
  };

  const exceptionMenu = (record: ProductRecord): MenuProps['items'] => [
    {
      key: 'handled',
      icon: <CheckCircleOutlined />,
      label: '标记为已处理',
      onClick: () => addToException(record, 'handled', '评测后标记已处理'),
    },
    {
      key: 'pending_material',
      icon: <WarningOutlined />,
      label: '待补材料',
      onClick: () => {
        modal.confirm({
          title: '请输入需要补充的材料',
          content: (
            <Input.TextArea
              id="material-note"
              rows={3}
              placeholder="如：缺少品牌授权书、质检报告等"
              defaultValue={record.exceptionNote}
            />
          ),
          onOk: () => {
            const el = document.getElementById('material-note') as HTMLTextAreaElement;
            addToException(record, 'pending_material', el?.value || '待补充材料');
          },
        });
      },
    },
    {
      key: 'manual_overruled',
      icon: <EyeOutlined />,
      label: '人工改判',
      onClick: () => {
        modal.confirm({
          title: '人工改判说明',
          content: (
            <Input.TextArea
              id="override-note"
              rows={3}
              placeholder="说明改判原因，如类目判定有误等"
            />
          ),
          onOk: () => {
            const el = document.getElementById('override-note') as HTMLTextAreaElement;
            addToException(record, 'manual_overruled', el?.value || '人工改判');
          },
        });
      },
    },
  ];

  const modelOutputPopover = (r: ProductRecord) => (
    <div style={{ maxWidth: 480 }}>
      <Descriptions size="small" column={1} bordered style={{ marginBottom: 8 }}>
        <Descriptions.Item label="模型版本">{r.modelOutput.modelVersion}</Descriptions.Item>
        <Descriptions.Item label="推理时间">{r.modelOutput.inferenceTime}</Descriptions.Item>
      </Descriptions>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>各属性阈值对照（含漂移标记）</div>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {r.attributes.map(a => {
          const t = r.modelOutput.thresholdsApplied[a.name];
          const drift = t.driftComparedTo;
          return (
            <div key={a.name} style={{ fontSize: 12, lineHeight: 1.7 }}>
              <Space>
                <span style={{ display: 'inline-block', width: 80 }}>{a.name}</span>
                <Tag color={STATUS_COLOR[a.status as AttributeStatus]} style={{ margin: 0 }}>
                  {a.score}
                </Tag>
                <span style={{ color: 'rgba(0,0,0,0.55)' }}>
                  阈值 通≥{t.pass}/警≥{t.warning}
                </span>
                {drift && <Tag color="magenta" style={{ fontSize: 10 }}>⚠ {drift}</Tag>}
              </Space>
            </div>
          );
        })}
      </Space>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 10, marginBottom: 6 }}>模型原始输出文本</div>
      <div className="model-raw-text">{r.modelOutput.rawText}</div>
    </div>
  );

  const columns = [
    {
      title: '记录ID',
      dataIndex: 'id',
      width: 110,
      fixed: 'left' as const,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate(`/record/${v}`)}>
          {v}
        </span>
      ),
    },
    {
      title: '商品',
      width: 200,
      render: (_: any, r: ProductRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.productName}</div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
            {r.category} · {r.brand} · {r.batchDate}
          </div>
        </div>
      ),
    },
    {
      title: '综合状态',
      dataIndex: 'overallStatus',
      width: 100,
      render: (v: AttributeStatus, r: ProductRecord) => (
        <Space direction="vertical" size={2}>
          <Tag color={STATUS_COLOR[v]} style={{ fontSize: 13, padding: '2px 10px' }}>
            {STATUS_LABEL[v]}
          </Tag>
          {r.finalConclusion.isManualOverride && <Tag color="purple" style={{ fontSize: 10 }}>人工改判</Tag>}
        </Space>
      ),
      filters: [
        { text: '通过', value: 'pass' },
        { text: '预警', value: 'warning' },
        { text: '异常', value: 'fail' },
        { text: '待处理', value: 'pending' },
      ] as any,
      onFilter: (value: any, r: ProductRecord) => r.overallStatus === value,
    },
    {
      title: '综合分',
      dataIndex: 'overallScore',
      width: 130,
      render: (v: number) => (
        <Tooltip title={`加权综合分 = Σ(属性分 × 权重)`}>
          <Progress
            percent={v}
            size="small"
            strokeColor={v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f'}
            format={(p) => <b style={{ color: 'inherit' }}>{p}</b>}
          />
        </Tooltip>
      ),
      sorter: (a: ProductRecord, b: ProductRecord) => a.overallScore - b.overallScore,
    },
    ...[
      { title: '标题规范', attr: '标题规范性', width: 100 },
      { title: '类目准确', attr: '类目准确性', width: 100 },
      { title: '属性完整', attr: '属性完整性', width: 100 },
      { title: '图片合规', attr: '图片合规性', width: 100 },
      { title: '描述真实', attr: '描述真实性', width: 100 },
      { title: '价格合理', attr: '价格合理性', width: 100 },
    ].map(cfg => ({
      title: (
        <Tooltip title={`点击按"${cfg.attr}"维度筛选`}>
          <span
            className="drill-link"
            onClick={() => {
              setFilter({ attributeName: cfg.attr, attributeStatus: undefined });
              message.info(`已按 ${cfg.attr} 维度聚焦`);
            }}
          >
            {cfg.title}
            <FilterOutlined style={{ marginLeft: 4, fontSize: 10 }} />
          </span>
        </Tooltip>
      ),
      width: cfg.width,
      render: (_: any, r: ProductRecord) => {
        const a = r.attributes.find(x => x.name === cfg.attr)!;
        const drift = r.modelOutput.thresholdsApplied[cfg.attr].driftComparedTo;
        return (
          <Tooltip title={`分:${a.score}  阈值 通≥${a.thresholdPass}/警≥${a.thresholdWarning}${drift ? `\n⚠ 阈值漂移:${drift}` : ''}`}>
            <Space size={2}>
              <Tag color={STATUS_COLOR[a.status]} style={{ margin: 0, fontSize: 12, padding: '0 6px' }}>
                {a.score}
              </Tag>
              {drift && <Tag color="magenta" style={{ fontSize: 9, padding: 0, margin: 0 }}>⚠</Tag>}
            </Space>
          </Tooltip>
        );
      },
    })),
    {
      title: '异常队列',
      dataIndex: 'exceptionStatus',
      width: 110,
      render: (v: ExceptionStatus | undefined) => {
        if (!v) return <span style={{ color: 'rgba(0,0,0,0.35)' }}>—</span>;
        const map = {
          handled: { color: 'success', label: '已处理', icon: <CheckCircleOutlined /> },
          pending_material: { color: 'warning', label: '待补材料', icon: <WarningOutlined /> },
          manual_overruled: { color: 'purple', label: '人工改判', icon: <EyeOutlined /> },
        };
        const cfg = map[v];
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
      filters: [
        { text: '已处理', value: 'handled' },
        { text: '待补材料', value: 'pending_material' },
        { text: '人工改判', value: 'manual_overruled' },
      ] as any,
      onFilter: (value: any, r: ProductRecord) => r.exceptionStatus === value,
    },
    {
      title: '模型原始输出',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, r: ProductRecord) => (
        <Popover content={modelOutputPopover(r)} title={`模型输出详情 - ${r.id}`} trigger="click">
          <Button type="link" size="small" icon={<EyeOutlined />}>查看</Button>
        </Popover>
      ),
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, r: ProductRecord) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => navigate(`/record/${r.id}`)}>详情 →</Button>
          <Dropdown menu={{ items: exceptionMenu(r) }}>
            <Button type="link" size="small" icon={<PlusOutlined />}>入异常</Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {filter.attributeName && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            <Space>
              <span>当前聚焦维度：<b>{filter.attributeName}</b>{filter.attributeStatus ? `，状态：<b>${STATUS_LABEL[filter.attributeStatus]}</b>` : ''}</span>
              <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => setFilter({ attributeName: undefined, attributeStatus: undefined })}>
                清除聚焦
              </Button>
              <Button type="link" size="small" icon={<DashboardOutlined />} onClick={() => navigate('/dashboard')}>
                返回看板
              </Button>
            </Space>
          }
        />
      )}

      <Card className="filter-bar section-card" size="small" title={<Space><SearchOutlined />筛选条件（与看板、异常队列共享）</Space>}>
        <Form layout="inline" size="small" style={{ rowGap: 12 }}>
          <Form.Item label="日期">
            <RangePicker
              value={filter.dateRange ? [dayjs(filter.dateRange[0]), dayjs(filter.dateRange[1])] : null}
              onChange={(v) => setFilter({ dateRange: v ? [v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')] : null })}
              allowClear
            />
          </Form.Item>
          <Form.Item label="类目">
            <Select mode="multiple" placeholder="全选" style={{ minWidth: 140 }} value={filter.categories} onChange={(v) => setFilter({ categories: v })} options={categories.map(c => ({ label: c, value: c }))} allowClear maxTagCount={2} />
          </Form.Item>
          <Form.Item label="品牌">
            <Select mode="multiple" placeholder="全选" style={{ minWidth: 140 }} value={filter.brands} onChange={(v) => setFilter({ brands: v })} options={brands.map(b => ({ label: b, value: b }))} allowClear maxTagCount={2} />
          </Form.Item>
          <Form.Item label="状态">
            <Select mode="multiple" placeholder="全选" style={{ minWidth: 160 }} value={filter.statuses} onChange={(v) => setFilter({ statuses: v })} options={[
              { label: '通过', value: 'pass' }, { label: '预警', value: 'warning' }, { label: '异常', value: 'fail' }, { label: '待处理', value: 'pending' },
            ]} allowClear maxTagCount={3} />
          </Form.Item>
          <Form.Item label="评测人">
            <Select mode="multiple" placeholder="全选" style={{ minWidth: 140 }} value={filter.evaluators} onChange={(v) => setFilter({ evaluators: v })} options={evaluators.map(e => ({ label: e, value: e }))} allowClear maxTagCount={2} />
          </Form.Item>
          <Form.Item label="关键词">
            <Input placeholder="商品名/ID/记录ID" style={{ width: 180 }} value={filter.keyword} onChange={(e) => setFilter({ keyword: e.target.value })} allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={resetFilter}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        className="section-card"
        size="small"
        title={
          <Space>
            <span>明细表 · 当前筛选共 <b style={{ color: '#1677ff' }}>{filteredRecords.length}</b> 条</span>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>— 与看板、异常队列同源：filteredRecords</span>
          </Space>
        }
      >
        <Table
          size="small"
          rowKey="id"
          dataSource={filteredRecords}
          columns={columns as any}
          scroll={{ x: 1600 }}
          pagination={{ pageSize: 12, showSizeChanger: true, showQuickJumper: true, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>
    </div>
  );
};

export default DetailTable;
