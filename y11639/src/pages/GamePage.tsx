import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore, getLevelConfig } from '../store/gameStore';
import { TopBar } from '../components/TopBar';
import { TeamCard } from '../components/TeamCard';
import { AreaCard } from '../components/AreaCard';
import { EventLog } from '../components/EventLog';
import { calculateMaxScore } from '../utils/gameEngine';

export function GamePage() {
  const navigate = useNavigate();
  const { levelId } = useParams<{ levelId: string }>();
  const publicState = useGameStore(s => s.publicState);
  const currentLevel = useGameStore(s => s.currentLevel);
  const selectedTeamId = useGameStore(s => s.selectedTeamId);
  const startLevel = useGameStore(s => s.startLevel);
  const selectTeam = useGameStore(s => s.selectTeam);
  const dispatch = useGameStore(s => s.dispatch);
  const recall = useGameStore(s => s.recall);
  const endTurn = useGameStore(s => s.endTurn);
  const saveReplay = useGameStore(s => s.saveReplay);

  useEffect(() => {
    if (levelId && (!currentLevel || currentLevel.id !== levelId)) {
      const level = getLevelConfig(levelId);
      if (level) {
        startLevel(levelId);
      } else {
        navigate('/');
      }
    }
  }, [levelId, currentLevel, startLevel, navigate]);

  useEffect(() => {
    if (publicState?.gameOver) {
      const replay = saveReplay();
      if (replay) {
        navigate(`/result/${levelId}`, { state: { replayId: replay.id } });
      }
    }
  }, [publicState?.gameOver, navigate, levelId, saveReplay]);

  if (!publicState || !currentLevel) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  const handleTeamClick = (teamId: string) => {
    const team = publicState.teams.find(t => t.id === teamId);
    if (!team) return;

    if (team.status === 'executing') {
      if (confirm(`是否撤回 ${team.name}？`)) {
        recall(teamId);
      }
      return;
    }

    if (team.status === 'cooling') {
      return;
    }

    if (team.status === 'idle') {
      if (selectedTeamId === teamId) {
        selectTeam(null);
      } else {
        selectTeam(teamId);
      }
    }
  };

  const handleAreaClick = (areaId: string) => {
    if (selectedTeamId) {
      dispatch(selectedTeamId, areaId);
    }
  };

  const idleTeams = publicState.teams.filter(t => t.status === 'idle');
  const executingTeams = publicState.teams.filter(t => t.status === 'executing');
  const coolingTeams = publicState.teams.filter(t => t.status === 'cooling');

  const maxScore = calculateMaxScore(currentLevel);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Teams */}
        <div className="w-80 bg-slate-800/30 border-r border-slate-600 p-4 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>👷</span> 抢修队伍
          </h2>

          <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
            {idleTeams.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-400 mb-2 uppercase tracking-wider">待命</h3>
                <div className="space-y-2">
                  {idleTeams.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      isSelected={selectedTeamId === team.id}
                      onClick={() => handleTeamClick(team.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {executingTeams.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-400 mb-2 uppercase tracking-wider">执行中</h3>
                <div className="space-y-2">
                  {executingTeams.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      isSelected={false}
                      onClick={() => handleTeamClick(team.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {coolingTeams.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-400 mb-2 uppercase tracking-wider">冷却中</h3>
                <div className="space-y-2">
                  {coolingTeams.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      isSelected={false}
                      onClick={() => handleTeamClick(team.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400">
              {selectedTeamId
                ? '已选择队伍，点击目标区域完成派遣'
                : '点击待命队伍进行选择'}
            </p>
          </div>
        </div>

        {/* Center Panel - Areas */}
        <div className="flex-1 bg-slate-800/20 p-4 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>📍</span> 抢修区域
            {selectedTeamId && (
              <span className="ml-auto text-sm text-emerald-400 animate-pulse">
                选择目标区域
              </span>
            )}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-y-auto scrollbar-thin">
            {publicState.areas.map(area => (
              <AreaCard
                key={area.id}
                area={area}
                isSelectable={!!selectedTeamId && area.powerStatus !== 'normal'}
                onClick={() => handleAreaClick(area.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Log */}
        <div className="w-96 bg-slate-800/30 border-l border-slate-600 p-4 flex flex-col">
          <div className="flex-1 mb-4">
            <EventLog />
          </div>

          <div className="space-y-3">
            <button
              onClick={endTurn}
              disabled={publicState.gameOver}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-bold text-lg transition-all hover:scale-102 disabled:hover:scale-100"
            >
              结束回合 →
            </button>

            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">已修复区域</span>
                <span className="text-emerald-400 font-bold">
                  {publicState.areas.filter(a => a.powerStatus === 'normal').length}
                  <span className="text-slate-500">/{publicState.areas.length}</span>
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-400">失败次数</span>
                <span className="text-red-400 font-bold">{publicState.failReasons.length}</span>
              </div>
            </div>

            {selectedTeamId && (
              <button
                onClick={() => selectTeam(null)}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              >
                取消选择
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}