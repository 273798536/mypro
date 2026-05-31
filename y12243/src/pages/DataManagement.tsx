import { useGameStore } from '@/store/gameStore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Orbit, FileText } from 'lucide-react';
import { useState } from 'react';

type TabKey = 'spacecraft' | 'orbitRings' | 'flightLogs';

export default function DataManagement() {
  const navigate = useNavigate();
  const spacecraft = useGameStore(s => s.spacecraft);
  const orbitRings = useGameStore(s => s.orbitRings);
  const flightLogs = useGameStore(s => s.flightLogs);
  const missionResults = useGameStore(s => s.missionResults);
  const violations = useGameStore(s => s.violations);
  const [activeTab, setActiveTab] = useState<TabKey>('spacecraft');

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'spacecraft', label: '航天器', icon: <Rocket size={14} /> },
    { key: 'orbitRings', label: '轨道环', icon: <Orbit size={14} /> },
    { key: 'flightLogs', label: '飞行日志', icon: <FileText size={14} /> },
  ];

  const statusLabel = { in_orbit: '在轨', de_orbit: '离轨', window_standby: '窗口待命' };
  const statusColor = { in_orbit: 'text-orbit-green', de_orbit: 'text-warning-red', window_standby: 'text-star-blue' };
  const resultStatusColor = { success: 'text-orbit-green', partial: 'text-engine-orange', failed: 'text-warning-red' };

  return (
    <div className="h-screen flex flex-col star-bg">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-space-border bg-space-panel/80 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-400 hover:text-star-blue transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">返回任务台</span>
        </button>
        <div className="h-4 w-px bg-space-border" />
        <h1 className="font-orbitron text-lg text-white tracking-wider">数据管理</h1>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 px-6 py-2 border-b border-space-border bg-space-panel/50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t text-sm transition-colors ${
                activeTab === tab.key
                  ? 'text-star-blue border-b-2 border-star-blue bg-deep-space/50'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'spacecraft' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-space-border">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">名称</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">状态</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">燃料预算</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">已消耗</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">轨道数</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">任务结果</th>
                  </tr>
                </thead>
                <tbody>
                  {spacecraft.map(sc => {
                    const result = missionResults.find(m => m.spacecraftId === sc.id);
                    return (
                      <tr key={sc.id} className="border-b border-space-border/50 hover:bg-space-panel/50 transition-colors">
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs">{sc.id}</td>
                        <td className="py-3 px-4 text-white font-medium">{sc.name}</td>
                        <td className="py-3 px-4">
                          <span className={statusColor[sc.status]}>{statusLabel[sc.status]}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{sc.fuelBudget}</td>
                        <td className="py-3 px-4">
                          <span className={sc.fuelUsed > sc.fuelBudget ? 'text-warning-red' : 'text-gray-300'}>
                            {sc.fuelUsed}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{sc.orbitCount}</td>
                        <td className="py-3 px-4">
                          {result ? (
                            <button
                              onClick={() => navigate(`/review/${result.id}`)}
                              className={`${resultStatusColor[result.status]} hover:underline`}
                            >
                              {result.totalScore}分
                            </button>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'orbitRings' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-space-border">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">名称</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">燃料消耗</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">推力增益</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">窗口时间</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">高度</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">分配</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">相关违规</th>
                  </tr>
                </thead>
                <tbody>
                  {orbitRings.map(orb => {
                    const orbViolations = violations.filter(v => v.orbitRingId === orb.id);
                    const assignedSc = orb.isAssigned ? spacecraft.find(s => s.id === orb.assignedTo) : null;
                    return (
                      <tr key={orb.id} className="border-b border-space-border/50 hover:bg-space-panel/50 transition-colors">
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs">{orb.id}</td>
                        <td className="py-3 px-4 text-white font-medium">{orb.name}</td>
                        <td className="py-3 px-4 text-engine-orange">{orb.fuelCost}</td>
                        <td className="py-3 px-4 text-star-blue">+{orb.thrustGain}</td>
                        <td className="py-3 px-4 text-gray-300">{orb.windowOpen}—{orb.windowClose}</td>
                        <td className="py-3 px-4 text-gray-300">{orb.altitude.toLocaleString()} km</td>
                        <td className="py-3 px-4">
                          {assignedSc ? (
                            <span className="text-orbit-green">{assignedSc.name}</span>
                          ) : (
                            <span className="text-gray-600">未分配</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {orbViolations.length > 0 ? (
                            <span className="text-warning-red">{orbViolations.length}条</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'flightLogs' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-space-border">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">时间</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">航天器</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">类型</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">描述</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">标记</th>
                  </tr>
                </thead>
                <tbody>
                  {flightLogs.map(log => {
                    const sc = spacecraft.find(s => s.id === log.spacecraftId);
                    const typeColors: Record<string, string> = {
                      allocation: 'text-blue-400',
                      fuel_settlement: 'text-orange-400',
                      window_miss: 'text-red-400',
                      orbit_intersection: 'text-yellow-400',
                      note: 'text-gray-400',
                    };
                    const typeLabels: Record<string, string> = {
                      allocation: '分配',
                      fuel_settlement: '燃料结算',
                      window_miss: '窗口错过',
                      orbit_intersection: '轨道相交',
                      note: '备注',
                    };
                    return (
                      <tr
                        key={log.id}
                        className={`border-b border-space-border/50 hover:bg-space-panel/50 transition-colors ${
                          log.isLateEntry ? 'bg-late-blue/5' : ''
                        } ${log.isNoteModified ? 'border-l-2 border-l-note-yellow' : ''}`}
                      >
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs whitespace-nowrap">
                          {log.timestamp.replace('T', ' ').slice(0, 16)}
                        </td>
                        <td className="py-3 px-4 text-gray-300">{sc?.name ?? '—'}</td>
                        <td className="py-3 px-4">
                          <span className={typeColors[log.eventType]}>{typeLabels[log.eventType]}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{log.description}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {log.hasMissingField && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">缺字段</span>
                            )}
                            {log.isLateEntry && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-late-blue/20 text-late-blue border border-late-blue/30">晚补</span>
                            )}
                            {log.isNoteModified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-note-yellow/20 text-note-yellow border border-note-yellow/30">备注改</span>
                            )}
                            {!log.hasMissingField && !log.isLateEntry && !log.isNoteModified && (
                              <span className="text-gray-600">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
