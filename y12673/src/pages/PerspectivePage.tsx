import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Calendar, Crosshair, Target, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Perspective } from '@shared/types';

interface PerspectiveGroup {
  recordId: string;
  recordTitle: string;
  perspectives: Perspective[];
}

export default function PerspectivePage() {
  const [groups, setGroups] = useState<PerspectiveGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPerspectives();
      setGroups(res.data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
          视角保存
        </h1>
        <p className="text-stone-500 mt-2 ml-4.5">
          月底或课前查看保存的视角数据，确认能否解释清楚
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="ml-3 text-stone-500">加载中...</span>
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="bg-white border border-dashed border-stone-300 rounded-xl p-16 text-center text-stone-400">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>暂无保存的视角</p>
          <p className="text-sm mt-1">可在讲解详情页添加视角保存记录</p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group, gIdx) => (
          <motion.div
            key={group.recordId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gIdx * 0.05 }}
            className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <div className="font-semibold text-stone-800">{group.recordTitle}</div>
                <div className="text-xs text-stone-400 mt-0.5 font-mono">
                  关联记录 ID：{group.recordId}
                </div>
              </div>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm font-medium rounded-full">
                {group.perspectives.length} 个视角
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              {group.perspectives.map((p, pIdx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: gIdx * 0.05 + pIdx * 0.03 }}
                  className="p-4 bg-gradient-to-br from-stone-50 to-white border border-stone-200 rounded-lg hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-stone-800 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-orange-500" />
                      {p.name}
                    </div>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(p.timestamp)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-md border border-stone-100">
                      <div className="flex items-center gap-1 text-stone-500 mb-1">
                        <Crosshair className="w-3 h-3" />
                        相机位置
                      </div>
                      <div className="font-mono text-stone-700 text-[11px] leading-relaxed">
                        X: {p.cameraPosition.x.toFixed(1)}<br />
                        Y: {p.cameraPosition.y.toFixed(1)}<br />
                        Z: {p.cameraPosition.z.toFixed(0)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-md border border-stone-100">
                      <div className="flex items-center gap-1 text-stone-500 mb-1">
                        <Target className="w-3 h-3" />
                        观察目标
                      </div>
                      <div className="font-mono text-stone-700 text-[11px] leading-relaxed">
                        X: {p.cameraTarget.x.toFixed(1)}<br />
                        Y: {p.cameraTarget.y.toFixed(1)}<br />
                        Z: {p.cameraTarget.z.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
