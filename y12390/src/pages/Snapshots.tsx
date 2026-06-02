import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Filter, Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

type StatusFilter = 'all' | 'normal' | 'anomaly';

export default function Snapshots() {
  const navigate = useNavigate();
  const { snapshots, presets, presetVersions, anomalies, importSnapshot } = useAppStore();
  const [presetFilter, setPresetFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [importing, setImporting] = useState(false);

  const versionOptions = useMemo(() => {
    if (!selectedPresetId) return [];
    return presetVersions[selectedPresetId] || [];
  }, [selectedPresetId, presetVersions]);

  const filteredSnapshots = useMemo(() => {
    return snapshots.filter(snapshot => {
      if (presetFilter !== 'all') {
        const version = Object.values(presetVersions)
          .flat()
          .find(v => v.id === snapshot.presetVersionId);
        if (!version || version.presetId !== presetFilter) return false;
      }

      const hasAnomaly = anomalies.some(a => a.entityId === snapshot.id);
      if (statusFilter === 'normal' && hasAnomaly) return false;
      if (statusFilter === 'anomaly' && !hasAnomaly) return false;

      return true;
    });
  }, [snapshots, presetFilter, statusFilter, presetVersions, anomalies]);

  const getVersionNumber = (presetVersionId: string) => {
    const version = Object.values(presetVersions)
      .flat()
      .find(v => v.id === presetVersionId);
    return version ? `v${version.versionNumber}` : '-';
  };

  const getPresetName = (presetVersionId: string) => {
    const version = Object.values(presetVersions)
      .flat()
      .find(v => v.id === presetVersionId);
    if (!version) return '-';
    const preset = presets.find(p => p.id === version.presetId);
    return preset?.name || '-';
  };

  const handleImport = async () => {
    if (!selectedVersionId) return;
    setImporting(true);
    try {
      const file = new File([], 'snapshot-import.json', { type: 'application/json' });
      await importSnapshot(file, selectedVersionId, 'current-user', '当前用户');
      setImportModalOpen(false);
      setSelectedPresetId('');
      setSelectedVersionId('');
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">参数快照</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看和管理所有参数快照及其对比结果</p>
        </div>
        <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => setImportModalOpen(true)}>
          导入快照
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">筛选：</span>
        </div>
        <select
          value={presetFilter}
          onChange={e => setPresetFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">全部预设</option>
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>{preset.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {([
            { value: 'all', label: '全部' },
            { value: 'normal', label: '正常' },
            { value: 'anomaly', label: '有异常' },
          ] as const).map(option => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === option.value
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredSnapshots.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">关联预设</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">版本</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">创建者</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">参数修改数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">越界数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">创建时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSnapshots.map(snapshot => {
                  const hasAnomaly = anomalies.some(a => a.entityId === snapshot.id);
                  const modifiedCount = snapshot.comparisonResult?.modifiedCount ?? 0;
                  const outOfBoundsCount = snapshot.comparisonResult?.outOfBoundsCount ?? 0;

                  return (
                    <tr
                      key={snapshot.id}
                      className="cursor-pointer transition-colors hover:bg-accent/50"
                      onClick={() => navigate(`/snapshots/${snapshot.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{snapshot.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{getPresetName(snapshot.presetVersionId)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{getVersionNumber(snapshot.presetVersionId)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{snapshot.creatorName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={modifiedCount > 0 ? 'text-warning font-medium' : 'text-muted-foreground'}>
                          {modifiedCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={outOfBoundsCount > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                          {outOfBoundsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {hasAnomaly ? (
                          <Badge variant="danger">有异常</Badge>
                        ) : (
                          <Badge variant="success">正常</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          className="rounded-lg p-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/snapshots/${snapshot.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState title="暂无快照数据" description="导入快照以开始参数对比和异常检测" />
      )}

      <Modal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setSelectedPresetId('');
          setSelectedVersionId('');
        }}
        title="导入快照"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setSelectedPresetId('');
                setSelectedVersionId('');
              }}
            >
              取消
            </Button>
            <Button onClick={handleImport} loading={importing} disabled={!selectedVersionId}>
              导入
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">选择预设</label>
            <select
              value={selectedPresetId}
              onChange={e => {
                setSelectedPresetId(e.target.value);
                setSelectedVersionId('');
              }}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">请选择预设</option>
              {presets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>
          {selectedPresetId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">选择版本</label>
              <select
                value={selectedVersionId}
                onChange={e => setSelectedVersionId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">请选择版本</option>
                {versionOptions.map(version => (
                  <option key={version.id} value={version.id}>
                    v{version.versionNumber} - {version.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
