import type { MergeCandidate } from '@/types';
import { formatDistance } from '@/utils/geo';
import { Link2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusTag } from '@/components/ui/StatusTag';

interface MergeCandidateCardProps {
  candidate: MergeCandidate;
  onMerge: (sourceId: string, targetId: string) => void;
}

export function MergeCandidateCard({ candidate, onMerge }: MergeCandidateCardProps) {
  const { point_a, point_b, name_similarity, distance_meters } = candidate;
  const similarityPct = Math.round(name_similarity * 100);

  return (
    <div className="border-2 border-amber-200 bg-amber-50/50 rounded-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-amber-600" />
        <span className="text-sm font-medium text-amber-800">疑似重复点位</span>
        <span className="ml-auto text-xs text-amber-700">
          置信度：{similarityPct}%
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[point_a, point_b].map((pt, idx) => (
          <div key={pt.id} className="bg-white border border-slate-200 rounded-sm p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500">点位 {idx === 0 ? 'A' : 'B'}</span>
              <StatusTag status={pt.status} />
            </div>
            <h4 className="font-serif font-semibold text-slate-800 text-sm">{pt.name}</h4>
            <p className="text-xs text-slate-500 mt-1">{pt.address}</p>
            <p className="text-xs text-slate-400 mt-1">
              {pt.lng.toFixed(4)}, {pt.lat.toFixed(4)}
            </p>
            <p className="text-xs text-slate-400 mt-1">来源：{pt.source}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-4 p-3 bg-white/70 rounded-sm text-xs text-slate-600">
        <div>
          <span className="text-slate-500">名称相似度：</span>
          <span className="font-mono font-semibold text-slate-800">{similarityPct}%</span>
          <div className="mt-1 w-32 h-1.5 bg-slate-200 rounded-sm overflow-hidden">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${similarityPct}%` }}
            />
          </div>
        </div>
        <div>
          <span className="text-slate-500">地理距离：</span>
          <span className="font-mono font-semibold text-slate-800">
            {formatDistance(distance_meters)}
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm">暂不归并</Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => onMerge(point_a.id, point_b.id)}
          >
            <Link2 size={14} /> 确认归并
          </Button>
        </div>
      </div>
    </div>
  );
}
