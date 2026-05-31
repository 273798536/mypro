import { motion } from 'framer-motion';
import { Truck as TruckIcon, Clock, AlertTriangle, Tag, User } from 'lucide-react';
import { Truck, DecisionType } from '@/types';
import { ruleEngine } from '@/engine/ruleEngine';

interface TruckCardProps {
  truck: Truck;
  isSelected?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  showDecision?: DecisionType;
}

export default function TruckCard({
  truck,
  isSelected = false,
  isActive = false,
  onClick,
  showDecision,
}: TruckCardProps) {
  const isOvertime = truck.shiftRecord.isOvertime;
  const isAppointmentOverdue = ruleEngine.checkAppointmentOverdue(truck);

  const getDecisionColor = (decision?: DecisionType) => {
    switch (decision) {
      case 'release':
        return 'bg-port-green text-white';
      case 'detain':
        return 'bg-port-red text-white';
      case 'transfer':
        return 'bg-port-yellow text-port-dark';
      default:
        return '';
    }
  };

  const getDecisionLabel = (decision?: DecisionType) => {
    switch (decision) {
      case 'release':
        return '已放行';
      case 'detain':
        return '已暂扣';
      case 'transfer':
        return '已转场';
      default:
        return '';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected ? 'border-port-blue bg-port-blue/5' : 'border-gray-200 bg-white'}
        ${isActive ? 'ring-2 ring-port-yellow ring-offset-2' : ''}
        ${isOvertime || isAppointmentOverdue ? 'border-port-red/50' : ''}
        hover:shadow-lg
      `}
    >
      {showDecision && (
        <div
          className={`absolute -top-2 -right-2 px-2 py-1 rounded text-xs font-bold ${getDecisionColor(showDecision)}`}
        >
          {getDecisionLabel(showDecision)}
        </div>
      )}

      {isOvertime && (
        <div className="absolute -top-2 -left-2 px-2 py-1 rounded text-xs font-bold bg-port-red text-white flex items-center gap-1">
          <AlertTriangle size={12} />
          超时
        </div>
      )}

      {isAppointmentOverdue && (
        <div className="absolute top-6 -left-2 px-2 py-1 rounded text-xs font-bold bg-port-yellow text-port-dark flex items-center gap-1">
          <Clock size={12} />
          过号
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <TruckIcon size={20} className="text-port-blue" />
        <span className="font-bold text-lg">{truck.plateNumber}</span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
          v{truck.currentVersion}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <User size={14} />
          <span>{truck.driverName}</span>
          <span className="text-gray-400">|</span>
          <span>{truck.shiftRecord.shiftType}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Tag size={14} />
          <span>{truck.appointmentNo}</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="text-sm text-gray-700 line-clamp-2">{truck.currentRemark}</p>
      </div>

      {truck.versionHistory.length > 1 && (
        <div className="mt-2 text-xs text-gray-400">
          历史版本: {truck.versionHistory.length} 条
        </div>
      )}
    </motion.div>
  );
}
