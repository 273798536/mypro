import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, User, Clock, GitCompare } from 'lucide-react';
import { useState } from 'react';
import { useSandboxStore } from '@/store/useSandboxStore';
import { SandboxBreadcrumb } from '@/components/Breadcrumb';
import PageHeader from '@/components/PageHeader';
import DiffViewer from '@/components/DiffViewer';
import ScreenshotCompare from '@/components/ScreenshotCompare';
import { formatDateTime } from '@/utils/helpers';

type Tab = 'fields' | 'screenshots';

export default function SandboxCompare() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('fields');
  const sandbox = useSandboxStore((s) => s.getSandbox(id || ''));
  const getHistoryRecord = useSandboxStore((s) => s.getHistoryRecord);
  const history = useSandboxStore((s) => s.getSandboxHistory(id || ''));

  const leftId = searchParams.get('left') || '';
  const rightId = searchParams.get('right') || '';

  const left = leftId ? getHistoryRecord(leftId) : undefined;
  const right = rightId ? getHistoryRecord(rightId) : undefined;

  if (!sandbox) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <SandboxBreadcrumb extra={[{ label: '历史' }, { label: '版本对比' }]} />
        <div className="card p-16 text-center">沙盘不存在</div>
      </div>
    );
  }

  if (!left || !right) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <SandboxBreadcrumb extra={[{ label: '历史' }, { label: '版本对比' }]} />
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3 opacity-40">⚖️</div>
          <div className="text-space-200 font-medium mb-2">未指定对比版本</div>
          <Link to={`/sandbox/${id}/history`} className="text-gold-400 hover:text-gold-300 text-sm">
            前往历史记录选择两个版本进行对比
          </Link>
        </div>
      </div>
    );
  }

  const [older, newer] = left.version <= right.version ? [left, right] : [right, left];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <SandboxBreadcrumb extra={[{ label: '历史', to: `/sandbox/${id}/history` }, { label: '版本对比' }]} />

      <PageHeader
        title="版本对比"
        description={`${sandbox.name} · v${older.version} 与 v${newer.version} 的差异`}
        actions={
          <Link to={`/sandbox/${id}/history`} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回历史
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 border-rose-500/30 bg-rose-950/10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span className="font-mono font-bold text-lg text-rose-300">v{older.version}</span>
            <span className="text-xs text-rose-400/80 bg-rose-900/40 px-2 py-0.5 rounded">旧版本</span>
          </div>
          <div className="text-sm text-space-100 mb-2">{older.changeReason}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-space-400">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{older.modifiedBy}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(older.createdAt)}</span>
          </div>
        </div>

        <div className="card p-4 border-emerald-500/30 bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold text-lg text-emerald-300">v{newer.version}</span>
            <span className="text-xs text-emerald-400/80 bg-emerald-900/40 px-2 py-0.5 rounded">新版本</span>
            {newer.id === history[history.length - 1]?.id && (
              <span className="text-xs text-gold-400/80 bg-gold-900/30 px-2 py-0.5 rounded">当前</span>
            )}
          </div>
          <div className="text-sm text-space-100 mb-2">{newer.changeReason}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-space-400">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{newer.modifiedBy}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(newer.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-5 bg-space-800/60 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('fields')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            tab === 'fields' ? 'bg-gold-500 text-space-900' : 'text-space-300 hover:text-gold-300'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          字段差异
        </button>
        <button
          onClick={() => setTab('screenshots')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            tab === 'screenshots' ? 'bg-gold-500 text-space-900' : 'text-space-300 hover:text-gold-300'
          }`}
        >
          截图并排对比
        </button>
      </div>

      <div className="pb-10">
        {tab === 'fields' ? (
          <DiffViewer oldData={older.data} newData={newer.data} />
        ) : (
          <ScreenshotCompare oldScreenshots={older.data.screenshots} newScreenshots={newer.data.screenshots} />
        )}
      </div>
    </div>
  );
}
