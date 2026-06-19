import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/api';
import { TaskCard } from './components/TaskCard';
import { ExceptionFilter } from './components/ExceptionFilter';
import { ExceptionTable } from './components/ExceptionTable';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle2, Clock, Database, ShieldAlert } from 'lucide-react';
import type { ExceptionRecord, ReplayTask } from '@/types';

export const TaskListPage: React.FC = () => {
  const { state, dispatch, setSelectedTaskId, toggleExceptionStatus } = useApp();
  const navigate = useNavigate();
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    api.getTasks().then((tasks) => {
      dispatch({ type: 'SET_TASKS', payload: tasks });
      if (tasks.length > 0) {
        setSelectedTaskId(tasks[0].id);
      }
    });
  }, [dispatch, setSelectedTaskId]);

  useEffect(() => {
    setRecordsLoading(true);
    api
      .getExceptions(state.selectedTaskId || undefined, state.filters)
      .then((records) => {
        dispatch({ type: 'SET_EXCEPTIONS', payload: records });
      })
      .finally(() => setRecordsLoading(false));
  }, [state.selectedTaskId, state.filters, dispatch]);

  const totalExceptions = state.tasks.reduce((acc, t) => acc + t.exceptionCount, 0);
  const totalReviewed = state.tasks.reduce((acc, t) => acc + t.reviewedCount, 0);
  const highRisk = state.exceptions.filter((e) => e.severity === 'high').length;
  const pendingCount = state.exceptions.filter((e) => e.status === 'pending').length;

  const handleReview = (r: ExceptionRecord) => {
    toggleExceptionStatus(r.id, 'reviewing');
    navigate(`/task/${r.taskId}/record/${r.id}`);
  };

  const currentTask = state.tasks.find((t) => t.id === state.selectedTaskId);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-3 no-print flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-900">重放任务控制台</h2>
          {currentTask && (
            <>
              <span className="text-gray-300">/</span>
              <Tag tone="primary" className="!text-xs">
                <span className="font-mono mr-1">{currentTask.id}</span>
                {currentTask.name}
              </Tag>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<FileSpreadsheet className="w-4 h-4" />}>
            导出列表
          </Button>
          <Button variant="primary" icon={<Upload className="w-4 h-4" />}>
            导入重放日志
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 flex-shrink-0 border-r border-gray-200">
          <ExceptionFilter />
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <StatCard
                label="总任务数"
                value={state.tasks.length}
                subValue="当前运行中 2 个"
                icon={<Database className="w-5 h-5" />}
                tone="primary"
              />
              <StatCard
                label="异常记录总数"
                value={totalExceptions}
                subValue={`已复核 ${totalReviewed} 条`}
                icon={<AlertTriangle className="w-5 h-5" />}
                tone="amber"
              />
              <StatCard
                label="高风险待处理"
                value={highRisk}
                subValue="建议优先处理"
                icon={<ShieldAlert className="w-5 h-5" />}
                tone="rose"
              />
              <StatCard
                label="待人工确认"
                value={pendingCount}
                subValue="列表筛选待处理"
                icon={<Clock className="w-5 h-5" />}
                tone="default"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  任务列表 · 点击卡片切换上下文
                </h3>
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span>共</span>
                  <span className="font-mono font-bold text-gray-800 mx-0.5">{state.tasks.length}</span>
                  <span>个任务</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {state.tasks.map((task: ReplayTask) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={state.selectedTaskId === task.id}
                    onSelect={setSelectedTaskId}
                    onView={() => {
                      setSelectedTaskId(task.id);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-800">异常记录详情</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>匹配</span>
                  <span className="font-mono font-bold text-gray-800 mx-0.5">{state.exceptions.length}</span>
                  <span>条</span>
                </div>
              </div>
              <div className="text-[11px] text-gray-400 font-mono">
                提示: 点击表格行进入详情，或使用右侧"复核"按钮
              </div>
            </div>
            <ExceptionTable
              records={state.exceptions}
              loading={recordsLoading}
              onReview={handleReview}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
