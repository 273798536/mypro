import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Eye,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  Target,
  Zap,
} from 'lucide-react';
import { MOCK_TASKS, formatTaskStatus } from '@/mock/data';
import { useAnnotationStore } from '@/store/annotationStore';
import type { TaskStatus } from '@/types';

const statusColors: Record<TaskStatus, string> = {
  pending: 'badge-warning',
  in_progress: 'badge-primary',
  reviewing: 'badge-warning',
  completed: 'badge-success',
  reopened: 'badge-danger',
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock size={12} />,
  in_progress: <Play size={12} />,
  reviewing: <Eye size={12} />,
  completed: <CheckCircle size={12} />,
  reopened: <RotateCcw size={12} />,
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { loadTask, resetState } = useAnnotationStore();

  useEffect(() => {
    resetState();
  }, [resetState]);

  const handleTaskClick = async (taskId: string, status: TaskStatus) => {
    await loadTask(taskId);
    if (status === 'reviewing' || status === 'completed') {
      navigate(`/review/${taskId}`);
    } else {
      navigate(`/annotate/${taskId}`);
    }
  };

  const stats = [
    {
      label: '待处理任务',
      value: MOCK_TASKS.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
      icon: <Clock className="text-warning-500" size={24} />,
      color: 'from-warning-50 to-warning-100',
      border: 'border-warning-200',
    },
    {
      label: '复核中任务',
      value: MOCK_TASKS.filter((t) => t.status === 'reviewing').length,
      icon: <Eye className="text-primary-500" size={24} />,
      color: 'from-primary-50 to-primary-100',
      border: 'border-primary-200',
    },
    {
      label: '已完成任务',
      value: MOCK_TASKS.filter((t) => t.status === 'completed').length,
      icon: <CheckCircle className="text-success-500" size={24} />,
      color: 'from-success-50 to-success-100',
      border: 'border-success-200',
    },
    {
      label: '待确认边界案例',
      value: 3,
      icon: <AlertTriangle className="text-danger-500" size={24} />,
      color: 'from-danger-50 to-danger-100',
      border: 'border-danger-200',
    },
  ];

  const quickActions = [
    { label: '前往标注工作台', taskId: 'TASK-001', icon: <Target size={20} />, description: '调整骨架节点位置' },
    { label: '进行复核关卡', taskId: 'TASK-001', icon: <Zap size={20} />, description: '边界案例+撤销重开+结算' },
    { label: '查看数据管理', path: '/data', icon: <TrendingUp size={20} />, description: '重复运行+补录+人工确认' },
    { label: '导出报告', taskId: 'TASK-001', path: '/export/TASK-001', icon: <CheckCircle size={20} />, description: '生成非技术人员可读报告' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800 mb-1">运动姿态骨架标注系统</h1>
        <p className="text-neutral-500">专业的标注复核工具，解决评分表延迟、边界误判、重复标注等痛点</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`card card-hover bg-gradient-to-br ${stat.color} border ${stat.border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-neutral-800">{stat.value}</p>
              </div>
              <div className="p-3 bg-white rounded-sm shadow-sm">
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="card">
            <h3 className="section-title flex items-center justify-between">
              <span>标注任务列表</span>
              <span className="text-sm font-normal text-neutral-500">共 {MOCK_TASKS.length} 个任务</span>
            </h3>
            <div className="space-y-3">
              {MOCK_TASKS.map((task) => (
                <div
                  key={task.taskId}
                  onClick={() => handleTaskClick(task.taskId, task.status)}
                  className="p-4 border border-neutral-200 rounded-sm hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-primary-600 font-medium">{task.taskId}</span>
                        <span className={`badge ${statusColors[task.status]} flex items-center gap-1`}>
                          {statusIcons[task.status]}
                          {formatTaskStatus(task.status)}
                        </span>
                        {task.rerunCount > 0 && (
                          <span className="badge badge-warning flex items-center gap-1">
                            <RotateCcw size={10} />
                            重跑 {task.rerunCount} 次
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-neutral-800 mb-1 group-hover:text-primary-600 transition-colors">
                        {task.name}
                      </h4>
                      <p className="text-sm text-neutral-500 mb-3">{task.description}</p>
                      <div className="flex items-center gap-6 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {task.assignee}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          创建于 {task.createdAt}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target size={12} />
                          标注 {task.annotationCount} 点
                        </span>
                        <span className="flex items-center gap-1 text-danger-600">
                          <AlertTriangle size={12} />
                          碰撞 {task.collisionCount} 处
                        </span>
                        <span className="flex items-center gap-1 text-warning-600">
                          <AlertTriangle size={12} />
                          边界 {task.boundaryCount} 处
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-neutral-300 group-hover:text-primary-500 transition-colors" size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="section-title">快捷操作</h3>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.taskId) loadTask(action.taskId);
                    navigate(action.path || `/annotate/${action.taskId}`);
                  }}
                  className="w-full p-3 text-left border border-neutral-200 rounded-sm hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200 flex items-center gap-3 group"
                >
                  <div className="p-2 bg-primary-50 text-primary-500 rounded-sm group-hover:bg-primary-100 transition-colors">
                    {action.icon}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800 text-sm">{action.label}</p>
                    <p className="text-xs text-neutral-500">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-warning-50 to-orange-50 border-warning-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-warning-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-neutral-800 mb-1">重要提醒</h4>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  TASK-001 包含 <span className="font-semibold text-warning-600">3个待确认边界案例</span>，
                  其中 <span className="font-semibold">左膝与地面碰撞</span> 为典型边界误判，
                  需人工确认是否为误报。评分表存在延迟到达情况，已补录备注。
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">样例数据说明</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-warning-500 rounded-full mt-1.5 flex-shrink-0" />
                <span><strong>旧表数据：</strong>2023年遗留评分表，字段格式不统一</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0" />
                <span><strong>补录备注：</strong>评分表晚到，张工人工补录说明</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-danger-500 rounded-full mt-1.5 flex-shrink-0" />
                <span><strong>漏填单位：</strong>角度缺少°、距离缺少cm</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full mt-1.5 flex-shrink-0" />
                <span><strong>坏数据：</strong>第7帧右腕节点坐标异常(x=-9999)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-success-500 rounded-full mt-1.5 flex-shrink-0" />
                <span><strong>边界误判：</strong>左膝与地面距离1.2cm判定碰撞</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
