import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  FilePlus2,
  SkipForward,
  AlertTriangle,
  FilePlus,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useBatchStore } from '@/store/useBatchStore';
import { useRecordStore } from '@/store/useRecordStore';
import PageContainer from '@/components/layout/PageContainer';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { ProcessHistory } from '@/types';

const MATH_SYMBOLS = ['∂', '∫', '∑', 'Δ', '∇', 'λ', 'θ', '∞'];

const TREND_DATA = [
  { date: '06-16', count: 3 },
  { date: '06-17', count: 5 },
  { date: '06-18', count: 2 },
  { date: '06-19', count: 7 },
  { date: '06-20', count: 4 },
  { date: '06-21', count: 6 },
  { date: '06-22', count: 8 },
];

function formatTime(timestamp?: string) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function StatCard({
  icon,
  value,
  subtitle,
  subtitleColor,
}: {
  icon: React.ReactNode;
  value: string | number;
  subtitle: string;
  subtitleColor?: string;
}) {
  return (
    <Card className="bg-parchment-50 border-parchment-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-parchment-100 text-ink-600">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-end">
          <span className="font-serif text-3xl font-bold text-ink-700">
            {value}
          </span>
        </div>
        <p
          className={`mt-1 text-right text-xs font-mono ${subtitleColor ?? 'text-charcoal-500'}`}
        >
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  icon,
  title,
  bg,
  border,
  hoverBg,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  bg: string;
  border: string;
  hoverBg: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-3 p-5 rounded-md border transition-all duration-200 hover:-translate-y-0.5 ${bg} ${border} hover:${hoverBg}`}
    >
      {icon}
      <span className="font-serif text-base font-semibold text-ink-700">
        {title}
      </span>
    </button>
  );
}

function TimelineItem({
  history,
  index,
  isLast,
}: {
  history: ProcessHistory;
  index: number;
  isLast: boolean;
}) {
  const symbol = MATH_SYMBOLS[index % MATH_SYMBOLS.length];
  const batch = useBatchStore
    .getState()
    .batches.find((b) => b.id === history.batchId);

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-ink-100 border border-ink-300 text-ink-700 font-serif text-base">
          {symbol}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-parchment-300 my-2" />
        )}
      </div>
      <div className="flex-1 pb-5">
        <p className="text-sm text-ink-700 font-mono">
          {history.details || history.summary || history.action}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs font-mono text-charcoal-500">
          <span>{formatTime(history.timestamp)}</span>
          {batch && (
            <span className="px-2 py-0.5 rounded-sm bg-parchment-100 text-parchment-800">
              {batch.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { batches, processHistories, initMock: initBatchMock } = useBatchStore();
  const { anomalies, initMock: initRecordMock } = useRecordStore();

  useEffect(() => {
    if (batches.length === 0) initBatchMock();
    if (anomalies.length === 0) initRecordMock();
  }, [batches.length, anomalies.length, initBatchMock, initRecordMock]);

  const totalNewRecords = batches.reduce(
    (sum, b) => sum + (b.newRecords ?? 0),
    0
  );
  const totalSkippedRecords = batches.reduce(
    (sum, b) => sum + (b.skippedRecords ?? 0),
    0
  );

  const recentHistories = [...processHistories]
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);

  return (
    <PageContainer
      title="总览看板"
      subtitle="微分方程边界复核 · 实时概览"
      actions={
        <>
          <Link to="/batches/new">
            <Button variant="primary" icon={<FilePlus className="w-4 h-4" />}>
              新建复核批次
            </Button>
          </Link>
          <Link to="/anomalies">
            <Button
              variant="secondary"
              icon={<AlertTriangle className="w-4 h-4" />}
            >
              查看异常
            </Button>
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<FolderKanban className="w-5 h-5" />}
          value={batches.length}
          subtitle="较上月 +2"
        />
        <StatCard
          icon={<FilePlus2 className="w-5 h-5" />}
          value={totalNewRecords}
          subtitle="本周新增"
        />
        <StatCard
          icon={<SkipForward className="w-5 h-5" />}
          value={totalSkippedRecords}
          subtitle="幂等保留"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          value={anomalies.length}
          subtitle="待处理"
          subtitleColor="text-vermilion-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Link to="/batches/new" className="block">
          <QuickActionCard
            icon={<FilePlus className="w-5 h-5 text-ink-600" />}
            title="新建复核批次"
            bg="bg-ink-50"
            border="border-ink-200"
            hoverBg="bg-ink-100"
          />
        </Link>
        <Link to="/anomalies" className="block">
          <QuickActionCard
            icon={<AlertTriangle className="w-5 h-5 text-vermilion-600" />}
            title="查看异常"
            bg="bg-vermilion-50"
            border="border-vermilion-200"
            hoverBg="bg-vermilion-100"
          />
        </Link>
        <QuickActionCard
          icon={<Download className="w-5 h-5 text-parchment-800" />}
          title="导出最新报告"
          bg="bg-parchment-100"
          border="border-parchment-300"
          hoverBg="bg-parchment-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-parchment-200 bg-parchment-100/50">
            <h3 className="text-lg font-semibold text-ink-700 font-serif">
              最近处理记录
            </h3>
          </div>
          <div className="px-6 py-4">
            {recentHistories.length === 0 ? (
              <p className="text-sm text-charcoal-500 font-mono">暂无处理记录</p>
            ) : (
              <div>
                {recentHistories.map((h, i) => (
                  <TimelineItem
                    key={h.id}
                    history={h}
                    index={i}
                    isLast={i === recentHistories.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-parchment-200 bg-parchment-100/50">
            <h3 className="text-lg font-semibold text-ink-700 font-serif">
              近 7 日批次处理趋势
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TREND_DATA}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e7e2d8"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fontFamily: 'monospace', fill: '#6b6558' }}
                    axisLine={{ stroke: '#d4cdbd' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fontFamily: 'monospace', fill: '#6b6558' }}
                    axisLine={{ stroke: '#d4cdbd' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#faf7f0',
                      border: '1px solid #d4cdbd',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#3d3832', fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4a4438"
                    strokeWidth={2.5}
                    dot={{ fill: '#4a4438', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#4a4438' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
