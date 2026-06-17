import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MergeCandidateCard } from '@/components/point/MergeCandidateCard';
import type { MergeCandidate, GisPoint } from '@/types';
import { nameSimilarity } from '@/utils/similarity';
import { haversineDistance, formatDistance } from '@/utils/geo';
import { RefreshCw, CheckCircle2, GitMerge, AlertCircle } from 'lucide-react';

const NAME_THRESHOLD = 0.7;
const DISTANCE_THRESHOLD = 50;

export default function MergePage() {
  const { points, mergeRelations } = useAppStore();
  const { mergePoints } = useAppStore((s) => s.actions);
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const alreadyMergedIds = useMemo(() => {
    return new Set(mergeRelations.map((r) => r.source_point_id));
  }, [mergeRelations]);

  const activePoints = useMemo(
    () => points.filter((p) => p.status !== 'merged' && !alreadyMergedIds.has(p.id) && p.lng && p.lat),
    [points, alreadyMergedIds],
  );

  const doScan = () => {
    setScanning(true);
    setTimeout(() => {
      const found: MergeCandidate[] = [];
      const processed = new Set<string>();
      for (let i = 0; i < activePoints.length; i++) {
        for (let j = i + 1; j < activePoints.length; j++) {
          const a = activePoints[i];
          const b = activePoints[j];
          const pairKey = [a.id, b.id].sort().join('-');
          if (processed.has(pairKey)) continue;
          processed.add(pairKey);
          const sim = nameSimilarity(a.name, b.name);
          const dist = haversineDistance(a.lat, a.lng, b.lat, b.lng);
          if (sim >= NAME_THRESHOLD && dist <= DISTANCE_THRESHOLD) {
            found.push({
              point_a: a,
              point_b: b,
              name_similarity: sim,
              distance_meters: dist,
            });
          }
        }
      }
      setCandidates(found);
      setHasScanned(true);
      setScanning(false);
    }, 600);
  };

  const handleMerge = (sourceId: string, targetId: string) => {
    const candidate = candidates.find(
      (c) =>
        (c.point_a.id === sourceId && c.point_b.id === targetId) ||
        (c.point_a.id === targetId && c.point_b.id === sourceId),
    );
    if (candidate) {
      mergePoints(sourceId, targetId, {
        name_similarity: candidate.name_similarity,
        distance_meters: candidate.distance_meters,
      });
      setCandidates((prev) =>
        prev.filter(
          (c) =>
            c.point_a.id !== sourceId &&
            c.point_b.id !== sourceId &&
            c.point_a.id !== targetId &&
            c.point_b.id !== targetId,
        ),
      );
    }
  };

  const completedMerges = useMemo(
    () =>
      mergeRelations.map((r) => ({
        source: points.find((p) => p.id === r.source_point_id),
        target: points.find((p) => p.id === r.target_point_id),
        relation: r,
      })),
    [mergeRelations, points],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">点位归并</h2>
          <p className="text-sm text-slate-500 mt-1">
            基于名称相似度（≥ {Math.round(NAME_THRESHOLD * 100)}%）+ 地理距离（≤ {DISTANCE_THRESHOLD} 米）自动检测疑似重复点位
          </p>
        </div>
        <Button onClick={doScan} disabled={scanning} className="gap-2">
          <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
          {hasScanned ? '重新检测' : '开始检测'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center">
              <GitMerge size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">已完成归并</p>
              <p className="text-2xl font-serif font-bold text-slate-800">{completedMerges.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-amber-50 flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">待确认疑似重复</p>
              <p className="text-2xl font-serif font-bold text-slate-800">{candidates.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-blue-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">检测范围点位</p>
              <p className="text-2xl font-serif font-bold text-slate-800">{activePoints.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {!hasScanned && !scanning && (
        <Card className="text-center py-16">
          <GitMerge size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 mb-2">尚未执行检测</p>
          <p className="text-sm text-slate-400 mb-4">
            点击右上角「开始检测」，系统将自动扫描名称和位置相近的疑似重复点位
          </p>
          <Button onClick={doScan}>开始检测</Button>
        </Card>
      )}

      {candidates.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-serif font-semibold text-slate-700 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            疑似重复点位（{candidates.length} 组）
          </h3>
          {candidates.map((c) => (
            <MergeCandidateCard key={`${c.point_a.id}-${c.point_b.id}`} candidate={c} onMerge={handleMerge} />
          ))}
        </div>
      )}

      {hasScanned && candidates.length === 0 && !scanning && (
        <Card className="text-center py-16">
          <CheckCircle2 size={40} className="mx-auto text-green-500 mb-4" />
          <p className="text-slate-700 font-medium">未发现疑似重复点位</p>
          <p className="text-sm text-slate-400 mt-1">
            当前所有点位在名称和位置维度均无高度重叠
          </p>
        </Card>
      )}

      {completedMerges.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-serif font-semibold text-slate-700 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600" />
            已完成归并记录（{completedMerges.length} 条）
          </h3>
          <div className="space-y-2">
            {completedMerges.map(({ source, target, relation }) =>
              source && target ? (
                <div
                  key={relation.id}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-sm text-sm hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/points/${target.id}`)}
                >
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-sm text-xs">
                    {source.name}
                  </span>
                  <span className="text-slate-400">
                    → 归并入 →
                  </span>
                  <span className="font-medium text-slate-800">{target.name}</span>
                  <span className="ml-auto text-xs text-slate-500 flex gap-4">
                    <span>相似度 {Math.round(relation.name_similarity * 100)}%</span>
                    <span>{formatDistance(relation.distance_meters)}</span>
                    <span>{relation.merged_by}</span>
                    <span>{new Date(relation.merged_at).toLocaleDateString('zh-CN')}</span>
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}
