import React from 'react';
import { ArrowLeft, Clock, Database, User, GitCompare, ChevronRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useHistoryStore } from '@/store/useHistoryStore';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { versions, currentVersionId, compareVersionId, loadVersion, setCompareVersion } = useHistoryStore();

  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-white/10 flex items-center px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          返回主视图
        </Button>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <h1 className="font-semibold">数据历史记录</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {compareVersionId && (
            <Badge variant="default" className="mr-2">
              对比模式：已选择 2 个版本
            </Badge>
          )}
          <Button variant="secondary" size="sm" disabled={!compareVersionId}>
            <GitCompare className="w-4 h-4 mr-1.5" />
            对比视图
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          {sortedVersions.map((version, index) => (
            <div
              key={version.id}
              className={`bg-slate-900/50 border rounded-xl overflow-hidden transition-all ${
                version.id === currentVersionId
                  ? 'border-cyan-500/50 ring-1 ring-cyan-500/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        version.id === currentVersionId
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {index === 0 ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    {index < sortedVersions.length - 1 && (
                      <div className="absolute top-10 left-1/2 w-px h-8 bg-white/10 -translate-x-1/2" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{version.id}</h3>
                      {version.id === currentVersionId && (
                        <Badge variant="success">当前版本</Badge>
                      )}
                      {compareVersionId === version.id && (
                        <Badge variant="warning">已选中对比</Badge>
                      )}
                    </div>
                    <p className="text-white/60 text-sm mt-1">{version.changeLog}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(version.timestamp).toLocaleString('zh-CN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {version.createdBy === 'system' ? '系统自动' : version.createdBy}
                      </span>
                      <span>来源: {version.source}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {version.id !== currentVersionId && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCompareVersion(
                            compareVersionId === version.id ? null : version.id
                          )}
                        >
                          {compareVersionId === version.id ? '取消对比' : '对比'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => loadVersion(version.id)}>
                          加载此版本
                        </Button>
                      </>
                    )}
                    <ChevronRight className="w-5 h-5 text-white/30" />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 px-4 py-3 bg-white/[0.02]">
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-white/40">雪道</div>
                    <div className="text-white/80 font-mono mt-0.5">
                      {version.dataSnapshot.slopes.length} 条
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40">轨迹</div>
                    <div className="text-white/80 font-mono mt-0.5">
                      {version.dataSnapshot.trajectories.length} 条
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40">事故</div>
                    <div className="text-white/80 font-mono mt-0.5">
                      {version.dataSnapshot.accidents.length} 起
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40">巡逻</div>
                    <div className="text-white/80 font-mono mt-0.5">
                      {version.dataSnapshot.patrolReports.length} 份
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-slate-900/50 border border-white/10 rounded-xl">
          <h3 className="text-sm font-medium text-white/80 mb-2">数据修正说明</h3>
          <ul className="text-xs text-white/50 space-y-1">
            <li>• 所有数据变更均记录在案，包含操作人、时间和变更内容</li>
            <li>• 系统自动记录每个版本的完整数据快照，支持回溯和对比</li>
            <li>• 加载历史版本后，可查看当时的风险评估和巡逻建议</li>
            <li>• 数据来源包括：雪场监测站、GPS定位、巡逻员提交、历史导入</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default History;
