import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Music, Check, AlertTriangle, FileDown } from 'lucide-react';
import RelationGraph from '@/components/detail/RelationGraph';
import EventTimeline from '@/components/detail/EventTimeline';
import PhotoGallery from '@/components/detail/PhotoGallery';
import useAppStore from '@/store/useAppStore';
import { formatDate } from '@/utils/dataMapper';
import { getConflictCounts, getConflictsByInstrumentId } from '@/utils/conflictDetector';

const Detail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInstrumentById, getTransportByInstrumentId, getScheduleByInstrumentId, markAsChecked, exportSingleToExcel, traceRecords } = useAppStore();

  const instrument = id ? getInstrumentById(id) : null;
  const transport = id ? getTransportByInstrumentId(id) : null;
  const schedule = id ? getScheduleByInstrumentId(id) : null;

  if (!id || !instrument) {
    return (
      <div className="flex items-center justify-center h-full text-midnight-400">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">未找到该乐器</p>
          <button
            onClick={() => navigate('/check')}
            className="btn-secondary mt-4"
          >
            返回清单核对
          </button>
        </div>
      </div>
    );
  }

  const conflicts = getConflictsByInstrumentId(id, traceRecords);
  const counts = getConflictCounts(conflicts);
  const hasCritical = conflicts.some(c => c.severity === 'CRITICAL');

  const handleExport = () => {
    exportSingleToExcel(id);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/check')}
            className="w-10 h-10 rounded-btn bg-midnight-800 hover:bg-midnight-700 flex items-center justify-center text-midnight-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-midnight-100 flex items-center gap-3">
              <div className="w-10 h-10 gold-gradient rounded-btn flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              {instrument.name}
            </h1>
            <p className="text-midnight-400 mt-1">
              {instrument.owner} · {instrument.model} · 序列号 {instrument.serialNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasCritical && (
            <span className="badge-danger animate-pulse">严重异常</span>
          )}
          {conflicts.length > 0 && (
            <span className="badge-warning">{conflicts.length} 项冲突</span>
          )}
          {instrument.status === '已核对' && (
            <span className="badge-success">已核对</span>
          )}
          {instrument.status === '待核对' && conflicts.length === 0 && (
            <button
              onClick={() => markAsChecked(id)}
              className="btn-primary flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> 标记已核对
            </button>
          )}
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" /> 导出
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="card p-4">
          <p className="text-xs text-midnight-500 mb-1">乐器价值</p>
          <p className="text-xl font-bold text-amber-gold-400">¥{instrument.value.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-midnight-500 mb-1">购买日期</p>
          <p className="text-xl font-bold text-midnight-100">{formatDate(instrument.purchaseDate)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-midnight-500 mb-1">关联运输单</p>
          <p className="text-xl font-bold text-blue-400">{transport ? transport.boxNumber : '无'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-midnight-500 mb-1">演出城市</p>
          <p className="text-xl font-bold text-purple-400">{schedule ? schedule.city : '无'}</p>
        </div>
      </motion.div>

      <RelationGraph instrument={instrument} transport={transport} schedule={schedule} />

      {conflicts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 bg-alert-red/5 border border-alert-red/30"
        >
          <h4 className="font-medium text-alert-red mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            冲突检测结果（按时间先后顺序）
          </h4>
          <div className="flex flex-wrap gap-3">
            {counts.insuranceExpired > 0 && (
              <span className="px-3 py-1.5 bg-amber-gold-500/20 rounded-full text-sm text-amber-gold-400">
                1. 保险过期 ({counts.insuranceExpired}次)
              </span>
            )}
            {counts.cityMismatch > 0 && (
              <span className="px-3 py-1.5 bg-orange-500/20 rounded-full text-sm text-orange-400">
                2. 城市错配 ({counts.cityMismatch}次)
              </span>
            )}
            {counts.lateArrival > 0 && (
              <span className="px-3 py-1.5 bg-purple-500/20 rounded-full text-sm text-purple-400">
                3. 晚到 ({counts.lateArrival}次)
              </span>
            )}
            {counts.missingBox > 0 && (
              <span className="px-3 py-1.5 bg-alert-red/20 rounded-full text-sm text-alert-red">
                4. 漏箱 ({counts.missingBox}次)
              </span>
            )}
          </div>
          <p className="text-xs text-midnight-400 mt-3">
            提示：请按照时间顺序处理冲突，先处理最早发生的问题
          </p>
        </motion.div>
      )}

      <EventTimeline instrumentId={id} />

      <PhotoGallery instrumentId={id} />
    </div>
  );
};

export default Detail;
