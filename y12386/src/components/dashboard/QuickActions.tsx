import { useNavigate } from 'react-router-dom';
import { ListChecks, FileUp, FileDown, Music, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '@/store/useAppStore';

const QuickActions = () => {
  const navigate = useNavigate();
  const { getStatistics, exportBatches } = useAppStore();
  const stats = getStatistics();

  const actions = [
    {
      icon: ListChecks,
      label: '开始核对',
      description: `还有 ${stats.pending} 项待核对`,
      onClick: () => navigate('/check'),
      color: 'from-amber-gold-600 to-amber-gold-400',
      delay: 0.1,
    },
    {
      icon: FileUp,
      label: '导入样例',
      description: '批量导入乐器、运输、日程数据',
      onClick: () => navigate('/import'),
      color: 'from-blue-600 to-blue-400',
      delay: 0.2,
    },
    {
      icon: FileDown,
      label: '导出清单',
      description: `已导出 ${exportBatches.length} 次`,
      onClick: () => navigate('/export'),
      color: 'from-success-green to-emerald-400',
      delay: 0.3,
    },
    {
      icon: TrendingUp,
      label: '数据统计',
      description: '查看详细统计分析',
      onClick: () => navigate('/check'),
      color: 'from-purple-600 to-purple-400',
      delay: 0.4,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: action.delay }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className="card p-5 text-left group"
          >
            <div className={`w-12 h-12 rounded-btn bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-medium text-midnight-100 mb-1 group-hover:text-amber-gold-400 transition-colors">
              {action.label}
            </h4>
            <p className="text-sm text-midnight-400">{action.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
};

export default QuickActions;
