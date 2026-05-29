import { Card, Button, message } from 'antd';
import { Calculator, FileText, GitCompare, History, PlayCircle, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { sampleLoanInfo, sampleRateAdjustments, samplePenaltyRule } from '@/utils/sampleData';
import { generateRepaymentSchedule } from '@/utils/calculator';

export default function Home() {
  const navigate = useNavigate();
  const {
    loanInfo,
    prepaymentResults,
    setLoanInfo,
    setRepaymentSchedule,
    setPenaltyRule,
    setRateAdjustments,
  } = useAppStore();

  const loadSampleData = () => {
    setLoanInfo(sampleLoanInfo);
    setRateAdjustments(sampleRateAdjustments);
    const schedule = generateRepaymentSchedule(sampleLoanInfo, sampleRateAdjustments);
    setRepaymentSchedule(schedule);
    setPenaltyRule(samplePenaltyRule);
    message.success('示例数据已加载，包含150万贷款、360期等额本息还款计划');
  };

  const quickActions = [
    {
      title: '录入贷款信息',
      description: '从贷款合同录入基础信息、还款计划、利率调整',
      icon: FileText,
      path: '/loan-info',
      color: 'bg-blue-500',
    },
    {
      title: '提前还款试算',
      description: '输入提前还款参数，自动计算利息节省和违约金',
      icon: Calculator,
      path: '/calculator',
      color: 'bg-amber-500',
      disabled: !loanInfo,
    },
    {
      title: '方案对比',
      description: '对比多个提前还款方案，找出最优选择',
      icon: GitCompare,
      path: '/compare',
      color: 'bg-emerald-500',
      disabled: prepaymentResults.length < 1,
    },
    {
      title: '历史记录',
      description: '查看所有试算历史和数据修改痕迹',
      icon: History,
      path: '/history',
      color: 'bg-slate-600',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">房贷提前还款试算分析工具</h1>
        <p className="text-slate-500">
          帮助客户经理快速准确计算提前还款方案，统一计算口径，保留数据来源和修正痕迹
        </p>
        {!loanInfo && (
          <Button
            type="primary"
            icon={<Database size={16} />}
            onClick={loadSampleData}
            className="mt-4"
          >
            加载示例数据快速体验
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {quickActions.map((action) => (
          <Card
            key={action.path}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => !action.disabled && navigate(action.path)}
          >
            <div className="flex items-start gap-4">
              <div className={`${action.color} p-3 rounded-lg text-white ${action.disabled ? 'opacity-50' : ''}`}>
                <action.icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{action.title}</h3>
                <p className="text-sm text-slate-500">{action.description}</p>
                {action.disabled && (
                  <p className="text-xs text-amber-600 mt-2">请先完成贷款信息录入</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <h3 className="font-semibold text-blue-800 mb-3">核心功能</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 等额本息/等额本金重算
            </li>
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 智能违约金计算窗口
            </li>
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 多方案并排对比
            </li>
          </ul>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <h3 className="font-semibold text-amber-800 mb-3">风险提示</h3>
          <ul className="space-y-2 text-sm text-amber-700">
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 利率重定价日临近提醒
            </li>
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 部分还款期数变化标注
            </li>
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 宽限期内误算警告
            </li>
          </ul>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <h3 className="font-semibold text-emerald-800 mb-3">数据追溯</h3>
          <ul className="space-y-2 text-sm text-emerald-700">
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 每条数据标记来源
            </li>
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 人工修正全程留痕
            </li>
            <li className="flex items-center gap-2">
              <PlayCircle size={14} /> 历史版本可回溯
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
