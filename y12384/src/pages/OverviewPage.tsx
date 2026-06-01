import React from 'react';
import { Users, Music, Megaphone, Target } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { Timeline } from '../components/Timeline';
import { Heatmap } from '../components/Heatmap';
import { usePlaylistStore } from '../store/usePlaylistStore';

export const OverviewPage: React.FC = () => {
  const { currentPlaylist, conflicts, setSelectedConflict, setActiveTab } = usePlaylistStore();

  const artistRepeatCount = conflicts.filter(c => c.type === 'artist_repeat' && !c.resolved).length;
  const adClashCount = conflicts.filter(c => c.type === 'ad_clash' && !c.resolved).length;
  const newSongDenseCount = conflicts.filter(c => c.type === 'new_song_dense' && !c.resolved).length;
  const totalSongs = currentPlaylist?.items.length || 0;

  const handleConflictClick = () => {
    setActiveTab('conflicts');
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-surface-800 font-display">
          歌单总览
        </h1>
        <p className="text-surface-500 mt-1">
          查看歌单编排状态、关键指标和冲突分布
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="同艺人连播"
          value={artistRepeatCount}
          icon={Users}
          color={artistRepeatCount > 0 ? 'danger' : 'success'}
          trend={artistRepeatCount > 0 ? 'up' : 'neutral'}
          trendValue={artistRepeatCount > 0 ? '需要处理' : '正常'}
          delay={100}
        />
        <MetricCard
          title="新歌过密"
          value={newSongDenseCount}
          icon={Music}
          color={newSongDenseCount > 0 ? 'warning' : 'success'}
          trend={newSongDenseCount > 0 ? 'up' : 'neutral'}
          trendValue={newSongDenseCount > 0 ? '需要调整' : '正常'}
          delay={200}
        />
        <MetricCard
          title="广告撞歌"
          value={adClashCount}
          icon={Megaphone}
          color={adClashCount > 0 ? 'warning' : 'success'}
          trend="neutral"
          trendValue={adClashCount > 0 ? '待确认' : '正常'}
          delay={300}
        />
        <MetricCard
          title="约束满足率"
          value={`${Math.round(((totalSongs - conflicts.filter(c => !c.resolved).length * 3) / totalSongs) * 100)}%`}
          icon={Target}
          color="primary"
          trend="up"
          trendValue="较昨日 +5%"
          delay={400}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Timeline
            items={currentPlaylist?.items || []}
            conflicts={conflicts}
            onConflictClick={(conflict) => {
              setSelectedConflict(conflict);
              handleConflictClick();
            }}
          />
        </div>
        <div>
          <Heatmap />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-800 mb-4 font-display">
          快速操作
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('conflicts')}
            className="p-4 border-2 border-dashed border-surface-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all text-left group"
          >
            <AlertTriangle className="w-8 h-8 text-surface-400 group-hover:text-primary-500 mb-2" />
            <p className="font-medium text-surface-700 group-hover:text-primary-600">
              查看所有冲突
            </p>
            <p className="text-sm text-surface-500">
              {conflicts.filter(c => !c.resolved).length} 个待处理
            </p>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className="p-4 border-2 border-dashed border-surface-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all text-left group"
          >
            <FileBarChart className="w-8 h-8 text-surface-400 group-hover:text-primary-500 mb-2" />
            <p className="font-medium text-surface-700 group-hover:text-primary-600">
              生成编排报告
            </p>
            <p className="text-sm text-surface-500">
              包含完整分析和建议
            </p>
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className="p-4 border-2 border-dashed border-surface-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all text-left group"
          >
            <GitCompare className="w-8 h-8 text-surface-400 group-hover:text-primary-500 mb-2" />
            <p className="font-medium text-surface-700 group-hover:text-primary-600">
              查看版本历史
            </p>
            <p className="text-sm text-surface-500">
              追踪修改记录
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

function FileBarChart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" x2="12" y1="18" y2="12" />
      <line x1="8" x2="8" y1="18" y2="16" />
      <line x1="16" x2="16" y1="18" y2="9" />
    </svg>
  );
}

function GitCompare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
      <path d="M6 15v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}
