import { useState } from 'react';
import { motion } from 'framer-motion';
import { ListChecks, Filter, Truck, MapPin, Info, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import InstrumentList from '@/components/checklist/InstrumentList';
import TransportPanel from '@/components/checklist/TransportPanel';
import SchedulePanel from '@/components/checklist/SchedulePanel';
import useAppStore from '@/store/useAppStore';

type TabType = 'transport' | 'schedule';

const Checklist = () => {
  const [activeTab, setActiveTab] = useState<TabType>('transport');
  const { filterStatus, setFilterStatus, getStatistics } = useAppStore();
  const stats = getStatistics();

  const filters = [
    { key: 'ALL', label: '全部', icon: Info, count: stats.total },
    { key: 'CONFLICT', label: '有冲突', icon: AlertTriangle, count: stats.hasConflict },
    { key: 'PENDING', label: '待核对', icon: Clock, count: stats.pending },
    { key: 'CHECKED', label: '已核对', icon: CheckCircle, count: stats.checked },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-0">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-midnight-100 flex items-center gap-3">
            <div className="w-10 h-10 gold-gradient rounded-btn flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-white" />
            </div>
            清单核对工作台
          </h1>
        </div>
        <p className="text-midnight-400 mt-1">
          选择乐器查看运输单和城市日程，三者核对一目了然
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-4 overflow-x-auto pb-2"
      >
        <Filter className="w-4 h-4 text-midnight-400 flex-shrink-0" />
        {filters.map((f) => {
          const Icon = f.icon;
          const isActive = filterStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'gold-gradient text-white shadow-lg'
                  : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {f.label}
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                isActive ? 'bg-white/20' : 'bg-midnight-700'
              }`}>
                {f.count}
              </span>
            </button>
          );
        })}
      </motion.div>

      <div className="flex-1 flex gap-4 min-h-0">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-[360px] flex-shrink-0 flex flex-col min-h-0"
        >
          <div className="card p-3 mb-3 flex items-center justify-between">
            <h3 className="title-section mb-0">乐器清单</h3>
            <span className="text-xs text-midnight-400">共 {stats.total} 件</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <InstrumentList />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('transport')}
              className={`flex-1 card p-3 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'transport'
                  ? 'ring-2 ring-amber-gold-500 bg-midnight-700'
                  : 'card-hover'
              }`}
            >
              <Truck className={`w-4 h-4 ${
                activeTab === 'transport' ? 'text-amber-gold-400' : 'text-midnight-400'
              }`} />
              <span className={activeTab === 'transport' ? 'text-midnight-100' : 'text-midnight-300'}>
                运输单
              </span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 card p-3 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'schedule'
                  ? 'ring-2 ring-amber-gold-500 bg-midnight-700'
                  : 'card-hover'
              }`}
            >
              <MapPin className={`w-4 h-4 ${
                activeTab === 'schedule' ? 'text-amber-gold-400' : 'text-midnight-400'
              }`} />
              <span className={activeTab === 'schedule' ? 'text-midnight-100' : 'text-midnight-300'}>
                城市日程
              </span>
            </button>
          </div>

          <div className="flex-1 card overflow-hidden min-h-0">
            {activeTab === 'transport' && <TransportPanel />}
            {activeTab === 'schedule' && <SchedulePanel />}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checklist;
