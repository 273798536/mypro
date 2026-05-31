import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileInput,
  AlertTriangle,
  CheckSquare,
  Calculator,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Flame,
  DollarSign,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCalculationStore } from '../store/useCalculationStore';
import { formatDate, formatWithUnit } from '../utils/formatters';
import { UNITS, STATUS_LABELS } from '../utils/constants';

export default function Dashboard() {
  const { calculations, currentCalculation, setCurrentCalculation } = useCalculationStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 bg-emerald-50';
      case 'ready':
        return 'text-blue-600 bg-blue-50';
      case 'conflict_pending':
        return 'text-amber-600 bg-amber-50';
      case 'validation_failed':
        return 'text-red-600 bg-red-50';
      case 'calculating':
        return 'text-indigo-600 bg-indigo-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'ready':
        return <CheckSquare className="w-4 h-4" />;
      case 'conflict_pending':
        return <AlertTriangle className="w-4 h-4" />;
      case 'validation_failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'calculating':
        return <Clock className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const quickActions = [
    {
      title: '新建计算',
      description: '开始新的热桥损耗分析',
      icon: FileInput,
      path: '/data-input',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: '检测冲突',
      description: '检查构造与材料数据冲突',
      icon: AlertTriangle,
      path: '/conflicts',
      color: 'bg-amber-500 hover:bg-amber-600',
    },
    {
      title: '数据校验',
      description: '验证参数完整性',
      icon: CheckSquare,
      path: '/validation',
      color: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      title: '开始计算',
      description: '执行热桥损耗计算',
      icon: Calculator,
      path: '/calculation',
      color: 'bg-indigo-600 hover:bg-indigo-700',
    },
  ];

  const stats = [
    {
      title: '本月分析项目',
      value: calculations.length,
      icon: LayoutDashboard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '已完成计算',
      value: calculations.filter(c => c.status === 'completed').length,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: '待处理冲突',
      value: calculations.reduce((acc, c) => acc + c.conflicts.filter(cf => !cf.resolved).length, 0),
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: '待修复问题',
      value: calculations.reduce((acc, c) => acc + c.validationIssues.filter(v => v.severity === 'error').length, 0),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
          <p className="text-slate-500 mt-1">建筑热桥损耗分析总览</p>
        </div>
        <Button size="lg">
          <FileInput className="w-4 h-4 mr-2" />
          新建分析
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currentCalculation?.result && (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">当前项目：{currentCalculation.name}</p>
                <div className="flex items-center gap-8 mt-4">
                  <div>
                    <p className="text-blue-200 text-xs">总热桥损耗</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatWithUnit(currentCalculation.result.totalHeatLoss, UNITS.heatFlowRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs">月度损耗估算</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Flame className="w-5 h-5" />
                      <p className="text-2xl font-bold">
                        {formatWithUnit(currentCalculation.result.monthlyEnergyConsumption.kwh, UNITS.energy)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs">月度费用估算</p>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="w-5 h-5" />
                      <p className="text-2xl font-bold">
                        ¥{currentCalculation.result.monthlyEnergyConsumption.cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Link to="/calculation">
                <Button variant="secondary" size="lg">
                  查看详情
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>快捷操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Link to={action.path} key={index}>
                    <div className={`p-4 rounded-lg ${action.color} text-white transition-transform hover:scale-105`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded">
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{action.title}</p>
                          <p className="text-xs text-white/80 mt-0.5">{action.description}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近分析项目</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {calculations.slice(0, 5).map((calc) => (
                  <div
                    key={calc.id}
                    className={`px-6 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                      currentCalculation?.id === calc.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setCurrentCalculation(calc.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{calc.name}</p>
                        <p className="text-xs text-slate-500">更新于 {formatDate(calc.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`${getStatusColor(calc.status)} flex items-center gap-1`}>
                        {getStatusIcon(calc.status)}
                        {STATUS_LABELS[calc.status]}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>工作流程</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { step: 1, title: '数据输入', desc: '录入构造和材料数据', icon: FileInput, path: '/data-input' },
                  { step: 2, title: '冲突检测', desc: '检查数据一致性', icon: AlertTriangle, path: '/conflicts' },
                  { step: 3, title: '数据校验', desc: '验证参数完整性', icon: CheckSquare, path: '/validation' },
                  { step: 4, title: '计算分析', desc: '执行热桥计算', icon: Calculator, path: '/calculation' },
                  { step: 5, title: '报告导出', desc: '生成分析报告', icon: FileSpreadsheet, path: '/reports' },
                ].map((item, index) => (
                  <Link to={item.path} key={index}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <item.icon className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>节能提示</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">热桥不容忽视</p>
                      <p className="text-xs text-emerald-700 mt-1">
                        建筑热桥损耗可占总热损失的20%-30%，准确计算有助于优化节能设计。
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">数据质量很重要</p>
                      <p className="text-xs text-blue-700 mt-1">
                        确保材料导热率参数准确，参数缺失会导致计算结果偏差。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
