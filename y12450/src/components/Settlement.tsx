import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { exportToPDF, exportToExcel, exportToTextFile } from '../utils/exportReport';
import { format } from 'date-fns';

const Settlement = () => {
  const { settlement, bonds, sources, playerName, resetGame, phase } = useGameStore();
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  const [backfillData, setBackfillData] = useState({
    eventDate: '', eventType: 'coupon_miss' as const, severity: 'severe' as const, description: '', impactDetails: '' });
  const backfillDefault = useGameStore(state => state.backfillDefault);

  const bond = bonds[0];

  if (!settlement || !bond) {
    return <div className="text-gray-400">结算数据加载中...</div>;
  }

  const handleExportPDF = () => {
    exportToPDF(settlement, bond, sources, playerName);
  };

  const handleExportExcel = () => {
    exportToExcel(settlement, bond);
  };

  const handleExportText = () => {
    exportToTextFile(settlement, bond, sources, playerName);
  };

  const handleBackfill = () => {
    if (!backfillData.eventDate || !backfillData.description) return;
    
    backfillDefault({
      bondId: bond.id,
      eventDate: new Date(backfillData.eventDate),
      eventType: backfillData.eventType,
      severity: backfillData.severity,
      description: backfillData.description,
      isResolved: false,
      impactDetails: backfillData.impactDetails.split('\n').filter(Boolean),
      sourceId: 'src-default-backfill'
    });

    setShowBackfillModal(false);
    setBackfillData({ eventDate: '', eventType: 'coupon_miss', severity: 'severe', description: '', impactDetails: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-rail-success';
      case 'failed': return 'text-rail-danger';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'skipped': return '→';
      default: return '○';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-rail-card rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">游戏结算</h2>
            <p className="text-gray-400">
              {phase === 'completed' ? '恭喜完成！' : '游戏结束'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBackfillModal(true)}
              className="px-4 py-2 bg-rail-warning/20 text-rail-warning rounded-lg font-medium hover:bg-rail-warning/30 transition-all"
            >
              补录违约事件
            </button>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-rail-info text-white rounded-lg font-medium hover:bg-rail-info/80 transition-all"
            >
              重新开始
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-rail-accent/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">票息总站数</p>
            <p className="text-2xl font-bold text-white">{settlement.totalCoupons}</p>
          </div>
          <div className="bg-rail-accent/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">成功通过</p>
            <p className="text-2xl font-bold text-rail-success">{settlement.paidCoupons}</p>
          </div>
          <div className="bg-rail-accent/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">顺延处理</p>
            <p className="text-2xl font-bold text-rail-warning">{settlement.deferredCoupons}</p>
          </div>
          <div className="bg-rail-accent/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">回售选择</p>
            <p className="text-2xl font-bold text-white">{settlement.putExercised ? '已行使' : '未行使'}</p>
          </div>
          <div className="bg-rail-accent/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">违约事件</p>
            <p className="text-2xl font-bold text-rail-danger">{settlement.defaultEvents}</p>
          </div>
          <div className="bg-rail-accent/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">最终现金流</p>
            <p className="text-2xl font-bold text-white">{(settlement.finalAmount / 10000).toFixed(2)}万</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-rail-card rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">明细记录</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {settlement.details.map((detail, index) => (
            <div
              key={detail.nodeId}
              className={`flex items-center justify-between p-3 bg-rail-accent/30 rounded-lg`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  detail.status === 'completed' ? 'bg-rail-success' :
                  detail.status === 'failed' ? 'bg-rail-danger' : 'bg-gray-600'
                }`}>
                  {getStatusIcon(detail.status)}
                </span>
                <div>
                  <p className="text-white text-sm">{detail.nodeName}</p>
                  {detail.date && (
                    <p className="text-gray-400 text-xs">{format(detail.date, 'yyyy-MM-dd')}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {detail.amount && (
                  <p className="text-white font-medium">{(detail.amount / 10000).toFixed(0)}万</p>
                )}
                {detail.error && (
                  <p className="text-rail-danger text-xs">处理错误</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

        <div className="bg-rail-card rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">导出报告</h3>
          <p className="text-gray-400 text-sm mb-4">
            导出复盘报告，包含错误分析和明细记录</p>
          <div className="space-y-3">
            <button
              onClick={handleExportPDF}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              📄 导出 PDF 报告
            </button>
            <button
              onClick={handleExportExcel}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              📊 导出 Excel 表格
            </button>
            <button
              onClick={handleExportText}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
            >
              📝 导出文本报告
            </button>
          </div>

          {settlement.errors.length > 0 && (
            <div className="mt-6 p-4 bg-rail-danger/10 border border-rail-danger/30 rounded-lg">
              <h4 className="text-rail-danger font-medium mb-2">错误分析摘要</h4>
              <div className="space-y-2 text-sm">
                {settlement.errors.some(e => e.type === 'coupon_deferral_missed') && (
                  <p className="text-white">• <span className="text-rail-warning">票息顺延错误:</span> 有票息顺延未识别错误</p>
                )}
                {settlement.errors.some(e => e.type === 'put_option_missed') && (
                  <p className="text-white">• <span className="text-rail-warning">回售漏选:</span> 未对回售选择权做出选择</p>
                )}
                {settlement.errors.some(e => e.type === 'default_misjudged') && (
                  <p className="text-white">• <span className="text-rail-warning">违约误判:</span> 对违约事件判断错误</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {showBackfillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-rail-card rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">补录违约事件</h3>
            <p className="text-gray-400 text-sm mb-4">
              补录后将标出该违约影响的明细</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">事件日期</label>
                <input
                  type="date"
                  value={backfillData.eventDate}
                  onChange={(e) => setBackfillData({ ...backfillData, eventDate: e.target.value })}
                  className="w-full px-3 py-2 bg-rail-accent border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">事件类型</label>
                <select
                  value={backfillData.eventType}
                  onChange={(e) => setBackfillData({ ...backfillData, eventType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-rail-accent border border-gray-600 rounded-lg text-white"
                >
                  <option value="coupon_miss">票息未支付</option>
                  <option value="principal_miss">本金未支付</option>
                  <option value="bankruptcy">破产</option>
                  <option value="restructuring">债务重组</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">严重程度</label>
                <select
                  value={backfillData.severity}
                  onChange={(e) => setBackfillData({ ...backfillData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 bg-rail-accent border border-gray-600 rounded-lg text-white"
                >
                  <option value="warning">警告</option>
                  <option value="mild">轻度</option>
                  <option value="severe">严重</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">事件描述</label>
                <textarea
                  value={backfillData.description}
                  onChange={(e) => setBackfillData({ ...backfillData, description: e.target.value })}
                  placeholder="请输入事件描述"
                  className="w-full px-3 py-2 bg-rail-accent border border-gray-600 rounded-lg text-white"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">影响明细（每行一条）</label>
                <textarea
                  value={backfillData.impactDetails}
                  onChange={(e) => setBackfillData({ ...backfillData, impactDetails: e.target.value })}
                  placeholder="每条影响占一行"
                  className="w-full px-3 py-2 bg-rail-accent border border-gray-600 rounded-lg text-white"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBackfillModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleBackfill}
                className="flex-1 px-4 py-2 bg-rail-danger text-white rounded-lg font-medium hover:bg-rail-danger/80 transition-all"
              >
                确认补录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlement;
