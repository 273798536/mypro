import { useState } from 'react';
import { Play, CheckCircle, ChevronRight, Terminal, Database, FileText, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function DemoGuide() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);

  const steps = [
    {
      title: '初始化数据库',
      description: '创建数据库表结构和索引',
      command: 'npm run db:init',
      icon: Database
    },
    {
      title: '导入示例数据',
      description: '导入批次、单据、面料追踪等示例数据',
      command: 'npm run db:seed',
      icon: FileText
    },
    {
      title: '启动开发服务',
      description: '同时启动前端和后端服务',
      command: 'npm run dev',
      icon: Play
    },
    {
      title: '触发坏数据场景',
      description: '模拟数据异常和任务失败',
      command: 'npm run demo:bad-data',
      icon: RefreshCw
    },
    {
      title: '人工修正数据',
      description: '在任务监控页面处理异常',
      command: '界面操作',
      icon: CheckCircle
    },
    {
      title: '生成汇总报告',
      description: '生成包含冻结前后对比的报告',
      command: 'npm run demo:generate-report',
      icon: FileSpreadsheet
    }
  ];

  const markComplete = (index: number) => {
    if (!completedSteps.includes(index)) {
      setCompletedSteps([...completedSteps, index]);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">演示流程指南</h1>
        <p className="text-slate-500 mt-1">按照以下步骤完整演示系统的核心功能</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(index);
          const isNext = completedSteps.length === index;

          return (
            <div
              key={index}
              className={`relative p-6 border-b border-slate-100 last:border-b-0 ${
                isNext ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isNext
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">
                      步骤 {index + 1}：{step.title}
                    </h3>
                    {isCompleted && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        已完成
                      </span>
                    )}
                    {isNext && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        当前步骤
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{step.description}</p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-slate-900 px-4 py-2 rounded font-mono text-sm text-green-400 flex items-center gap-2">
                      <Terminal size={14} />
                      {step.command}
                    </div>
                    {isNext && (
                      <button
                        onClick={() => markComplete(index)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <ChevronRight size={16} />
                        标记完成
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="absolute left-8 top-16 w-0.5 h-6 bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-2">功能演示要点</h2>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white bg-opacity-10 rounded p-4">
            <h3 className="font-semibold mb-2">📋 重复数据处理</h3>
            <p className="text-sm text-blue-100">
              创建批次时可选择忽略、覆盖、追加策略，处理同批数据跑两次的场景
            </p>
          </div>
          <div className="bg-white bg-opacity-10 rounded p-4">
            <h3 className="font-semibold mb-2">🧵 面料去向追踪</h3>
            <p className="text-sm text-blue-100">
              同一款多轮修改后，旧版面料去向明确记录（退回/报废/留用）
            </p>
          </div>
          <div className="bg-white bg-opacity-10 rounded p-4">
            <h3 className="font-semibold mb-2">🔄 任务失败分类</h3>
            <p className="text-sm text-blue-100">
              异步任务区分等重试、等人工、永久失败，支持恢复后继续处理
            </p>
          </div>
          <div className="bg-white bg-opacity-10 rounded p-4">
            <h3 className="font-semibold mb-2">📊 审计追踪</h3>
            <p className="text-sm text-blue-100">
              完整记录谁在什么时候改了什么，支持字段级差异对比
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
