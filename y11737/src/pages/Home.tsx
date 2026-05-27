import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Modal,
  message,
  Checkbox,
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
} from 'antd';
import type { TableProps } from 'antd';
import {
  Search,
  RotateCcw,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useBillStore } from '@/store/billStore';
import { formatCurrency } from '@/services/calculationService';
import { getRiskSummary, hasHighRisk } from '@/services/riskService';
import type { Bill } from '@/types';
import { STATUS_LABELS, RISK_LEVEL_LABELS } from '@/types';

const { RangePicker } = DatePicker;

export default function Home() {
  const navigate = useNavigate();
  const {
    getFilteredBills,
    filters,
    setFilters,
    resetFilters,
    selectedIds,
    setSelectedIds,
    exportBills,
    exportAllBills,
    resetToMockData,
    bills,
  } = useBillStore();
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const filteredBills = getFilteredBills();
  
  const totalStats = {
    total: bills.length,
    pending: bills.filter(b => b.status === 'pending').length,
    highRisk: bills.filter(b => b.risks.some(r => r.level === 'high' && !r.resolved)).length,
    approved: bills.filter(b => b.status === 'approved').length,
  };
  
  const columns: TableProps<Bill>['columns'] = [
    {
      title: '票据号码',
      dataIndex: 'billNumber',
      key: 'billNumber',
      width: 180,
      render: (text: string) => (
        <span className="font-mono text-sm">{text}</span>
      ),
    },
    {
      title: '票面金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (value: number) => (
        <span className="font-mono text-sm">{formatCurrency(value)}</span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      key: 'applicant',
      width: 200,
      ellipsis: true,
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string, record) => {
        const daysUntil = dayjs(date).diff(dayjs(), 'day');
        const isNear = daysUntil <= 7;
        return (
          <Space>
            <span className={isNear ? 'text-orange-600 font-medium' : ''}>{date}</span>
            {isNear && <Tag color="orange">{daysUntil <= 0 ? '已过期' : `${daysUntil}天`}</Tag>}
          </Space>
        );
      },
      sorter: (a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf(),
    },
    {
      title: '贴现率',
      dataIndex: 'discountRate',
      key: 'discountRate',
      width: 100,
      render: (value: number, record) => (
        <Space>
          <span className="font-mono">{value}%</span>
          <span className="text-xs text-gray-500">({record.discountRateVersion})</span>
        </Space>
      ),
    },
    {
      title: '实付金额',
      key: 'actualAmount',
      width: 140,
      render: (_, record) => (
        <span className="font-mono text-sm font-medium">
          {formatCurrency(record.calculation.actualAmount)}
        </span>
      ),
    },
    {
      title: '风险状态',
      key: 'riskStatus',
      width: 150,
      render: (_, record) => {
        const summary = getRiskSummary(record.risks);
        if (summary.total === 0) {
          return <Tag icon={<CheckCircle size={12} />} color="success">无风险</Tag>;
        }
        return (
          <Space size={4}>
            {summary.high > 0 && (
              <Tag icon={<XCircle size={12} />} color="error">高风险 {summary.high}</Tag>
            )}
            {summary.medium > 0 && (
              <Tag icon={<AlertTriangle size={12} />} color="warning">中风险 {summary.medium}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Bill['status']) => {
        const colors: Record<Bill['status'], string> = {
          pending: 'processing',
          approved: 'success',
          rejected: 'error',
          modified: 'warning',
        };
        return <Tag color={colors[status]}>{STATUS_LABELS[status]}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<Eye size={14} />}
          onClick={() => navigate(`/bill/${record.id}`)}
        >
          详情
        </Button>
      ),
    },
  ];
  
  const rowSelection = {
    selectedRowKeys: selectedIds,
    onChange: (newSelectedIds: React.Key[]) => {
      setSelectedIds(newSelectedIds as string[]);
    },
    getCheckboxProps: (record: Bill) => ({
      disabled: hasHighRisk(record.risks),
    }),
  };
  
  const handleExportSelected = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要导出的票据');
      return;
    }
    const hasHighRiskBills = filteredBills
      .filter(b => selectedIds.includes(b.id))
      .some(b => hasHighRisk(b.risks));
    
    if (hasHighRiskBills) {
      Modal.confirm({
        title: '存在高风险票据',
        content: '选中的票据中包含高风险项，是否继续导出？导出的清单中将标注风险信息。',
        okText: '继续导出',
        cancelText: '取消',
        onOk: () => {
          exportBills(selectedIds);
          message.success(`已导出 ${selectedIds.length} 条票据`);
        },
      });
    } else {
      exportBills(selectedIds);
      message.success(`已导出 ${selectedIds.length} 条票据`);
    }
  };
  
  const handleResetData = () => {
    resetToMockData();
    message.success('已重置为示例数据');
    setShowResetConfirm(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-900 text-white px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">供应链票据贴现管理系统</h1>
            <p className="text-primary-100 text-sm mt-1">票据验真 · 背书追踪 · 利息计算 · 风险提示</p>
          </div>
          <Space>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={() => setShowResetConfirm(true)}
            >
              重置示例数据
            </Button>
          </Space>
        </div>
      </div>
      
      <div className="max-w-[1600px] mx-auto p-6">
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="票据总数"
                value={totalStats.total}
                prefix={<FileSpreadsheet size={18} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待审核"
                value={totalStats.pending}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="高风险票据"
                value={totalStats.highRisk}
                valueStyle={{ color: '#f5222d' }}
                prefix={<AlertTriangle size={18} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已通过"
                value={totalStats.approved}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
        
        <Card className="mb-6">
          <Space wrap className="w-full" size={16}>
            <Input
              placeholder="搜索票据号码"
              prefix={<Search size={14} />}
              style={{ width: 200 }}
              value={filters.billNumber}
              onChange={(e) => setFilters({ billNumber: e.target.value })}
              allowClear
            />
            <Input
              placeholder="搜索申请人"
              style={{ width: 200 }}
              value={filters.applicant}
              onChange={(e) => setFilters({ applicant: e.target.value })}
              allowClear
            />
            <Select
              placeholder="风险等级"
              style={{ width: 140 }}
              value={filters.riskLevel}
              onChange={(value) => setFilters({ riskLevel: value })}
              allowClear
            >
              <Select.Option value="high">高风险</Select.Option>
              <Select.Option value="medium">中风险</Select.Option>
              <Select.Option value="low">低风险</Select.Option>
            </Select>
            <Select
              placeholder="审核状态"
              style={{ width: 140 }}
              value={filters.status}
              onChange={(value) => setFilters({ status: value })}
              allowClear
            >
              <Select.Option value="pending">待审核</Select.Option>
              <Select.Option value="approved">已通过</Select.Option>
              <Select.Option value="rejected">已驳回</Select.Option>
              <Select.Option value="modified">已修正</Select.Option>
            </Select>
            <RangePicker
              placeholder={['到期日起', '到期日止']}
              value={filters.dueDateStart ? [dayjs(filters.dueDateStart), dayjs(filters.dueDateEnd)] : undefined}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setFilters({
                    dueDateStart: dates[0].format('YYYY-MM-DD'),
                    dueDateEnd: dates[1].format('YYYY-MM-DD'),
                  });
                } else {
                  setFilters({ dueDateStart: undefined, dueDateEnd: undefined });
                }
              }}
            />
            <Button icon={<RotateCcw size={14} />} onClick={resetFilters}>
              重置
            </Button>
          </Space>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Space>
              <span className="text-gray-600">共 {filteredBills.length} 条记录</span>
              {selectedIds.length > 0 && (
                <span className="text-primary-600">已选择 {selectedIds.length} 条</span>
              )}
            </Space>
            <Space>
              <Button
                type="primary"
                icon={<Download size={14} />}
                onClick={handleExportSelected}
                disabled={selectedIds.length === 0}
              >
                导出选中
              </Button>
              <Button
                icon={<Download size={14} />}
                onClick={() => {
                  exportAllBills();
                  message.success(`已导出 ${filteredBills.length} 条票据`);
                }}
              >
                导出全部
              </Button>
            </Space>
          </div>
          
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <Checkbox
              checked={selectedIds.length > 0}
              onChange={(e) => {
                const exportableIds = filteredBills
                  .filter(b => !hasHighRisk(b.risks))
                  .map(b => b.id);
                setSelectedIds(e.target.checked ? exportableIds : []);
              }}
            >
              全选（自动排除高风险票据）
            </Checkbox>
          </div>
          
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredBills}
            rowSelection={rowSelection}
            scroll={{ x: 1300 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            onRow={(record) => ({
              style: hasHighRisk(record.risks)
                ? { backgroundColor: '#fff1f0' }
                : record.risks.some(r => r.level === 'medium' && !r.resolved)
                ? { backgroundColor: '#fffbe6' }
                : {},
            })}
          />
        </Card>
      </div>
      
      <Modal
        open={showResetConfirm}
        title="确认重置"
        onCancel={() => setShowResetConfirm(false)}
        onOk={handleResetData}
        okText="确认重置"
        cancelText="取消"
      >
        <p>确定要重置为示例数据吗？当前的所有修改将会丢失。</p>
      </Modal>
    </div>
  );
}
