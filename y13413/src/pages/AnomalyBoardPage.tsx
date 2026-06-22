import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  RefreshCw,
  XCircle,
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useBatchStore } from '@/store/useBatchStore';
import PageContainer from '@/components/layout/PageContainer';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import StatusDot from '@/components/ui/StatusDot';
import type { Anomaly, AnomalyType } from '@/types';

type AnomalyFilter = AnomalyType | 'all';

interface AnomalyCategory {
  key: AnomalyType;
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  iconClass: string;
  textClass: string;
  activeBg: string;
  activeBorder: string;
}

const ANOMALY_CATEGORIES: AnomalyCategory[] = [
  {
    key: 'extrapolation',
    label: '外推越界',
    icon: <TrendingUp className="w-6 h-6" />,
    bgClass: 'bg-vermilion-50',
    borderClass: 'border-vermilion-200',
    iconClass: 'text-vermilion-600',
    textClass: 'text-vermilion-800',
    activeBg: 'bg-vermilion-100',
    activeBorder: 'border-vermilion-400',
  },
  {
    key: 'inconsistency',
    label: '数据不一致',
    icon: <RefreshCw className="w-6 h-6" />,
    bgClass: 'bg-ink-50',
    borderClass: 'border-ink-200',
    iconClass: 'text-ink-600',
    textClass: 'text-ink-800',
    activeBg: 'bg-ink-100',
    activeBorder: 'border-ink-400',
  },
  {
    key: 'rule_conflict',
    label: '规则冲突',
    icon: <XCircle className="w-6 h-6" />,
    bgClass: 'bg-parchment-100',
    borderClass: 'border-parchment-300',
    iconClass: 'text-parchment-800',
    textClass: 'text-parchment-900',
    activeBg: 'bg-parchment-200',
    activeBorder: 'border-parchment-500',
  },
];

const ANOMALY_SUGGESTIONS: Record<AnomalyType, string> = {
  extrapolation:
    '建议使用 clip 截断法而非线性外推，参考第六章第3节边界条件。当边界值超出合理范围时，应优先采用领域内已知的极值约束。',
  inconsistency:
    '请核对数据源的多版本记录，确认主版本以页面展示值为准。建议重新导入原始数据或与数据提供方确认正确取值。',
  rule_conflict:
    '存在多条规则对同一字段产生冲突判定，建议调整规则优先级或合并规则逻辑。查看规则配置页面进行调整。',
  out_of_bounds:
    '数值超出预设阈值范围，请确认是否为异常值或需要调整阈值范围。参考业务规范中定义的合理区间。',
  missing_value:
    '关键字段缺失，请补全数据后重新导入。若该字段允许为空，请在规则配置中调整校验逻辑。',
  format_error:
    '数据格式不符合规范，请检查字段类型和格式要求。参考数据字典中对应字段的格式定义。',
};

function formatTime(timestamp: string) {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getBadgeVariant(type: AnomalyType): 'new' | 'skipped' | 'normal' | 'anomaly' | 'info' {
  switch (type) {
    case 'extrapolation':
    case 'out_of_bounds':
      return 'anomaly';
    case 'inconsistency':
      return 'new';
    case 'rule_conflict':
      return 'skipped';
    default:
      return 'info';
  }
}

function getTypeLabel(type: AnomalyType): string {
  const found = ANOMALY_CATEGORIES.find((c) => c.key === type);
  if (found) return found.label;
  switch (type) {
    case 'out_of_bounds':
      return '越界';
    case 'missing_value':
      return '缺失值';
    case 'format_error':
      return '格式错误';
    default:
      return type;
  }
}

function CategoryCard({
  category,
  count,
  active,
  onClick,
}: {
  category: AnomalyCategory;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-5 rounded-md border transition-all duration-200 hover:-translate-y-0.5 text-left ${active ? `${category.activeBg} ${category.activeBorder}` : `${category.bgClass} ${category.borderClass}`}`}
    >
      <div className="flex items-start justify-between">
        <div className={category.iconClass}>{category.icon}</div>
        <span className={`font-serif text-2xl font-bold ${category.textClass}`}>
          {count}
        </span>
      </div>
      <p className={`mt-3 font-serif text-base font-semibold ${category.textClass}`}>
        {category.label}
      </p>
    </button>
  );
}

function SuggestionPanel({
  type,
  suggestion,
  expanded,
  onToggle,
}: {
  type: AnomalyType;
  suggestion: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="mb-3 last:mb-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          {ANOMALY_CATEGORIES.find((c) => c.key === type)?.icon ?? (
            <AlertTriangle className="w-5 h-5 text-ink-600" />
          )}
          <span className="font-serif text-base font-semibold text-ink-700">
            {getTypeLabel(type)}处理建议
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-charcoal-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-charcoal-500" />
        )}
      </button>
      {expanded && (
        <div className="px-6 pb-4">
          <div className="pt-3 border-t border-parchment-200">
            <p className="text-sm font-mono text-charcoal-700 leading-relaxed">
              {suggestion}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default function AnomalyBoardPage() {
  const { anomalies, initMock: initRecordMock } = useRecordStore();
  const { batches, initMock: initBatchMock } = useBatchStore();
  const [filter, setFilter] = useState<AnomalyFilter>('all');
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<AnomalyType>>(
    new Set(['extrapolation'])
  );

  useEffect(() => {
    if (anomalies.length === 0) initRecordMock();
    if (batches.length === 0) initBatchMock();
  }, [anomalies.length, batches.length, initRecordMock, initBatchMock]);

  const filteredAnomalies = useMemo(() => {
    if (filter === 'all') return anomalies;
    return anomalies.filter((a) => a.type === filter);
  }, [anomalies, filter]);

  const toggleSuggestion = (type: AnomalyType) => {
    setExpandedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const getBatchName = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    return batch?.name ?? batchId;
  };

  const getSeverityStatus = (
    severity: Anomaly['severity']
  ): 'success' | 'warning' | 'error' | 'info' | 'pending' => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'pending';
    }
  };

  const getSeverityLabel = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return severity;
    }
  };

  const suggestionTypes = Array.from(
    new Set(anomalies.map((a) => a.type))
  ) as AnomalyType[];

  const columns = [
    {
      key: 'id',
      header: '异常ID',
      width: '140px',
      render: (row: Anomaly) => (
        <span className="font-mono text-xs text-ink-700">{row.id}</span>
      ),
    },
    {
      key: 'type',
      header: '类型',
      width: '120px',
      render: (row: Anomaly) => (
        <Badge variant={getBadgeVariant(row.type)}>{getTypeLabel(row.type)}</Badge>
      ),
    },
    {
      key: 'severity',
      header: '严重程度',
      width: '100px',
      render: (row: Anomaly) => (
        <StatusDot
          status={getSeverityStatus(row.severity)}
          label={getSeverityLabel(row.severity)}
        />
      ),
    },
    {
      key: 'recordId',
      header: '关联记录',
      width: '140px',
      render: (row: Anomaly) => (
        <span className="font-mono text-xs text-charcoal-700">
          {row.recordId}
        </span>
      ),
    },
    {
      key: 'batchId',
      header: '来源批次',
      width: '160px',
      render: (row: Anomaly) => (
        <span className="text-sm text-charcoal-700">{getBatchName(row.batchId)}</span>
      ),
    },
    {
      key: 'description',
      header: '描述',
      render: (row: Anomaly) => (
        <span
          className="text-sm text-charcoal-700 block max-w-xs truncate"
          title={row.description}
        >
          {row.description}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '创建时间',
      width: '160px',
      render: (row: Anomaly) => (
        <span className="font-mono text-xs text-charcoal-600">
          {formatTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '操作',
      width: '100px',
      align: 'right' as const,
      render: (row: Anomaly) => (
        <Link
          to={`/records/${row.recordId}`}
          className="inline-flex items-center gap-1 text-xs font-mono text-ink-600 hover:text-ink-800"
        >
          查看
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <PageContainer
      title="异常看板"
      subtitle="外推越界 · 数据不一致 · 规则冲突"
      actions={
        <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
          导出异常清单
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <CategoryCard
          category={ANOMALY_CATEGORIES[0]}
          count={anomalies.filter((a) => a.type === 'extrapolation').length}
          active={filter === 'extrapolation'}
          onClick={() =>
            setFilter(filter === 'extrapolation' ? 'all' : 'extrapolation')
          }
        />
        <CategoryCard
          category={ANOMALY_CATEGORIES[1]}
          count={anomalies.filter((a) => a.type === 'inconsistency').length}
          active={filter === 'inconsistency'}
          onClick={() =>
            setFilter(filter === 'inconsistency' ? 'all' : 'inconsistency')
          }
        />
        <CategoryCard
          category={ANOMALY_CATEGORIES[2]}
          count={anomalies.filter((a) => a.type === 'rule_conflict').length}
          active={filter === 'rule_conflict'}
          onClick={() =>
            setFilter(filter === 'rule_conflict' ? 'all' : 'rule_conflict')
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 py-4 border-b border-parchment-200 bg-parchment-100/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-700 font-serif">
                异常列表
                {filter !== 'all' && (
                  <span className="ml-2 text-sm font-normal font-mono text-charcoal-500">
                    (已筛选: {getTypeLabel(filter)})
                  </span>
                )}
              </h3>
              {filter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="text-xs font-mono text-ink-600 hover:text-ink-800 underline"
                >
                  清除筛选
                </button>
              )}
            </div>
            <div className="px-6 py-4">
              <Table
                columns={columns}
                data={filteredAnomalies}
                rowKey="id"
              />
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <div className="px-6 py-4 border-b border-parchment-200 bg-parchment-100/50">
              <h3 className="text-lg font-semibold text-ink-700 font-serif">
                异常处理建议
              </h3>
            </div>
            <CardContent className="p-4">
              {suggestionTypes.length === 0 ? (
                <p className="text-sm text-charcoal-500 font-mono">暂无异常类型</p>
              ) : (
                suggestionTypes.map((type) => (
                  <SuggestionPanel
                    key={type}
                    type={type}
                    suggestion={
                      ANOMALY_SUGGESTIONS[type] ?? '请联系管理员获取处理建议。'
                    }
                    expanded={expandedSuggestions.has(type)}
                    onToggle={() => toggleSuggestion(type)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
