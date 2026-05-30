import { useState } from 'react';
import { History, Clock, User, ArrowUpDown, Eye, ChevronDown, ChevronUp, GitCompare } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function VersionHistory() {
  const {
    changeLogs,
    rankingVersions,
    createNewVersion,
    getContestantById,
    currentRanking,
  } = useAppStore();

  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);

  const sortedLogs = [...changeLogs].reverse();

  const getActionStyle = (actionType: string) => {
    switch (actionType) {
      case 'score_update':
        return 'bg-blue-100 text-blue-700';
      case 'rule_change':
        return 'bg-purple-100 text-purple-700';
      case 'tiebreak_confirm':
        return 'bg-amber-100 text-amber-700';
      case 'appeal_approved':
        return 'bg-green-100 text-green-700';
      case 'appeal_rejected':
        return 'bg-red-100 text-red-700';
      case 'manual_edit':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'score_update':
        return '成绩修改';
      case 'rule_change':
        return '规则变更';
      case 'tiebreak_confirm':
        return '同分确认';
      case 'appeal_approved':
        return '申诉通过';
      case 'appeal_rejected':
        return '申诉驳回';
      case 'manual_edit':
        return '手动编辑';
      default:
        return actionType;
    }
  };

  const handleCreateVersion = () => {
    createNewVersion('manual', '手动创建版本快照');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-7 h-7 text-slate-600" />
            版本历史
          </h1>
          <p className="text-slate-500 mt-1">查看所有操作记录和版本快照</p>
        </div>
        <button
          onClick={handleCreateVersion}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2"
        >
          <GitCompare className="w-4 h-4" />
          创建版本快照
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          操作日志 ({changeLogs.length})
        </h2>

        {sortedLogs.length > 0 ? (
          <div className="space-y-3">
            {sortedLogs.map((log) => {
              const isExpanded = expandedLog === log.id;
              return (
                <div
                  key={log.id}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionStyle(log.actionType)}`}>
                        {getActionLabel(log.actionType)}
                      </span>
                      <p className="font-medium text-slate-800">{log.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {log.operator}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(log.timestamp), 'MM-dd HH:mm:ss', { locale: zhCN })}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      {log.fieldChanged && (
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-sm text-slate-500">变更字段:</span>
                          <span className="text-sm font-medium text-slate-700">{log.fieldChanged}</span>
                          {log.oldValue !== undefined && (
                            <span className="text-sm text-red-500 line-through">{log.oldValue}</span>
                          )}
                          <ArrowUpDown className="w-4 h-4 text-slate-400" />
                          {log.newValue !== undefined && (
                            <span className="text-sm text-green-600 font-medium">{log.newValue}</span>
                          )}
                        </div>
                      )}
                      {log.affectedContestants.length > 0 && (
                        <div>
                          <span className="text-sm text-slate-500">影响选手:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {log.affectedContestants.map((cid) => {
                              const contestant = getContestantById(cid);
                              return (
                                <span
                                  key={cid}
                                  className="px-2 py-1 bg-slate-100 text-slate-600 text-sm rounded"
                                >
                                  {contestant?.name || cid}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无操作记录</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-slate-500" />
          版本快照 ({rankingVersions.length})
        </h2>

        {rankingVersions.length > 0 ? (
          <div className="space-y-3">
            {rankingVersions.map((version) => (
              <div
                key={version.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-slate-800 text-white text-sm font-bold rounded">
                        v{version.version}
                      </span>
                      <span className="font-medium text-slate-800">{version.changeReason}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      规则: {version.ruleConfig.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">{version.createdBy}</p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(version.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                    </p>
                    <button
                      onClick={() => setCompareVersion(compareVersion === version.id ? null : version.id)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-4 h-4" />
                      {compareVersion === version.id ? '关闭' : '查看'}
                    </button>
                  </div>
                </div>
                {compareVersion === version.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">排名快照</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {version.rankingSnapshot.slice(0, 6).map((entry) => {
                        const contestant = getContestantById(entry.contestantId);
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">
                                {entry.rank}
                              </span>
                              <span className="text-sm text-slate-700">{contestant?.name}</span>
                            </div>
                            <span className="text-sm font-medium text-slate-800">{entry.score.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>暂无版本快照</p>
            <p className="text-sm mt-1">点击上方按钮创建版本快照</p>
          </div>
        )}
      </div>
    </div>
  );
}
