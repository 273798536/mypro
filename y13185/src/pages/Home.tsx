import { motion } from 'framer-motion';
import {
  Upload,
  Calculator,
  AlertTriangle,
  History,
  FileText,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Wrench,
  Shield,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useExperimentStore } from '@/store/useExperimentStore';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const experiments = useExperimentStore(state => state.experiments);
  const results = useExperimentStore(state => state.results);
  const suspendRecords = useExperimentStore(state => state.suspendRecords);
  const operationLogs = useExperimentStore(state => state.operationLogs);
  const getPendingSuspends = useExperimentStore(state => state.getPendingSuspends);

  const pendingSuspends = getPendingSuspends();
  const hasACenModifications = operationLogs.some(
    log => log.operator.includes('阿岑') || log.operator.includes('岑')
  );

  const features = [
    {
      icon: Upload,
      title: '智能数据导入',
      description: '支持 Excel/CSV 文件，自动识别"维修备注"等同义词变体，保留字段来源和处理状态',
      color: 'bg-green-50 text-green-600',
      link: '/import',
    },
    {
      icon: Calculator,
      title: '精确复算引擎',
      description: '完整的风洞实验计算公式，参数档位调节，边界样本敏感性分析，清晰展示结果变化原因',
      color: 'bg-blue-50 text-blue-600',
      link: '/calculator',
    },
    {
      icon: FileText,
      title: '统一标注系统',
      description: '场景标注、侧边说明、截图说明保持一致，避免三套话，支持同步/独立双模式',
      color: 'bg-purple-50 text-purple-600',
      link: '/calculator',
    },
    {
      icon: AlertTriangle,
      title: '异常智能挂起',
      description: '方向符号写反时自动挂起，宁可让项目经理确认，也不给假稳定结论',
      color: 'bg-red-50 text-red-600',
      link: '/exceptions',
    },
    {
      icon: History,
      title: '完整历史记录',
      description: '阿岑的临时修改完整保留，下一班同事可以看到变更前后对比，不只看最终结果',
      color: 'bg-orange-50 text-orange-600',
      link: '/history',
    },
    {
      icon: FileText,
      title: '专业报告导出',
      description: 'PDF/Excel 双格式，包含公式、单位、边界样本分析，满足复盘会议需求',
      color: 'bg-teal-50 text-teal-600',
      link: '/report',
    },
  ];

  const stats = [
    { label: '实验记录', value: experiments.length, icon: Upload },
    { label: '计算结果', value: results.length, icon: Calculator },
    { label: '待处理异常', value: pendingSuspends.length, icon: AlertTriangle },
    { label: '操作日志', value: operationLogs.length, icon: History },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-[#0F3460] via-[#1a4a7a] to-[#0F3460] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <StatusBadge status="success" className="mb-4 bg-white/20 text-white border-white/30">
            航空航天实验数据复算系统
          </StatusBadge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            风洞烟线实验复算
          </h1>
          <p className="text-blue-100 text-lg mb-6">
            专业的航空航天实验数据复算、校验和报告生成工具。
            确保数据准确性，保留完整追溯链，让复盘会议更高效。
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => navigate(experiments.length > 0 ? '/calculator' : '/import')}
              className="bg-white text-[#0F3460] hover:bg-blue-50"
            >
              {experiments.length > 0 ? '开始复算' : '导入数据'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/guide')}
              className="border-white/30 text-white hover:bg-white/10"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              使用指南
            </Button>
          </div>
        </div>
      </motion.div>

      {pendingSuspends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[#E94560] rounded-2xl p-6 text-white"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">存在待处理异常</h3>
              <p className="text-white/80 mb-4">
                检测到 {pendingSuspends.length} 条记录存在方向符号异常，已自动挂起等待项目经理确认。
                请先处理异常后再继续复算，避免得出假稳定结论。
              </p>
              <Button
                onClick={() => navigate('/exceptions')}
                className="bg-white text-[#E94560] hover:bg-red-50"
                size="sm"
              >
                立即处理
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {hasACenModifications && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wrench className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-800 mb-1">阿岑的修改记录</h3>
              <p className="text-orange-700 mb-4">
                系统检测到维修师傅阿岑有临时修改记录，这些修改已完整保留在历史中，
                下一班同事可以查看变更前后的数据对比。
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/history')}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                size="sm"
              >
                查看历史
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index + 0.3 }}
            >
              <Card className="h-full">
                <div className="p-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">核心功能</h2>
            <p className="text-gray-500 mt-1">六大特性，让风洞实验复算更专业、更高效</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index + 0.5 }}
              >
                <Card
                  className="h-full cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(feature.link)}
                >
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {feature.description}
                    </p>
                    <div className="flex items-center text-blue-600 text-sm font-medium">
                      了解更多
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-8">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">设计原则</h2>
          <p className="text-gray-500">每一个功能都围绕航空航天实验的实际需求设计</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">数据可追溯</h3>
            <p className="text-sm text-gray-500">
              字段来源、处理状态、操作历史完整记录，每一个数据都有据可查
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">结果可解释</h3>
            <p className="text-sm text-gray-500">
              公式、单位、边界样本影响清晰展示，让复盘时能看懂"为什么结果变化"
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">异常零容忍</h3>
            <p className="text-sm text-gray-500">
              方向符号异常自动挂起，宁可等待确认，也不输出假稳定结论
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#16C79A] to-[#0f9e7a] rounded-2xl p-8 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">准备好开始了吗？</h2>
          <p className="text-white/80 mb-6">
            {experiments.length > 0
              ? `已导入 ${experiments.length} 条实验记录，立即开始复算吧！`
              : '上传您的第一份实验数据文件，开启专业的风洞实验复算体验'}
          </p>
          <Button
            onClick={() => navigate(experiments.length > 0 ? '/calculator' : '/import')}
            className="bg-white text-[#16C79A] hover:bg-green-50"
          >
            {experiments.length > 0 ? '开始复算' : '导入数据'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
