import React from 'react';
import dayjs from 'dayjs';
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Space,
  Input,
  DatePicker,
  Badge,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowUp,
  Activity,
  Search,
  Eye,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  formatDateTime,
  getConclusionColor,
  getConclusionText,
  getStatusColor,
  getStatusText,
} from '../utils';
import type { CheckResult, TabKey } from '../types';

const { RangePicker } = DatePicker;

const CheckPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    checkResults,
    activeTab,
    searchKeyword,
    dateRange,
    setActiveTab,
    setSearchKeyword,
    setDateRange,
    getFilteredCheckResults,
    getLoadRecordById,
  } = useAppStore();

  const filteredResults = getFilteredCheckResults();

  const stats = {
    total: checkResults.length,
    danger: checkResults.filter((r) => r.conclusion === 'danger').length,
    warning: checkResults.filter((r) => r.conclusion === 'warning').length,
    normal: checkResults.filter((r) => r.conclusion === 'normal').length,
    overload: checkResults.filter((r) => !r.overloadCheck.passed).length,
    pressure: checkResults.filter((r) => !r.pressureCheck.passed).length,
    height: checkResults.filter((r) => !r.heightCheck.passed).length,
    inconsistent: checkResults.filter((r) => !r.conclusionConsistent).length,
  };

  const columns = [
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      key: 'recordNo',
      width: 160,
      render: (text: string, record: CheckResult) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{text}</span>
          {!record.conclusionConsistent && (
            <Tooltip title="载重记录与油压数据结论不一致，已补充检修备注">
              <Badge
                status="warning"
                color="#FF7D00"
                text={<span className="text-xs text-orange-600">口径不一致</span>}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '设备名称',
      key: 'deviceName',
      width: 140,
      render: (_: any, record: CheckResult) => {
        const loadRecord = getLoadRecordById(record.loadRecordId);
        return loadRecord?.deviceName || '-';
      },
    },
    {
      title: '校核时间',
      dataIndex: 'checkTime',
      key: 'checkTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '超载检测',
      dataIndex: 'overloadCheck',
      key: 'overloadCheck',
      width: 130,
      render: (check: CheckResult['overloadCheck']) => (
        <div className="flex items-center gap-1.5">
          {check.passed ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : (
            <XCircle size={16} className="text-red-500" />
          )}
          <span className={check.passed ? 'text-gray-600' : 'text-red-600 font-medium'}>
            {check.value}/{check.threshold}kg
          </span>
        </div>
      ),
    },
    {
      title: '油压检测',
      dataIndex: 'pressureCheck',
      key: 'pressureCheck',
      width: 140,
      render: (check: CheckResult['pressureCheck']) => (
        <div className="flex items-center gap-1.5">
          {check.passed ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : (
            <XCircle size={16} className="text-red-500" />
          )}
          <span className={check.passed ? 'text-gray-600' : 'text-red-600 font-medium'}>
            {check.value}MPa
          </span>
        </div>
      ),
    },
    {
      title: '高度检测',
      dataIndex: 'heightCheck',
      key: 'heightCheck',
      width: 130,
      render: (check: CheckResult['heightCheck']) => (
        <div className="flex items-center gap-1.5">
          {check.passed ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : (
            <XCircle size={16} className="text-red-500" />
          )}
          <span className={check.passed ? 'text-gray-600' : 'text-red-600 font-medium'}>
            {check.value}/{check.threshold}m
          </span>
        </div>
      ),
    },
    {
      title: '结论',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 90,
      render: (conclusion: CheckResult['conclusion']) => (
        <Tag
          color={getConclusionColor(conclusion)}
          className="font-medium px-3"
        >
          {getConclusionText(conclusion)}
        </Tag>
      ),
    },
    {
      title: '台账版本',
      dataIndex: 'ledgerVersion',
      key: 'ledgerVersion',
      width: 100,
      render: (text: string) => (
        <Tag color="blue" className="font-mono">
          {text}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: CheckResult['status']) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: CheckResult) => (
        <Button
          type="link"
          size="small"
          icon={<Eye size={14} />}
          onClick={() => navigate(`/detail/${record.id}`)}
        >
          明细
        </Button>
      ),
    },
  ];

  const tabItems: { key: TabKey; label: React.ReactNode; count: number }[] = [
    { key: 'all', label: '全部记录', count: checkResults.length },
    { key: 'overload', label: '超载记录', count: stats.overload },
    { key: 'pressure', label: '油压异常', count: stats.pressure },
    { key: 'height', label: '高度越界', count: stats.height },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">安全校核</h2>
          <p className="text-sm text-gray-500">
            日常安全校核处理，核对超载记录、油压波动、高度越界
          </p>
        </div>
        <Space>
          <Button icon={<RefreshCw size={14} />}>刷新</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">危险</p>
                <p className="text-3xl font-bold text-red-500">{stats.danger}</p>
              </div>
              <AlertTriangle size={32} className="text-red-400" />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">预警</p>
                <p className="text-3xl font-bold text-orange-500">{stats.warning}</p>
              </div>
              <AlertCircle size={32} className="text-orange-400" />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">正常</p>
                <p className="text-3xl font-bold text-green-500">{stats.normal}</p>
              </div>
              <CheckCircle size={32} className="text-green-400" />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">口径不一致</p>
                <p className="text-3xl font-bold text-purple-500">
                  {stats.inconsistent}
                </p>
              </div>
              <Activity size={32} className="text-purple-400" />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp size={16} className="text-red-500" />
              <span className="text-sm font-medium text-gray-700">超载记录</span>
              <Tag color="red" className="ml-auto">
                {stats.overload}
              </Tag>
            </div>
            <p className="text-xs text-gray-500">
              载重超过额定载荷阈值的记录
            </p>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-red-500" />
              <span className="text-sm font-medium text-gray-700">油压异常</span>
              <Tag color="red" className="ml-auto">
                {stats.pressure}
              </Tag>
            </div>
            <p className="text-xs text-gray-500">
              油压超限、尖峰、波动异常的记录
            </p>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-orange-500" />
              <span className="text-sm font-medium text-gray-700">高度越界</span>
              <Tag color="orange" className="ml-auto">
                {stats.height}
              </Tag>
            </div>
            <p className="text-xs text-gray-500">
              作业高度超过最大允许高度的记录
            </p>
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            size="large"
            className="mb-0"
            items={tabItems.map((item) => ({
              key: item.key,
              label: (
                <span className="flex items-center gap-2">
                  {item.label}
                  <Tag color="blue">{item.count}</Tag>
                </span>
              ),
            }))}
          />

          <Space className="flex-shrink-0">
            <Input
              placeholder="搜索记录编号、设备名称"
              prefix={<Search size={16} className="text-gray-400" />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{ width: 240 }}
              allowClear
            />
            <RangePicker
              value={
                dateRange
                  ? [
                      dayjs(dateRange[0]),
                      dayjs(dateRange[1]),
                    ]
                  : null
              }
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([
                    dates[0].format('YYYY-MM-DD'),
                    dates[1].format('YYYY-MM-DD'),
                  ]);
                } else {
                  setDateRange(null);
                }
              }}
            />
            <Button icon={<Filter size={14} />}>筛选</Button>
          </Space>
        </div>

        {activeTab === 'all' && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-0.5">校核说明</p>
                <p>
                  系统自动根据设备台账版本进行校核。当载重记录与油压序列结论不一致时，请在详情页补充检修备注作为证据。所有操作都会保留完整证据链，确保日常处理与事后复盘口径一致。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overload' && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-700">
                <p className="font-medium mb-0.5">超载记录核对</p>
                <p>
                  请逐条核对超载记录，确认是否属实。注意：人工核超载记录时容易凭印象判断，请务必对照油压序列数据进行交叉验证。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pressure' && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Activity size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-700">
                <p className="font-medium mb-0.5">油压波动分析</p>
                <p>
                  系统自动检测压力尖峰、骤降、异常波动、超限四类异常。点击明细查看油压曲线图，异常区间已用红色/橙色背景高亮标注。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'height' && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <ArrowUp size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-700">
                <p className="font-medium mb-0.5">高度越界检测</p>
                <p>
                  高度越界记录与台账版本绑定，新版本不会覆盖旧版本的越界记录。请仔细核对越界时的台账版本，避免因版本更新导致历史数据口径混乱。
                </p>
              </div>
            </div>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={filteredResults}
          rowKey="id"
          size="small"
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10 }}
          rowClassName={(record) => {
            if (record.conclusion === 'danger') return 'bg-red-50/30';
            if (record.conclusion === 'warning') return 'bg-orange-50/30';
            return '';
          }}
        />
      </Card>
    </div>
  );
};

export default CheckPage;
