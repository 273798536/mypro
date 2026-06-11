import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { haversineDistance, formatDistance } from '@/utils/distance';

interface Props {
  groups: string[][];
}

export default function SuspendedAlert({ groups }: Props) {
  const { getPointById } = useAppStore();

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map((group, gIdx) => {
        const pts = group.map((id) => getPointById(id)).filter(Boolean) as ReturnType<typeof getPointById>[];
        if (pts.length < 2) return null;
        const [a, b] = pts;
        const dist = haversineDistance(a!.lat, a!.lng, b!.lat, b!.lng);
        return (
          <div
            key={gIdx}
            className="border-2 border-suspended-red/30 bg-red-50 rounded-sm p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-suspended-red flex-shrink-0 mt-0.5" strokeWidth={1.8} />
              <div className="flex-1">
                <div className="font-medium text-sm text-suspended-red">
                  相邻点位疑似合错 · {group.join(' / ')}
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  两点直线距离仅 <span className="font-mono-data font-semibold">{formatDistance(dist)}</span>，
                  低于阈值 50 米。疑似重复上报或点位合并错误。
                  系统已自动<strong>挂起</strong>，不纳入方案结论计算。
                  请现场老师复核确认后再处理。
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {group.map((id) => (
                    <Link
                      key={id}
                      to={`/point/${id}`}
                      className="text-xs px-2 py-1 bg-white border border-suspended-red/30 text-suspended-red rounded-sm font-mono-data hover:bg-suspended-red hover:text-white transition-colors"
                    >
                      查看 {id}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
