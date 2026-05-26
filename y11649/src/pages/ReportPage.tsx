import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { downloadReport, exportReportAsJSON } from '@/utils/export';
import { Button } from '@/components/common/Button';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Home, Download, FileJson, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const ReportPage = () => {
  const navigate = useNavigate();
  const { report, victims, warnings } = useGameStore();
  const [activeTab, setActiveTab] = useState<'unhandled' | 'corrected' | 'pending'>('corrected');

  if (!report) {
    navigate('/');
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'equipment-mismatch': return '装备不匹配';
      case 'route-closed': return '路线关闭';
      case 'injury-worsening': return '伤情恶化';
      default: return type;
    }
  };

  const unhandledVictims = victims.filter(v => !v.isRescued && !v.isFailed);
  const failedVictims = victims.filter(v => v.isFailed);
  const resolvedWarnings = warnings.filter(w => w.isResolved);
  const pendingWarnings = warnings.filter(w => !w.isResolved);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate('/result')}>
            <Home size={20} className="mr-2" />
            返回结果
          </Button>
          <h1 className="text-2xl font-bold text-gray-800 font-display">救援报告</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportReportAsJSON(report)}>
              <FileJson size={18} className="mr-2" />
              导出JSON
            </Button>
            <Button onClick={() => downloadReport(report)}>
              <Download size={18} className="mr-2" />
              下载报告
            </Button>
          </div>
        </div>

        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-800 font-display">总体评价</h2>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-snow-blue-50 to-snow-blue-100 rounded-xl">
                <div className="text-4xl font-black text-snow-blue-600 mb-1">{report.grade}</div>
                <div className="text-sm text-gray-600">评级</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-1">{report.score}</div>
                <div className="text-sm text-gray-600">总分</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <div className="text-2xl font-bold text-purple-600 mb-1">{report.rescued}/{report.totalVictims}</div>
                <div className="text-sm text-gray-600">救援成功</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                <div className="text-2xl font-bold text-orange-600 mb-1">{formatTime(report.totalTime)}</div>
                <div className="text-sm text-gray-600">总用时</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card variant="default" className={unhandledVictims.length > 0 ? 'border-red-300' : ''}>
            <CardHeader className="bg-red-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-800">未处理 ({unhandledVictims.length + failedVictims.length})</h3>
              </div>
            </CardHeader>
            <CardContent>
              {unhandledVictims.length === 0 && failedVictims.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">无未处理伤员</p>
              ) : (
                <div className="space-y-2">
                  {failedVictims.map(victim => (
                    <div key={victim.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="font-medium text-red-800">{victim.name}</div>
                      <div className="text-xs text-red-600">救援失败 - 时间耗尽</div>
                    </div>
                  ))}
                  {unhandledVictims.map(victim => (
                    <div key={victim.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="font-medium text-yellow-800">{victim.name}</div>
                      <div className="text-xs text-yellow-600">未开始救援</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-blue-800">已修正 ({report.corrected})</h3>
              </div>
            </CardHeader>
            <CardContent>
              {resolvedWarnings.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">无已修正警告</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {resolvedWarnings.map(warning => (
                    <div key={warning.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600">{getTypeLabel(warning.type)}</span>
                        <span className="text-xs text-gray-500">{formatTime(warning.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{warning.message}</p>
                      {warning.correction && (
                        <p className="text-xs text-green-600 mt-1">✓ {warning.correction}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="default" className={pendingWarnings.length > 0 ? 'border-orange-300' : ''}>
            <CardHeader className="bg-orange-50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-orange-800">待确认 ({report.needsConfirmation})</h3>
              </div>
            </CardHeader>
            <CardContent>
              {pendingWarnings.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">无待确认警告</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingWarnings.map(warning => (
                    <div key={warning.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-orange-600">{getTypeLabel(warning.type)}</span>
                        <span className="text-xs text-gray-500">{formatTime(warning.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{warning.message}</p>
                      {warning.source && (
                        <p className="text-xs text-gray-500 mt-1">来源: {warning.source}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card variant="default">
          <CardHeader>
            <h3 className="font-semibold text-gray-800">详细警告记录</h3>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                variant={activeTab === 'unhandled' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('unhandled')}
              >
                全部
              </Button>
              <Button
                variant={activeTab === 'corrected' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('corrected')}
              >
                已修正
              </Button>
              <Button
                variant={activeTab === 'pending' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('pending')}
              >
                待确认
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">类型</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">状态</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">时间</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">描述</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">来源/修正</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'unhandled' ? warnings :
                    activeTab === 'corrected' ? resolvedWarnings : pendingWarnings
                  ).map(warning => (
                    <tr key={warning.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          warning.type === 'equipment-mismatch' ? 'bg-orange-100 text-orange-700' :
                          warning.type === 'route-closed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getTypeLabel(warning.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          warning.isResolved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {warning.isResolved ? '已修正' : '待确认'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono">{formatTime(warning.timestamp)}</td>
                      <td className="py-3 px-4 text-gray-800">{warning.message}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {warning.source && <div>来源: {warning.source}</div>}
                        {warning.correction && <div className="text-green-600">修正: {warning.correction}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
