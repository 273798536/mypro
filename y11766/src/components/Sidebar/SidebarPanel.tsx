import { useState } from 'react';
import { Wallet, Users, DollarSign, AlertTriangle, FileText, X, CheckCircle2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataStore } from '../../store/useDataStore';
import { formatCurrency, RISK_SEVERITY_COLORS } from '../../utils/colorUtils';
import { RISK_TYPE_LABELS } from '../../services/riskDetection';
import type { SidebarTab } from '../../types';
import dayjs from 'dayjs';

const tabConfig: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { id: 'holdings', label: '持仓', icon: <Wallet size={18} /> },
  { id: 'redemptions', label: '赎回', icon: <Users size={18} /> },
  { id: 'cash', label: '现金', icon: <DollarSign size={18} /> },
  { id: 'risks', label: '风险', icon: <AlertTriangle size={18} /> },
];

const liquidityLabels = {
  HIGH: '高流动性',
  MEDIUM: '中流动性',
  LOW: '低流动性',
};

const statusLabels = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
};

export function SidebarPanel() {
  const {
    sidebarTab,
    setSidebarTab,
    holdings,
    redemptions,
    cashPositions,
    riskAlerts,
    selectBlock,
    selectedBlockId,
    applyCorrection,
    resolveRisk,
    correctionTraces,
  } = useDataStore();

  const [editingRecord, setEditingRecord] = useState<{
    type: 'HOLDING' | 'REDEMPTION' | 'CASH_POSITION';
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');

  const handleEditClick = (
    type: 'HOLDING' | 'REDEMPTION' | 'CASH_POSITION',
    id: string,
    field: string,
    currentValue: string
  ) => {
    setEditingRecord({ type, id, field });
    setEditValue(currentValue);
    setEditReason('');
  };

  const handleSaveEdit = () => {
    if (editingRecord && editReason) {
      applyCorrection({
        recordType: editingRecord.type,
        recordId: editingRecord.id,
        fieldName: editingRecord.field,
        originalValue: '',
        correctedValue: editValue,
        operator: '当前用户',
        reason: editReason,
      });
      setEditingRecord(null);
    }
  };

  const renderHoldings = () => (
    <div className="space-y-3">
      {holdings.map((holding) => (
        <motion.div
          key={holding.id}
          layoutId={`holding-${holding.id}`}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedBlockId === `holding_${holding.id}`
              ? 'bg-cyan-900/30 border-cyan-500'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
          }`}
          onClick={() => selectBlock(`holding_${holding.id}`)}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium text-white">{holding.assetName}</h4>
              <span className="text-xs text-slate-400">{holding.fundCode}</span>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                holding.liquidityLevel === 'HIGH'
                  ? 'bg-green-500/20 text-green-400'
                  : holding.liquidityLevel === 'MEDIUM'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {liquidityLabels[holding.liquidityLevel]}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-cyan-400">
              ¥{formatCurrency(holding.amount)}
            </span>
            <span className="text-xs text-slate-500">
              到期: {holding.maturityDays}天
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-mono">
              {holding.sourceFile}#L{holding.sourceLine}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick('HOLDING', holding.id, 'amount', holding.amount.toString());
              }}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <Pencil size={14} />
            </button>
          </div>
          {holding.isCorrected && (
            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> 已修正
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );

  const renderRedemptions = () => (
    <div className="space-y-3">
      {redemptions.map((redemption) => (
        <motion.div
          key={redemption.id}
          layoutId={`redemption-${redemption.id}`}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedBlockId === `redemption_${redemption.id}`
              ? 'bg-cyan-900/30 border-cyan-500'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
          }`}
          onClick={() => selectBlock(`redemption_${redemption.id}`)}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium text-white">{redemption.clientName}</h4>
              <span className="text-xs text-slate-400">{redemption.clientId}</span>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                redemption.status === 'COMPLETED'
                  ? 'bg-green-500/20 text-green-400'
                  : redemption.status === 'PROCESSING'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-slate-500/20 text-slate-400'
              }`}
            >
              {statusLabels[redemption.status]}
            </span>
          </div>
          <div className="text-lg font-bold text-rose-400 mb-2">
            ¥{formatCurrency(redemption.amount)}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>
              <span className="text-slate-500">申请日:</span>{' '}
              {dayjs(redemption.requestDate).format('MM/DD')}
            </div>
            <div>
              <span className="text-slate-500">清算日:</span>{' '}
              {dayjs(redemption.valueDate).format('MM/DD')}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-mono">
              {redemption.sourceFile}#L{redemption.sourceLine}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick('REDEMPTION', redemption.id, 'amount', redemption.amount.toString());
              }}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <Pencil size={14} />
            </button>
          </div>
          {redemption.isCorrected && (
            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> 已修正
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );

  const renderCash = () => (
    <div className="space-y-3">
      {cashPositions.map((cash) => (
        <motion.div
          key={cash.id}
          layoutId={`cash-${cash.id}`}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedBlockId === `cash_${cash.id}`
              ? 'bg-cyan-900/30 border-cyan-500'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
          }`}
          onClick={() => selectBlock(`cash_${cash.id}`)}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-medium text-white">现金头寸</h4>
            <span className="text-xs text-slate-400">
              {dayjs(cash.tradeDate).format('YYYY-MM-DD')}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">可用现金</span>
              <span className="text-green-400 font-bold">
                ¥{formatCurrency(cash.availableCash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">预留现金</span>
              <span className="text-amber-400 font-bold">
                ¥{formatCurrency(cash.reservedCash)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 to-amber-500"
                style={{
                  width: `${(cash.reservedCash / cash.availableCash) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-500 mb-2">
              预留给: {cash.reservedBy || '无'}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-mono">
                {cash.sourceFile}#L{cash.sourceLine}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick('CASH_POSITION', cash.id, 'availableCash', cash.availableCash.toString());
                }}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
          {cash.isCorrected && (
            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> 已修正
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );

  const renderRisks = () => (
    <div className="space-y-3">
      {riskAlerts.map((alert) => (
        <motion.div
          key={alert.id}
          layoutId={`risk-${alert.id}`}
          className={`p-4 rounded-xl border transition-all ${
            alert.isResolved
              ? 'bg-slate-800/30 border-slate-700 opacity-60'
              : 'bg-red-900/20 border-red-500/50'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${RISK_SEVERITY_COLORS[alert.severityLevel]}20`,
                color: RISK_SEVERITY_COLORS[alert.severityLevel],
              }}
            >
              {RISK_TYPE_LABELS[alert.riskType]}
            </span>
            {alert.isResolved ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> 已处理
              </span>
            ) : (
              <button
                onClick={() => resolveRisk(alert.id)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                标记已处理
              </button>
            )}
          </div>
          <p className="text-sm text-white mb-2">{alert.description}</p>
          <div className="text-xs text-slate-400">
            <div className="mb-1">严重度: {(alert.severity * 100).toFixed(0)}%</div>
            <div className="font-mono text-slate-500 break-all">
              来源: {alert.sourceRef}
            </div>
          </div>
        </motion.div>
      ))}
      {correctionTraces.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <FileText size={14} /> 修正痕迹
          </h4>
          <div className="space-y-2">
            {correctionTraces.slice(-5).reverse().map((trace) => (
              <div
                key={trace.id}
                className="p-2 rounded-lg bg-slate-800/50 text-xs"
              >
                <div className="flex justify-between text-slate-300">
                  <span>{trace.fieldName}</span>
                  <span className="text-slate-500">
                    {dayjs(trace.correctedAt).format('MM/DD HH:mm')}
                  </span>
                </div>
                <div className="text-slate-400 mt-1">
                  {trace.originalValue} → {trace.correctedValue}
                </div>
                <div className="text-amber-400 mt-1">{trace.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="absolute right-0 top-0 h-full w-80 z-20 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50">
        <div className="flex border-b border-slate-700">
          {tabConfig.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all ${
                sidebarTab === tab.id
                  ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={sidebarTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {sidebarTab === 'holdings' && renderHoldings()}
              {sidebarTab === 'redemptions' && renderRedemptions()}
              {sidebarTab === 'cash' && renderCash()}
              {sidebarTab === 'risks' && renderRisks()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {editingRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setEditingRecord(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 w-96 border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">修正数据</h3>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    字段: {editingRecord.field}
                  </label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    修正原因 *
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none h-24"
                    placeholder="请说明修正原因..."
                  />
                </div>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editReason}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors"
                >
                  保存修正
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
