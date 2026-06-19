import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, GitCompare, Clock, Download, Eye } from 'lucide-react';
import { useSnapshotStore } from '@/stores/snapshotStore';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import { formatDateTime } from '@/utils/format';

export default function SnapshotsPage() {
  const navigate = useNavigate();
  const { allSnapshots, fetchAll, compareResult, compareSnapshots } = useSnapshotStore();
  const [selected1, setSelected1] = useState<string>('');
  const [selected2, setSelected2] = useState<string>('');
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCompare = () => {
    if (selected1 && selected2 && selected1 !== selected2) {
      compareSnapshots(selected1, selected2);
      setShowCompare(true);
    }
  };

  const groupedByTable = allSnapshots.reduce((acc, snap) => {
    if (!acc[snap.tableName]) {
      acc[snap.tableName] = [];
    }
    acc[snap.tableName].push(snap);
    return acc;
  }, {} as Record<string, typeof allSnapshots>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Table className="text-indigo-400" size={24} />
            表结构快照
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            日常整理表结构快照，出问题时可快速回看
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<GitCompare size={16} />} onClick={() => setShowCompare(!showCompare)}>
            {showCompare ? '关闭对比' : '版本对比'}
          </Button>
        </div>
      </div>

      {showCompare && (
        <Card title="版本对比" subtitle="选择两个快照版本进行对比">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">版本 1</label>
              <select
                value={selected1}
                onChange={(e) => setSelected1(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择快照</option>
                {allSnapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.tableName} - {s.version}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">版本 2</label>
              <select
                value={selected2}
                onChange={(e) => setSelected2(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">请选择快照</option>
                {allSnapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.tableName} - {s.version}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={handleCompare} disabled={!selected1 || !selected2 || selected1 === selected2}>
            开始对比
          </Button>

          {compareResult && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">版本 1</div>
                  <div className="text-sm font-medium text-slate-200">
                    {compareResult.snapshot1.tableName} - {compareResult.snapshot1.version}
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">版本 2</div>
                  <div className="text-sm font-medium text-slate-200">
                    {compareResult.snapshot2.tableName} - {compareResult.snapshot2.version}
                  </div>
                </div>
              </div>

              {compareResult.addedColumns.length > 0 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="text-sm font-medium text-emerald-400 mb-2">
                    新增字段 ({compareResult.addedColumns.length})
                  </div>
                  <div className="space-y-1">
                    {compareResult.addedColumns.map((col) => (
                      <div key={col.name} className="text-xs text-slate-300 font-mono flex items-center gap-2">
                        <span className="text-emerald-400">+</span>
                        <span>{col.name}</span>
                        <span className="text-slate-500">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {compareResult.removedColumns.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="text-sm font-medium text-red-400 mb-2">
                    删除字段 ({compareResult.removedColumns.length})
                  </div>
                  <div className="space-y-1">
                    {compareResult.removedColumns.map((col) => (
                      <div key={col.name} className="text-xs text-slate-400 font-mono flex items-center gap-2 line-through">
                        <span className="text-red-400">−</span>
                        <span>{col.name}</span>
                        <span className="text-slate-600">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {compareResult.modifiedColumns.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="text-sm font-medium text-amber-400 mb-2">
                    修改字段 ({compareResult.modifiedColumns.length})
                  </div>
                  <div className="space-y-2">
                    {compareResult.modifiedColumns.map((col) => (
                      <div key={col.name} className="text-xs">
                        <span className="text-slate-200 font-mono">{col.name}</span>
                        <div className="text-slate-500 mt-1 pl-4">
                          {col.changes.map((change, i) => (
                            <div key={i}>{change}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {compareResult.addedIndexes.length > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-sm font-medium text-blue-400 mb-2">
                    新增索引 ({compareResult.addedIndexes.length})
                  </div>
                </div>
              )}

              {compareResult.removedColumns.length === 0 &&
               compareResult.addedColumns.length === 0 &&
               compareResult.modifiedColumns.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-sm">
                  两个版本结构完全一致
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(groupedByTable).length === 0 ? (
          <div className="col-span-full">
            <Card>
              <div className="text-center py-8 text-slate-500">
                <Table size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无表结构快照</p>
              </div>
            </Card>
          </div>
        ) : (
          Object.entries(groupedByTable).map(([tableName, snaps]) => (
            <Card
              key={tableName}
              title={tableName}
              subtitle={`${snaps.length} 个版本`}
              action={
                <span className="text-xs text-slate-500 font-mono">
                  {snaps[0].schema.columns.length} 字段
                </span>
              }
            >
              <div className="space-y-2">
                {snaps.slice(0, 3).map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-slate-500" />
                      <span className="text-sm font-medium text-slate-200">{snap.version}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => snap.gapId && navigate(`/gaps/${snap.gapId}`)}
                        className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                        title="查看关联缺口"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
                        title="下载 DDL"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
                最新版本：{formatDateTime(snaps[0].createdAt)}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
