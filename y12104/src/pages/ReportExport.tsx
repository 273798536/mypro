import { useState } from 'react';
import { FileBarChart, Download, FileText, Table, Calendar, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function ReportExport() {
  const {
    currentRanking,
    contestants,
    currentRule,
    changeLogs,
    rankingVersions,
    pendingTieBreaks,
    getContestantById,
    getScoreByContestantId,
    getSubmissionByContestantId,
  } = useAppStore();

  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'text'>('csv');
  const [includeHistory, setIncludeHistory] = useState(true);

  const generateRankingCSV = () => {
    const headers = ['排名', '选手', '队伍', '总分', '同分状态', '提交时间'];
    const rows = currentRanking.map((entry) => {
      const contestant = getContestantById(entry.contestantId);
      const submission = getSubmissionByContestantId(entry.contestantId);
      return [
        entry.rank,
        contestant?.name || '',
        contestant?.team || '',
        entry.score.toFixed(2),
        entry.isTied ? (entry.tieBreakStatus === 'confirmed' ? '已确认' : '待确认') : '',
        submission ? format(new Date(submission.submitTime), 'HH:mm:ss') : '',
      ];
    });

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  const generateFullReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      rule: currentRule,
      ranking: currentRanking.map((entry) => ({
        rank: entry.rank,
        contestant: getContestantById(entry.contestantId),
        score: entry.score,
        isTied: entry.isTied,
        tieBreakStatus: entry.tieBreakStatus,
        scoreDetails: getScoreByContestantId(entry.contestantId)?.items,
        submissionTime: getSubmissionByContestantId(entry.contestantId)?.submitTime,
      })),
      tieBreaks: pendingTieBreaks,
      changeHistory: includeHistory ? changeLogs : [],
      versions: includeHistory ? rankingVersions : [],
    };

    return JSON.stringify(report, null, 2);
  };

  const generateTextReport = () => {
    let text = '='.repeat(60) + '\n';
    text += '竞赛排名报告\n';
    text += '='.repeat(60) + '\n\n';
    text += `生成时间: ${format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}\n`;
    text += `排名规则: ${currentRule.name}\n`;
    text += `规则说明: ${currentRule.description}\n\n`;
    text += '-'.repeat(60) + '\n';
    text += '排名表\n';
    text += '-'.repeat(60) + '\n\n';

    currentRanking.forEach((entry, index) => {
      const contestant = getContestantById(entry.contestantId);
      const tiedMark = entry.isTied ? (entry.tieBreakStatus === 'confirmed' ? '[同分已确认]' : '[同分待确认]') : '';
      text += `${String(entry.rank).padStart(2)}. ${contestant?.name?.padEnd(10) || ''}  ${String(entry.score.toFixed(2)).padStart(8)}分  ${contestant?.team?.padStart(10)}  ${tiedMark}\n`;
    });

    if (includeHistory) {
      text += '\n' + '-'.repeat(60) + '\n';
      text += '操作日志\n';
      text += '-'.repeat(60) + '\n\n';
      changeLogs.slice(-10).forEach((log) => {
        text += `[${format(new Date(log.timestamp), 'MM-dd HH:mm')}] ${log.operator}: ${log.description}\n`;
      });
    }

    return text;
  };

  const handleDownload = () => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (selectedFormat) {
      case 'csv':
        content = generateRankingCSV();
        filename = `ranking_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        mimeType = 'text/csv;charset=utf-8';
        break;
      case 'json':
        content = generateFullReport();
        filename = `report_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
        mimeType = 'application/json;charset=utf-8';
        break;
      case 'text':
        content = generateTextReport();
        filename = `report_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
        mimeType = 'text/plain;charset=utf-8';
        break;
    }

    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileBarChart className="w-7 h-7 text-green-600" />
          报告导出
        </h1>
        <p className="text-slate-500 mt-1">导出排名数据和审计报告</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">导出选项</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">导出格式</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'csv', label: 'CSV表格', icon: Table },
                  { id: 'json', label: 'JSON数据', icon: FileText },
                  { id: 'text', label: '文本报告', icon: FileText },
                ].map((formatOption) => {
                  const Icon = formatOption.icon;
                  const isSelected = selectedFormat === formatOption.id;
                  return (
                    <button
                      key={formatOption.id}
                      onClick={() => setSelectedFormat(formatOption.id as any)}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-green-600' : 'text-slate-400'}`} />
                      <span className={`text-sm ${isSelected ? 'text-green-700 font-medium' : 'text-slate-600'}`}>
                        {formatOption.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIncludeHistory(!includeHistory)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  includeHistory ? 'bg-green-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    includeHistory ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-sm text-slate-700">包含操作历史和版本记录</span>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={currentRanking.length === 0}
            className="w-full mt-6 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            导出报告
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">当前排名表预览</h2>

          {currentRanking.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">排名</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">选手</th>
                    <th className="px-3 py-2 text-right text-slate-600 font-medium">分数</th>
                    <th className="px-3 py-2 text-center text-slate-600 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRanking.slice(0, 8).map((entry) => {
                    const contestant = getContestantById(entry.contestantId);
                    return (
                      <tr key={entry.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">{entry.rank}</td>
                        <td className="px-3 py-2">{contestant?.name}</td>
                        <td className="px-3 py-2 text-right font-medium">{entry.score.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          {entry.isTied ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                entry.tieBreakStatus === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {entry.tieBreakStatus === 'confirmed' ? '已确认' : '待确认'}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {currentRanking.length > 8 && (
                <div className="px-3 py-2 bg-slate-50 text-center text-sm text-slate-500 border-t border-slate-200">
                  还有 {currentRanking.length - 8} 位选手...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileBarChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无排名数据</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>共 {currentRanking.length} 位选手</span>
              <span className="text-slate-300">|</span>
              <span>{pendingTieBreaks.filter((g) => g.status === 'pending').length} 组待确认同分</span>
              <span className="text-slate-300">|</span>
              <span>{rankingVersions.length} 个版本</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">月度复盘数据</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">总操作次数</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{changeLogs.length}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-600">同分处理数</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {changeLogs.filter((l) => l.actionType === 'tiebreak_confirm').length}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">申诉通过数</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {changeLogs.filter((l) => l.actionType === 'appeal_approved').length}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600">规则变更数</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">
              {changeLogs.filter((l) => l.actionType === 'rule_change').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
