import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  ArrowRight,
  Plus,
  Minus,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';

interface SchemaDiff {
  name: string;
  type: 'added' | 'removed' | 'modified';
  oldType?: string;
  newType?: string;
}

export default function SchemaComparePage() {
  const navigate = useNavigate();
  const backups = useBackupStore((state) => state.backups);

  const [leftId, setLeftId] = useState(backups[backups.length - 1]?.id || '');
  const [rightId, setRightId] = useState(backups[0]?.id || '');

  const leftBackup = backups.find((b) => b.id === leftId);
  const rightBackup = backups.find((b) => b.id === rightId);

  const diff = useMemo<SchemaDiff[]>(() => {
    if (!leftBackup || !rightBackup) return [];

    const leftFields = new Map(leftBackup.fields.map((f) => [f.name, f]));
    const rightFields = new Map(rightBackup.fields.map((f) => [f.name, f]));

    const diffs: SchemaDiff[] = [];
    const allNames = new Set([...leftFields.keys(), ...rightFields.keys()]);

    for (const name of allNames) {
      const left = leftFields.get(name);
      const right = rightFields.get(name);

      if (!left && right) {
        diffs.push({ name, type: 'added', newType: right.actualType });
      } else if (left && !right) {
        diffs.push({ name, type: 'removed', oldType: left.actualType });
      } else if (left && right && left.actualType !== right.actualType) {
        diffs.push({
          name,
          type: 'modified',
          oldType: left.actualType,
          newType: right.actualType,
        });
      }
    }

    return diffs;
  }, [leftBackup, rightBackup]);

  const addedCount = diff.filter((d) => d.type === 'added').length;
  const removedCount = diff.filter((d) => d.type === 'removed').length;
  const modifiedCount = diff.filter((d) => d.type === 'modified').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white font-mono">Schema 对比</h1>
        <p className="text-navy-300 mt-1 text-sm">月底审计 · 课前检查 · 对比备份间 Schema 差异</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5">
          <p className="text-sm text-navy-300 mb-2">新增字段</p>
          <p className="text-3xl font-bold font-mono text-emerald-400">+{addedCount}</p>
        </div>
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5">
          <p className="text-sm text-navy-300 mb-2">删除字段</p>
          <p className="text-3xl font-bold font-mono text-red-400">-{removedCount}</p>
        </div>
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5">
          <p className="text-sm text-navy-300 mb-2">类型变更</p>
          <p className="text-3xl font-bold font-mono text-amber-400">{modifiedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-4">
          <label className="text-xs text-navy-400 mb-2 block">基准版本（旧）</label>
          <div className="relative">
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full px-4 py-3 bg-navy-900/50 border border-navy-700/50 rounded-lg text-white font-mono text-sm appearance-none cursor-pointer focus:outline-none focus:border-navy-500/50"
            >
              {backups.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.tableName} · {b.schemaVersion} · {new Date(b.backupTime).toLocaleDateString('zh-CN')}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
          </div>
          {leftBackup && (
            <p className="text-xs text-navy-400 mt-2">
              {leftBackup.source} · {leftBackup.recordCount.toLocaleString()} 条记录
            </p>
          )}
        </div>

        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-4">
          <label className="text-xs text-navy-400 mb-2 block">对比版本（新）</label>
          <div className="relative">
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full px-4 py-3 bg-navy-900/50 border border-navy-700/50 rounded-lg text-white font-mono text-sm appearance-none cursor-pointer focus:outline-none focus:border-navy-500/50"
            >
              {backups.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.tableName} · {b.schemaVersion} · {new Date(b.backupTime).toLocaleDateString('zh-CN')}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
          </div>
          {rightBackup && (
            <p className="text-xs text-navy-400 mt-2">
              {rightBackup.source} · {rightBackup.recordCount.toLocaleString()} 条记录
            </p>
          )}
        </div>
      </div>

      {leftBackup && rightBackup && leftBackup.tableName !== rightBackup.tableName && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium">不同表名对比</p>
            <p className="text-amber-200/70 text-xs mt-1">
              两个备份来自不同的表（{leftBackup.tableName} vs {rightBackup.tableName}），对比结果可能不具有参考意义。
            </p>
          </div>
        </div>
      )}

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700/50 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-navy-300" />
            字段差异对比
          </h2>
          <span className="text-xs text-navy-400">
            共 {diff.length} 处差异
          </span>
        </div>

        {diff.length === 0 ? (
          <div className="p-12 text-center">
            <GitCompare className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-white font-medium">Schema 完全一致</p>
            <p className="text-navy-400 text-sm mt-1">两个备份的字段和类型没有差异</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-700/30">
            {diff.map((item, idx) => (
              <div
                key={item.name}
                className="px-5 py-4 hover:bg-navy-700/20 transition-colors"
                style={{ animation: 'fadeInUp 0.4s ease-out forwards', animationDelay: `${idx * 50}ms`, opacity: 0 }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'added'
                        ? 'bg-emerald-500/20'
                        : item.type === 'removed'
                        ? 'bg-red-500/20'
                        : 'bg-amber-500/20'
                    }`}
                  >
                    {item.type === 'added' ? (
                      <Plus className="w-4 h-4 text-emerald-400" />
                    ) : item.type === 'removed' ? (
                      <Minus className="w-4 h-4 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-white font-medium">{item.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.type === 'added'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.type === 'removed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {item.type === 'added' ? '新增' : item.type === 'removed' ? '删除' : '类型变更'}
                      </span>
                    </div>

                    {item.type === 'modified' && (
                      <div className="flex items-center gap-3 mt-2">
                        <code className="px-2 py-1 bg-red-500/10 text-red-400 rounded font-mono text-xs">
                          {item.oldType}
                        </code>
                        <ArrowRight className="w-3 h-3 text-navy-500" />
                        <code className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded font-mono text-xs">
                          {item.newType}
                        </code>
                      </div>
                    )}

                    {item.type === 'added' && (
                      <p className="text-xs text-navy-400 mt-2">
                        新类型: <code className="text-emerald-400 font-mono">{item.newType}</code>
                      </p>
                    )}

                    {item.type === 'removed' && (
                      <p className="text-xs text-navy-400 mt-2">
                        原类型: <code className="text-red-400 font-mono">{item.oldType}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => rightBackup && navigate(`/backups/${rightBackup.id}`)}
          className="px-4 py-2 bg-navy-700/50 hover:bg-navy-600/50 text-white rounded-lg border border-navy-600/50 hover:border-navy-500/50 transition-all text-sm"
        >
          查看新版本详情
        </button>
      </div>
    </div>
  );
}
