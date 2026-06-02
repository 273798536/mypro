import { motion } from 'framer-motion';
import { Music, Truck, MapPin, FileText, ArrowRight, Link2 } from 'lucide-react';
import type { Instrument, Transport, CitySchedule } from '@/store/types';

interface RelationGraphProps {
  instrument: Instrument | null;
  transport: Transport | null;
  schedule: CitySchedule | null;
}

const RelationGraph = ({ instrument, transport, schedule }: RelationGraphProps) => {
  if (!instrument) return null;

  const nodes = [
    {
      icon: Music,
      title: '乐器清单',
      subtitle: instrument?.name,
      id: instrument?.id,
      color: 'from-amber-gold-600 to-amber-gold-400',
      borderColor: 'border-amber-gold-500',
      data: instrument,
      delay: 0.1,
    },
    {
      icon: Truck,
      title: '运输单',
      subtitle: transport?.boxNumber || '未关联',
      id: transport?.id,
      color: 'from-blue-600 to-blue-400',
      borderColor: transport ? 'border-blue-500' : 'border-midnight-600',
      data: transport,
      delay: 0.2,
    },
    {
      icon: MapPin,
      title: '城市日程',
      subtitle: schedule?.city || '未关联',
      id: schedule?.id,
      color: 'from-purple-600 to-purple-400',
      borderColor: schedule ? 'border-purple-500' : 'border-midnight-600',
      data: schedule,
      delay: 0.3,
    },
    {
      icon: FileText,
      title: '导出清单',
      subtitle: '导出时关联',
      id: '-',
      color: 'from-success-green to-emerald-400',
      borderColor: 'border-success-green',
      data: null,
      delay: 0.4,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <h3 className="title-section mb-6 flex items-center gap-2">
        <Link2 className="w-4 h-4" />
        三者对应关系图
      </h3>

      <div className="flex items-center justify-between gap-2">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <motion.div
              key={node.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: node.delay }}
              className="flex-1 relative"
            >
              <div className={`card p-4 border-2 ${node.borderColor} bg-midnight-800/80`}>
                <div className={`w-12 h-12 rounded-btn bg-gradient-to-br ${node.color} flex items-center justify-center mb-3 shadow-lg mx-auto`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-medium text-midnight-100 text-center mb-1">{node.title}</h4>
                <p className="text-xs text-midnight-300 text-center truncate mb-2">{node.subtitle}</p>
                <p className="text-xs font-mono text-midnight-500 text-center">{node.id}</p>
              </div>

              {index < nodes.length - 1 && (
                <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: node.delay + 0.2 }}
                    className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center"
                  >
                    <ArrowRight className="w-3 h-3 text-white" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {(transport || schedule) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.6 }}
          className="mt-6 pt-4 border-t border-midnight-700"
        >
          <p className="text-xs text-midnight-400 mb-2">关联信息（用于后续复核）</p>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-2 bg-midnight-700/50 rounded-btn">
              <p className="text-midnight-500 mb-1">乐器清单 ID</p>
              <p className="font-mono text-amber-gold-400">{instrument.id}</p>
            </div>
            <div className="p-2 bg-midnight-700/50 rounded-btn">
              <p className="text-midnight-500 mb-1">运输单 ID</p>
              <p className="font-mono text-blue-400">{transport?.id || '-'}</p>
            </div>
            <div className="p-2 bg-midnight-700/50 rounded-btn">
              <p className="text-midnight-500 mb-1">城市日程 ID</p>
              <p className="font-mono text-purple-400">{schedule?.id || '-'}</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default RelationGraph;
