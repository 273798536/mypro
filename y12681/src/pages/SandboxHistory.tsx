import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useSandboxStore } from '@/store/useSandboxStore';
import { SandboxBreadcrumb } from '@/components/Breadcrumb';
import PageHeader from '@/components/PageHeader';
import VersionTimeline from '@/components/VersionTimeline';
import StatusBadge from '@/components/StatusBadge';

export default function SandboxHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sandbox = useSandboxStore((s) => s.getSandbox(id || ''));
  const history = useSandboxStore((s) => s.getSandboxHistory(id || ''));
  const [selected, setSelected] = useState<string[]>([]);

  if (!sandbox) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <SandboxBreadcrumb extra={[{ label: '历史' }]} />
        <div className="card p-16 text-center">沙盘不存在</div>
      </div>
    );
  }

  const handleSelect = (hid: string) => {
    setSelected((prev) => {
      if (prev.includes(hid)) {
        return prev.filter((x) => x !== hid);
      }
      if (prev.length < 2) {
        return [...prev, hid];
      }
      return [prev[1], hid];
    });
  };

  const canCompare = selected.length === 2;

  const handleCompare = () => {
    if (!canCompare) return;
    navigate(`/sandbox/${id}/compare?left=${selected[0]}&right=${selected[1]}`);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <SandboxBreadcrumb extra={[{ label: '历史记录' }]} />

      <PageHeader
        title="历史记录"
        description={`${sandbox.name} · 共 ${history.length} 个历史版本`}
        actions={
          <>
            <Link to={`/sandbox/${id}`} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              返回详情
            </Link>
            <button
              onClick={handleCompare}
              disabled={!canCompare}
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              对比选中版本 {canCompare ? `(${selected.length}/2)` : selected.length > 0 ? `(${selected.length}/2)` : ''}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-5">
        <div className="col-span-1">
          <div className="card p-4 sticky top-8">
            <div className="text-xs text-space-400 uppercase tracking-wider mb-3">当前状态</div>
            <div className="mb-4">
              <StatusBadge status={sandbox.status} />
            </div>
            <div className="space-y-2 text-sm border-t border-space-700/50 pt-3">
              <div className="flex justify-between">
                <span className="text-space-400">截图数</span>
                <span className="font-mono text-gold-300">{sandbox.screenshots.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-space-400">轨道倾角</span>
                <span className="font-mono text-gold-300">{sandbox.inclination}{sandbox.unit === 'degree' ? '°' : ' rad'}</span>
              </div>
            </div>
            {canCompare && (
              <div className="mt-4 pt-3 border-t border-space-700/50">
                <div className="text-xs text-space-400 mb-2">已选择对比</div>
                <div className="space-y-1.5">
                  {selected.map((hid) => {
                    const rec = history.find((h) => h.id === hid);
                    return (
                      <div key={hid} className="text-xs font-mono text-gold-400 bg-gold-500/10 rounded px-2 py-1">
                        v{rec?.version} · {rec?.modifiedBy}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-3">
          {history.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-4xl mb-3 opacity-40">📜</div>
              <div className="text-space-200 font-medium">暂无历史记录</div>
            </div>
          ) : (
            <VersionTimeline
              history={history}
              sandboxId={sandbox.id}
              selectedVersions={selected as [string, string]}
              onSelectVersion={handleSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
