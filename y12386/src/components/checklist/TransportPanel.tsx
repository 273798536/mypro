import { motion } from 'framer-motion';
import { Truck, Calendar, Package, AlertTriangle, Check, X, Shield } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { formatDate, formatDateTime } from '@/utils/dataMapper';

const TransportPanel = () => {
  const { selectedInstrumentId, getTransportByInstrumentId } = useAppStore();
  const transport = selectedInstrumentId ? getTransportByInstrumentId(selectedInstrumentId) : null;

  if (!selectedInstrumentId) {
    return (
      <div className="flex-1 flex items-center justify-center text-midnight-400 p-8">
        <div className="text-center">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">请选择一件乐器</p>
          <p className="text-sm mt-1">查看对应的运输单信息</p>
        </div>
      </div>
    );
  }

  if (!transport) {
    return (
      <div className="flex-1 flex items-center justify-center text-midnight-400 p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无运输单信息</p>
          <p className="text-sm mt-1">该乐器未关联运输单</p>
        </div>
      </div>
    );
  }

  const isInsuranceExpired = new Date(transport.insuranceExpiry) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className="mb-4">
        <h3 className="title-section flex items-center gap-2">
          <Truck className="w-4 h-4" />
          运输单信息
        </h3>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-midnight-500 mb-1">运输单号</p>
            <p className="font-mono text-midnight-100">{transport.id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            transport.status === '已到达'
              ? 'bg-success-green/20 text-success-green'
              : transport.status === '运输中'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-amber-gold-500/20 text-amber-gold-400'
          }`}>
            {transport.status === '已到达' && '已送达'}
            {transport.status === '运输中' && '运输中'}
            {transport.status === '延误' && '延误'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-midnight-500 mb-1">箱号</p>
            <p className="text-sm text-midnight-200 font-medium">{transport.boxNumber}</p>
          </div>
          <div>
            <p className="text-xs text-midnight-500 mb-1">物流公司</p>
            <p className="text-sm text-midnight-200">{transport.carrier}</p>
          </div>
          <div>
            <p className="text-xs text-midnight-500 mb-1">发货日期</p>
            <p className="text-sm text-midnight-200">{formatDate(transport.shipDate)}</p>
          </div>
          <div>
            <p className="text-xs text-midnight-500 mb-1">预计到达</p>
            <p className="text-sm text-midnight-200">{formatDate(transport.estimatedArrival)}</p>
          </div>
          {transport.actualArrival && (
            <div>
              <p className="text-xs text-midnight-500 mb-1">实际到达</p>
              <p className="text-sm text-midnight-200">{formatDate(transport.actualArrival)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-midnight-500 mb-1">件数</p>
            <p className="text-sm text-midnight-200">{transport.pieceCount} 件</p>
          </div>
        </div>

        {transport.trackingNumber && (
          <div className="mb-4 p-3 bg-midnight-700/50 rounded-btn">
            <p className="text-xs text-midnight-500 mb-1">物流跟踪号</p>
            <p className="font-mono text-amber-gold-400">{transport.trackingNumber}</p>
          </div>
        )}

        <div className={`p-3 rounded-btn border ${
          isInsuranceExpired
            ? 'bg-alert-red/10 border-alert-red/30'
            : 'bg-success-green/10 border-success-green/30'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className={`w-4 h-4 ${isInsuranceExpired ? 'text-alert-red' : 'text-success-green'}`} />
            <span className={`text-sm font-medium ${isInsuranceExpired ? 'text-alert-red' : 'text-success-green'}`}>
              {isInsuranceExpired ? '保险已过期' : '保险有效'}
            </span>
          </div>
          <p className="text-xs text-midnight-400">
            有效期至：{formatDate(transport.insuranceExpiry)}
          </p>
        </div>

        {transport.notes && (
          <div className="mt-4">
            <p className="text-xs text-midnight-500 mb-1">备注</p>
            <p className="text-sm text-midnight-300">{transport.notes}</p>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h4 className="font-medium text-midnight-100 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          箱内物品
        </h4>
        <div className="space-y-2">
          {transport.contents.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-midnight-700/30 rounded-btn"
            >
              <span className="text-sm text-midnight-200">{item.name}</span>
              <span className="text-xs text-midnight-400">x{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 card p-4">
        <h4 className="font-medium text-midnight-100 mb-3">关联信息</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">关联乐器ID</span>
            <span className="font-mono text-amber-gold-400">{transport.instrumentId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">创建时间</span>
            <span className="text-midnight-300">{formatDateTime(transport.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">更新时间</span>
            <span className="text-midnight-300">{formatDateTime(transport.updatedAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TransportPanel;
