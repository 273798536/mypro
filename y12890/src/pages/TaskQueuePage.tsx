import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { TaskCard } from '../components/TaskCard';
import { QualityCard } from '../components/QualityCard';
import { useTaskStore } from '../store/useTaskStore';
import { TaskStatus } from '../types/common';
import { Fish, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

export const TaskQueuePage: React.FC = () => {
  const { tasks, qualitySummary, loadTasks } = useTaskStore();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  return (
    <AppLayout
      title="任务队列"
      subtitle="明珠海珍品养殖场 · 水下机器人数据处理中心"
    >
      <div className="space-y-6">
        {qualitySummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <QualityCard
              title="数据质量评分"
              value={qualitySummary.qualityScore}
              unit="/100"
              description="基于完整性、一致性、准确性三个维度加权计算的综合质量指数"
              type="score"
              delay={0}
            />
            <QualityCard
              title="空值记录"
              value={qualitySummary.nullCount}
              unit="条"
              description="存在字段缺失的记录数，可通过插值补全或人工补充"
              type="null"
              delay={100}
            />
            <QualityCard
              title="重复记录"
              value={qualitySummary.duplicateCount}
              unit="条"
              description="时间和数值完全相同的重复上报，已自动去重标记"
              type="duplicate"
              delay={200}
            />
            <QualityCard
              title="单位混用"
              value={qualitySummary.unitMismatchCount}
              unit="处"
              description="盐度或潮位单位不统一的记录，已自动转换并标记"
              type="unit"
              delay={300}
            />
            <QualityCard
              title="时区异常"
              value={qualitySummary.timezoneIssueCount}
              unit="处"
              description="记录时区与标准时区不符，已校正并保留原始记录"
              type="timezone"
              delay={400}
            />
          </div>
        )}

        <div className="bg-gradient-to-r from-ocean-900 to-ocean-800 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Fish className="w-6 h-6 text-tide-400" />
                <span className="text-tide-400 text-sm font-medium">系统提示</span>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">
                欢迎回来，陈场长
              </h2>
              <p className="text-ocean-200 max-w-2xl leading-relaxed">
                本次任务队列共处理 <span className="text-tide-400 font-bold">4</span> 个巡检任务，
                发现 <span className="text-status-pending font-bold">{qualitySummary?.nullCount || 0}</span> 条空值记录、
                <span className="text-status-review font-bold"> {qualitySummary?.unitMismatchCount || 0}</span> 处单位混用、
                <span className="text-status-pending font-bold"> {qualitySummary?.timezoneIssueCount || 0}</span> 处时区异常。
                所有异常均已自动分类并给出处理建议，请按顺序复核。
              </p>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-5xl font-display font-bold text-tide-400">
                {qualitySummary?.qualityScore || 0}
              </div>
              <div className="text-sm text-ocean-300">综合质量分</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-status-available" />
                <span className="text-sm text-ocean-200">可用数据</span>
              </div>
              <div className="text-2xl font-bold text-white">{qualitySummary?.statusBreakdown?.available || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-status-pending" />
                <span className="text-sm text-ocean-200">暂缓处理</span>
              </div>
              <div className="text-2xl font-bold text-white">{qualitySummary?.statusBreakdown?.pending || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-status-review" />
                <span className="text-sm text-ocean-200">需您复核</span>
              </div>
              <div className="text-2xl font-bold text-white">{qualitySummary?.statusBreakdown?.need_review || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-status-recollect" />
                <span className="text-sm text-ocean-200">建议重采</span>
              </div>
              <div className="text-2xl font-bold text-white">{qualitySummary?.statusBreakdown?.recollect || 0}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold text-slate-900">待处理任务</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              <option value="all">全部状态</option>
              <option value={TaskStatus.UPLOADED}>待处理</option>
              <option value={TaskStatus.QUALITY_CHECKED}>已质检</option>
              <option value={TaskStatus.TIDE_CALCULATED}>已计算</option>
              <option value={TaskStatus.REVIEWED}>已复核</option>
              <option value={TaskStatus.EXPORTED}>已导出</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredTasks.map((task, index) => (
            <div key={task.id}>
              <TaskCard task={task} delay={index * 100} />
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <Fish className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无符合条件的任务</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
