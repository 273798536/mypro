import { useState } from 'react';
import {
  GitBranch,
  Search,
  ArrowRight,
  FileText,
  Wallet,
  PieChart,
  Banknote,
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/format';
import { cn } from '../lib/utils';

type TraceMode = 'forward' | 'backward';
type TraceNodeType = 'bill' | 'allocation' | 'ledger' | 'recharge';

interface TraceNode {
  id: string;
  type: TraceNodeType;
  title: string;
  amount: number;
  date: string;
  description?: string;
  children?: TraceNode[];
}

export function Trace() {
  const cloudBills = useStore((state) => state.cloudBills);
  const ledgerEntries = useStore((state) => state.ledgerEntries);
  const [traceMode, setTraceMode] = useState<TraceMode>('forward');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['bill-001']));

  const mockForwardTrace: TraceNode = {
    id: 'bill-001',
    type: 'bill',
    title: '阿里云2024年5月账单',
    amount: 128560.50,
    date: '2024-06-01',
    description: '云账号账单已导入并校验通过',
    children: [
      {
        id: 'alloc-proj-001',
        type: 'allocation',
        title: '电商平台分摊',
        amount: 58670.30,
        date: '2024-06-01',
        description: '标签匹配：项目=电商平台',
        children: [
          {
            id: 'ledger-002',
            type: 'ledger',
            title: '账本扣款',
            amount: -128560.50,
            date: '2024-06-01 10:35:00',
            description: '系统自动扣减预付费账户余额',
            children: [
              {
                id: 'recharge-001',
                type: 'recharge',
                title: '银行转账充值',
                amount: 500000,
                date: '2024-05-01 09:00:00',
                description: 'Q2预算充值，流水号 trans-001',
              },
            ],
          },
        ],
      },
      {
        id: 'alloc-proj-002',
        type: 'allocation',
        title: '数据中台分摊',
        amount: 8960.00,
        date: '2024-06-01',
        description: '标签匹配：项目=数据中台',
      },
      {
        id: 'alloc-proj-003',
        type: 'allocation',
        title: '用户中心分摊',
        amount: 4500.00,
        date: '2024-06-01',
        description: '标签匹配：项目=用户中心',
      },
      {
        id: 'alloc-proj-004',
        type: 'allocation',
        title: '营销活动分摊',
        amount: 12340.30,
        date: '2024-06-01',
        description: '标签匹配：项目=营销活动',
      },
      {
        id: 'alloc-proj-unallocated',
        type: 'allocation',
        title: '待分摊',
        amount: 3240.50,
        date: '2024-06-01',
        description: '标签缺失：缺少项目标签，需人工指定',
      },
    ],
  };

  const mockBackwardTrace: TraceNode = {
    id: 'recharge-001',
    type: 'recharge',
    title: '银行转账充值',
    amount: 500000,
    date: '2024-05-01 09:00:00',
    description: 'Q2预算充值，流水号 trans-001',
    children: [
      {
        id: 'ledger-001',
        type: 'ledger',
        title: '账本入账',
        amount: 500000,
        date: '2024-05-01 09:00:00',
        description: '充值到账，余额更新为 ¥500,000.00',
        children: [
          {
            id: 'bill-001',
            type: 'bill',
            title: '阿里云2024年5月账单',
            amount: -128560.50,
            date: '2024-06-01',
            description: '账单核销扣款',
          },
          {
            id: 'bill-003',
            type: 'bill',
            title: '阿里云2024年4月账单',
            amount: -115230.80,
            date: '2024-05-02',
            description: '账单核销扣款',
          },
        ],
      },
    ],
  };

  const traceData = traceMode === 'forward' ? mockForwardTrace : mockBackwardTrace;

  const getNodeIcon = (type: TraceNodeType) => {
    switch (type) {
      case 'bill':
        return <FileText className="w-5 h-5" />;
      case 'allocation':
        return <PieChart className="w-5 h-5" />;
      case 'ledger':
        return <Wallet className="w-5 h-5" />;
      case 'recharge':
        return <Banknote className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getNodeColor = (type: TraceNodeType) => {
    switch (type) {
      case 'bill':
        return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'allocation':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ledger':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'recharge':
        return 'bg-success-100 text-success-700 border-success-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getNodeLabel = (type: TraceNodeType) => {
    const labels: Record<TraceNodeType, string> = {
      bill: '云账单',
      allocation: '项目分摊',
      ledger: '账本记录',
      recharge: '充值流水',
    };
    return labels[type];
  };

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node: TraceNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-l-4',
            isSelected
              ? 'bg-primary-50 border-primary-600'
              : 'bg-white border-transparent hover:bg-gray-50'
          )}
          style={{ marginLeft: level * 32 }}
          onClick={() => {
            setSelectedNode(node.id);
            if (hasChildren) toggleExpand(node.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0',
              getNodeColor(node.type)
            )}
          >
            {getNodeIcon(node.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {getNodeLabel(node.type)}
              </span>
              <span className="font-medium text-gray-900 truncate">{node.title}</span>
            </div>
            {node.description && (
              <p className="text-sm text-gray-500 mt-1 truncate">{node.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className={cn(
                'font-semibold',
                node.amount > 0 ? 'text-success-600' : 'text-gray-900'
              )}
            >
              {node.amount > 0 ? '+' : ''}
              {formatCurrency(node.amount)}
            </span>
            <p className="text-xs text-gray-500 mt-1">{node.date}</p>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedNodeData = traceMode === 'forward' 
    ? [mockForwardTrace, ...(mockForwardTrace.children || [])]
    : [mockBackwardTrace, ...(mockBackwardTrace.children || [])];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">追溯查询</h1>
          <p className="text-gray-500 mt-1">从云账单到充值流水的双向追溯链路</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">追溯方向:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTraceMode('forward')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  traceMode === 'forward'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <ArrowRight className="w-4 h-4" />
                正向追溯
                <span className="text-xs text-gray-400">(账单→充值)</span>
              </button>
              <button
                onClick={() => setTraceMode('backward')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  traceMode === 'backward'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                反向追溯
                <span className="text-xs text-gray-400">(充值→账单)</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索账单号、流水号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900">追溯链路</h2>
            </div>
          </div>
          <div className="p-4 space-y-1 max-h-[600px] overflow-y-auto">
            {renderTreeNode(traceData)}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">节点详情</h3>
            </div>
            <div className="p-4">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center border',
                        getNodeColor('bill')
                      )}
                    >
                      {getNodeIcon('bill')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">阿里云2024年5月账单</p>
                      <p className="text-sm text-gray-500">{getNodeLabel('bill')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">金额</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(128560.50)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">时间</span>
                      <span className="text-gray-900">2024-06-01</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">状态</span>
                      <span className="px-2 py-0.5 bg-success-100 text-success-700 text-xs rounded-full">
                        已处理
                      </span>
                    </div>
                    <div className="py-2">
                      <span className="text-gray-500 text-sm">描述</span>
                      <p className="text-gray-700 mt-1 text-sm">
                        云账号账单已导入并校验通过，共328条明细记录，已完成项目分摊
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>点击左侧节点查看详情</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">图例说明</h3>
            </div>
            <div className="p-4 space-y-3">
              {(['bill', 'allocation', 'ledger', 'recharge'] as TraceNodeType[]).map((type) => (
                <div key={type} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center border',
                      getNodeColor(type)
                    )}
                  >
                    {getNodeIcon(type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{getNodeLabel(type)}</p>
                    <p className="text-xs text-gray-500">
                      {type === 'bill' && '云服务商原始账单'}
                      {type === 'allocation' && '按项目维度成本分摊'}
                      {type === 'ledger' && '预付费账本流水记录'}
                      {type === 'recharge' && '银行转账充值流水'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <GitBranch className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">追溯说明</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>正向追溯</strong>：从云账号账单出发，追踪到项目分摊、账本扣款、最终到充值流水的完整链路</li>
              <li>• <strong>反向追溯</strong>：从充值流水出发，反查到该笔充值最终用于核销哪些账单</li>
              <li>• 所有数据均保留原始凭证，不做口径偷改，确保审计可追溯</li>
              <li>• 异常节点会在链路中高亮标记，可点击跳转至异常复核处理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
