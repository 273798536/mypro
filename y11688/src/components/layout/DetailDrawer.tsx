import React from 'react';
import { X, MapPin, AlertTriangle, Snowflake, Users, ChevronRight } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { RiskBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getSnowBySlopeId } from '@/data/snowfall';
import { getAccidentsBySlopeId } from '@/data/accidents';
import { getTrajectoriesBySlopeId } from '@/data/trajectories';
import { difficultyLabels, difficultyColors } from '@/utils/color';
import type { Accident } from '@/types';
import { calculateAreaStats } from '@/services/exporter';
import { slopes } from '@/data/slopes';
import { accidents as allAccidents } from '@/data/accidents';
import { trajectories as allTrajectories } from '@/data/trajectories';
import { patrolReports } from '@/data/patrols';

const areaStats = calculateAreaStats(slopes, allAccidents, allTrajectories, patrolReports);

export const DetailDrawer: React.FC = () => {
  const { selectedArea, selectedAccident, isDetailDrawerOpen, setDetailDrawerOpen, selectArea, selectAccident } =
    useSceneStore();

  const handleClose = () => {
    setDetailDrawerOpen(false);
    selectArea(null);
    selectAccident(null);
  };

  const stats = selectedArea
    ? areaStats.find((s) => s.slopeId === selectedArea.id)
    : null;

  const slopeAccidents = selectedArea ? getAccidentsBySlopeId(selectedArea.id) : [];
  const slopeSnow = selectedArea ? getSnowBySlopeId(selectedArea.id) : undefined;
  const slopeTrajectories = selectedArea ? getTrajectoriesBySlopeId(selectedArea.id) : [];

  if (!isDetailDrawerOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-slate-900/95 backdrop-blur-md border-l border-white/10 shadow-2xl z-40 animate-in slide-in-from-right duration-300">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">区域详情</h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedArea && (
            <>
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium text-lg">
                      {selectedArea.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${difficultyColors[selectedArea.difficulty]}30`,
                          color: difficultyColors[selectedArea.difficulty],
                        }}
                      >
                        {difficultyLabels[selectedArea.difficulty]}
                      </span>
                      {stats && <RiskBadge level={stats.riskLevel} />}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<MapPin className="w-4 h-4" />}
                    label="平均坡度"
                    value={`${selectedArea.averageSlope}°`}
                  />
                  <StatCard
                    icon={<Snowflake className="w-4 h-4" />}
                    label="积雪深度"
                    value={`${slopeSnow?.depth || 0}cm`}
                  />
                  <StatCard
                    icon={<Users className="w-4 h-4" />}
                    label="今日人流"
                    value={`${slopeTrajectories.length}人`}
                  />
                  <StatCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="事故记录"
                    value={`${slopeAccidents.length}起`}
                  />
                </div>
              </div>

              {slopeAccidents.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-white/80 text-sm font-medium">事故记录</span>
                    </div>
                    <span className="text-xs text-white/50">{slopeAccidents.length} 起</span>
                  </div>
                  <div className="space-y-2">
                    {slopeAccidents.map((accident) => (
                      <AccidentItem key={accident.id} accident={accident} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {selectedAccident && (
            <AccidentDetail accident={selectedAccident} />
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="bg-white/5 rounded-lg p-3">
    <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
      {icon}
      {label}
    </div>
    <div className="text-white font-mono text-lg">{value}</div>
  </div>
);

const AccidentItem: React.FC<{ accident: Accident }> = ({ accident }) => {
  const { selectAccident } = useSceneStore();

  return (
    <div
      onClick={() => selectAccident(accident)}
      className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <RiskBadge level={accident.severity} />
          <span className="text-white/80 text-sm">
            {accident.type === 'fall'
              ? '摔倒'
              : accident.type === 'collision'
              ? '碰撞'
              : accident.type === 'equipment'
              ? '装备故障'
              : accident.type === 'medical'
              ? '医疗事件'
              : '其他'}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/30" />
      </div>
      <p className="text-white/60 text-xs mt-1 line-clamp-1">{accident.description}</p>
      <div className="text-white/40 text-xs mt-1">
        {new Date(accident.time).toLocaleString()}
      </div>
    </div>
  );
};

const AccidentDetail: React.FC<{ accident: Accident }> = ({ accident }) => {
  const slope = slopes.find((s) => s.id === accident.slopeId);

  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="text-white font-medium">事故详情</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-white/60">严重程度</span>
          <RiskBadge level={accident.severity} />
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">事故类型</span>
          <span className="text-white/90">
            {accident.type === 'fall'
              ? '摔倒'
              : accident.type === 'collision'
              ? '碰撞'
              : accident.type === 'equipment'
              ? '装备故障'
              : accident.type === 'medical'
              ? '医疗事件'
              : '其他'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">发生位置</span>
          <span className="text-white/90">{slope?.name || '未知区域'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">发生时间</span>
          <span className="text-white/90 font-mono text-xs">
            {new Date(accident.time).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">数据来源</span>
          <span className="text-white/90">{accident.source}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-white/10">
        <p className="text-white/80 text-sm">{accident.description}</p>
      </div>
    </div>
  );
};
