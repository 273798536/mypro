import React from 'react';
import { 
  FileBarChart, CheckCircle, AlertTriangle, XCircle, 
  Download, Share2, Music, Users, Megaphone, Target,
  Lightbulb, ChevronRight
} from 'lucide-react';
import { usePlaylistStore } from '../store/usePlaylistStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const statusColors = {
  met: 'bg-success-100 text-success-700 border-success-200',
  unmet: 'bg-danger-100 text-danger-700 border-danger-200',
};

export const ReportPage: React.FC = () => {
  const { generateReport, currentPlaylist } = usePlaylistStore();
  const report = generateReport();

  const conflictTypeData = [
    { name: '同艺人连播', value: report.summary.artistRepeatCount, color: '#c62828' },
    { name: '新歌过密', value: report.summary.newSongDenseCount, color: '#ff8f00' },
    { name: '广告撞歌', value: report.summary.adClashCount, color: '#7b1fa2' },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-800 font-display">
            编排报告
          </h1>
          <p className="text-surface-500 mt-1">
            歌单编排完整分析报告，包含约束满足情况和改进建议
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            分享
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold font-display">
              {currentPlaylist?.name}
            </h2>
            <p className="text-primary-100 mt-1">
              编排分析报告 · {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold font-display">
              {report.summary.constraintSatisfactionRate}%
            </div>
            <p className="text-primary-200 text-sm">约束满足率</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 animate-slide-up" style={{ animationDelay: '100ms', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Music className="w-5 h-5 text-primary-600" />
            </div>
            <span className="text-surface-500">歌曲总数</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 font-display">
            {report.summary.totalSongs}
          </p>
          <p className="text-sm text-surface-500 mt-1">首歌曲</p>
        </div>

        <div className="card p-6 animate-slide-up" style={{ animationDelay: '200ms', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-danger-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <span className="text-surface-500">冲突总数</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 font-display">
            {report.summary.totalConflicts}
          </p>
          <p className="text-sm text-surface-500 mt-1">
            {report.summary.resolvedConflicts} 个已处理
          </p>
        </div>

        <div className="card p-6 animate-slide-up" style={{ animationDelay: '300ms', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success-600" />
            </div>
            <span className="text-surface-500">未解决</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 font-display">
            {report.summary.totalConflicts - report.summary.resolvedConflicts}
          </p>
          <p className="text-sm text-surface-500 mt-1">个待处理</p>
        </div>

        <div className="card p-6 animate-slide-up" style={{ animationDelay: '400ms', opacity: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Target className="w-5 h-5 text-warning-600" />
            </div>
            <span className="text-surface-500">约束规则</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 font-display">
            {report.constraints.filter((c) => c.met).length}/
            {report.constraints.length}
          </p>
          <p className="text-sm text-surface-500 mt-1">项已满足</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-800 mb-6 font-display">
            冲突类型分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conflictTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fill: '#616161', fontSize: 12 }} />
                <YAxis tick={{ fill: '#616161', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {conflictTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-800 mb-6 font-display">
            冲突比例
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conflictTypeData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {conflictTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {conflictTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-surface-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-800 mb-6 font-display">
          约束规则检查
        </h3>
        <div className="space-y-4">
          {report.constraints.map((constraint, index) => (
            <div
              key={constraint.id}
              className={`p-4 rounded-lg border transition-all animate-slide-up ${
                constraint.met ? statusColors.met : statusColors.unmet
              }`}
              style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {constraint.met ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <div>
                    <p className="font-semibold">{constraint.name}</p>
                    <p className="text-sm opacity-75">{constraint.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-display">
                    {constraint.triggeredCount}
                  </span>
                  <p className="text-xs opacity-75">次触发</p>
                </div>
              </div>
              {!constraint.met && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-sm">
                    <strong>建议：</strong>
                    {constraint.id === 'cr1' && '将同艺人的歌曲分散到不同时段播放，建议每首之间间隔至少15分钟'}
                    {constraint.id === 'cr2' && '将新歌分散到整个节目时段，保持每5首歌中新歌不超过2首'}
                    {constraint.id === 'cr3' && '检查广告前后的歌曲主题匹配度，确保收听体验流畅'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-800 mb-6 font-display flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning-500" />
          改进建议
        </h3>
        <div className="space-y-3">
          {report.recommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 bg-warning-50 rounded-lg border border-warning-200 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-warning-200 rounded-full flex items-center justify-center text-warning-700 font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-warning-800">{rec}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-warning-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-800 mb-6 font-display">
          详细冲突分析
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">
                  冲突类型
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">
                  严重程度
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">
                  位置
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">
                  触发来源
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-500">
                  状态
                </th>
              </tr>
            </thead>
            <tbody>
              {report.conflicts.map((conflict) => (
                <tr
                  key={conflict.id}
                  className="border-b border-surface-100 hover:bg-surface-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {conflict.type === 'artist_repeat' && (
                        <Users className="w-4 h-4 text-danger-500" />
                      )}
                      {conflict.type === 'new_song_dense' && (
                        <Music className="w-4 h-4 text-warning-500" />
                      )}
                      {conflict.type === 'ad_clash' && (
                        <Megaphone className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="font-medium text-surface-700">
                        {conflict.type === 'artist_repeat'
                          ? '同艺人连播'
                          : conflict.type === 'new_song_dense'
                          ? '新歌过密'
                          : '广告撞歌'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        conflict.severity === 'high'
                          ? 'bg-danger-100 text-danger-700'
                          : conflict.severity === 'medium'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      {conflict.severity === 'high'
                        ? '严重'
                        : conflict.severity === 'medium'
                        ? '中等'
                        : '轻微'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-surface-600">
                    第 {conflict.position + 1} 首
                  </td>
                  <td className="py-3 px-4 text-surface-600 text-sm">
                    {conflict.triggeredBy}
                  </td>
                  <td className="py-3 px-4">
                    {conflict.resolution ? (
                      <span className="flex items-center gap-1 text-success-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        已处理
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-danger-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        待处理
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
