import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Check, AlertTriangle, Clock, ShieldAlert, Package, Eye, Edit2 } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { getConflictsByInstrumentId, getConflictCounts } from '@/utils/conflictDetector';

const InstrumentList = () => {
  const navigate = useNavigate();
  const { instruments, traceRecords, selectedInstrumentId, selectInstrument, filterStatus, searchKeyword, markAsChecked } = useAppStore();

  const filteredInstruments = instruments.filter((inst) => {
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchName = inst.name.toLowerCase().includes(keyword);
      const matchOwner = inst.owner.toLowerCase().includes(keyword);
      const matchSerial = inst.serialNumber.toLowerCase().includes(keyword);
      if (!matchName && !matchOwner && !matchSerial) return false;
    }
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'CONFLICT') {
      return getConflictsByInstrumentId(inst.id, traceRecords).length > 0;
    }
    if (filterStatus === 'CHECKED') {
      return inst.status === '已核对';
    }
    if (filterStatus === 'PENDING') {
      return inst.status === '待核对';
    }
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已核对':
        return <Check className="w-4 h-4 text-success-green" />;
      case '漏箱':
        return <AlertTriangle className="w-4 h-4 text-alert-red" />;
      case '待核对':
      default:
        return <Clock className="w-4 h-4 text-amber-gold-400" />;
    }
  };

  const getStatusBadge = (status: string, conflictCount: number) => {
    if (conflictCount > 0) {
      return <span className="badge badge-danger">{conflictCount} 冲突</span>;
    }
    switch (status) {
      case '已核对':
        return <span className="badge badge-success">已核对</span>;
      case '待核对':
      default:
        return <span className="badge badge-warning">待核对</span>;
    }
  };

  if (filteredInstruments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-midnight-400 p-8">
        <div className="text-center">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无匹配的乐器</p>
          <p className="text-sm mt-1">请调整筛选条件或搜索关键词</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filteredInstruments.map((instrument, index) => {
        const conflicts = getConflictsByInstrumentId(instrument.id, traceRecords);
        const counts = getConflictCounts(conflicts);
        const isSelected = selectedInstrumentId === instrument.id;
        const hasCritical = conflicts.some(c => c.severity === 'CRITICAL');

        return (
          <motion.div
            key={instrument.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => selectInstrument(instrument.id)}
            className={`card p-4 mb-3 cursor-pointer transition-all ${
              isSelected
                ? 'ring-2 ring-amber-gold-500 bg-midnight-700/80'
                : 'card-hover'
            } ${hasCritical ? 'animate-pulse-red' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-btn flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'gold-gradient' : 'bg-midnight-700'
                }`}>
                  <Music className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-midnight-400'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-midnight-100 truncate">{instrument.name}</h4>
                    {getStatusBadge(instrument.status, conflicts.length)}
                  </div>
                  <p className="text-sm text-midnight-400 mb-2">
                    {instrument.owner} · {instrument.model}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {counts.missingBox > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-alert-red/20 rounded text-xs text-alert-red">
                        <Package className="w-3 h-3" /> 漏箱 {counts.missingBox}
                      </span>
                    )}
                    {counts.insuranceExpired > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-gold-500/20 rounded text-xs text-amber-gold-400">
                        <ShieldAlert className="w-3 h-3" /> 保险过期
                      </span>
                    )}
                    {counts.cityMismatch > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 rounded text-xs text-orange-400">
                        城市错配 {counts.cityMismatch}
                      </span>
                    )}
                    {counts.lateArrival > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-400">
                        晚到 {counts.lateArrival}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2">
                {getStatusIcon(instrument.status)}
              </div>
            </div>

            {isSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-midnight-600 flex gap-2"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/detail/${instrument.id}`);
                  }}
                  className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" /> 查看详情
                </button>
                {instrument.status !== '已核对' && conflicts.length === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsChecked(instrument.id);
                    }}
                    className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" /> 标记核对
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default InstrumentList;
