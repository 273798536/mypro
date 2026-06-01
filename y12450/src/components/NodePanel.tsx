import { useState } from 'react';
import { RailwayNode, Coupon } from '../types';
import { useGameStore } from '../store/gameStore';
import { format } from 'date-fns';

interface NodePanelProps {
  node: RailwayNode | undefined;
  coupon: Coupon | null | undefined;
}

const NodePanel = ({ node, coupon }: NodePanelProps) => {
  const processNode = useGameStore(state => state.processNode);
  const putOptions = useGameStore(state => state.putOptions);
  const defaultEvents = useGameStore(state => state.defaultEvents);
  const bonds = useGameStore(state => state.bonds);

  const [acknowledgeDeferral, setAcknowledgeDeferral] = useState(false);
  const [putChoice, setPutChoice] = useState<boolean | undefined>();
  const [defaultJudgement, setDefaultJudgement] = useState<string>('');

  if (!node) return <div className="text-gray-400">请选择一个节点</div>;

  const bond = bonds[0];
  const putOption = node.putId ? putOptions.find(p => p.id === node.putId) : null;
  const defaultEvent = node.defaultId ? defaultEvents.find(d => d.id === node.defaultId) : null;

  const handleProcess = () => {
    let playerChoice: Record<string, unknown> = {};

    if (node.type === 'coupon_station' && coupon?.isDeferred) {
      playerChoice = { acknowledgeDeferral };
    } else if (node.type === 'put_junction') {
      playerChoice = { exercise: putChoice };
    } else if (node.type === 'default_trap') {
      playerChoice = { judgement: defaultJudgement };
    }

    processNode(node.id, playerChoice);
    
    setAcknowledgeDeferral(false);
    setPutChoice(undefined);
    setDefaultJudgement('');
  };

  const canProcess = node.status === 'pending' || node.status === 'active';

  const getTypeLabel = (type: RailwayNode['type']) => {
    const labels: Record<string, string> = {
      bond_start: '债券发行',
      coupon_station: '票息支付',
      put_junction: '回售选择',
      default_trap: '违约判定',
      destination: '到期兑付'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: RailwayNode['status']) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      active: '进行中',
      completed: '已完成',
      failed: '失败',
      skipped: '已跳过'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">{node.name}</h3>
          <p className="text-gray-400 text-sm">{getTypeLabel(node.type)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          node.status === 'completed' ? 'bg-rail-success/20 text-rail-success' :
          node.status === 'failed' ? 'bg-rail-danger/20 text-rail-danger' :
          node.status === 'active' ? 'bg-rail-info/20 text-rail-info' :
          'bg-gray-600/20 text-gray-400'
        }`}>
          {getStatusLabel(node.status)}
        </span>
      </div>

      {node.type === 'bond_start' && bond && (
        <div className="bg-rail-accent/50 rounded-lg p-4 space-y-3">
          <h4 className="text-white font-medium">债券信息</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">债券名称</p>
              <p className="text-white">{bond.name}</p>
            </div>
            <div>
              <p className="text-gray-400">债券代码</p>
              <p className="text-white">{bond.code}</p>
            </div>
            <div>
              <p className="text-gray-400">发行日期</p>
              <p className="text-white">{format(bond.issueDate, 'yyyy-MM-dd')}</p>
            </div>
            <div>
              <p className="text-gray-400">到期日期</p>
              <p className="text-white">{format(bond.maturityDate, 'yyyy-MM-dd')}</p>
            </div>
            <div>
              <p className="text-gray-400">票面利率</p>
              <p className="text-white">{bond.couponRate}%</p>
            </div>
            <div>
              <p className="text-gray-400">付息频率</p>
              <p className="text-white">每年{bond.couponFrequency}次</p>
            </div>
          </div>
        </div>
      )}

      {node.type === 'coupon_station' && coupon && (
        <div className="space-y-4">
          <div className="bg-rail-accent/50 rounded-lg p-4 space-y-3">
            <h4 className="text-white font-medium">票息信息</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">期数</p>
                <p className="text-white">第{coupon.period}期</p>
              </div>
              <div>
                <p className="text-gray-400">支付金额</p>
                <p className="text-white">{(coupon.amount / 10000).toFixed(2)} 万元</p>
              </div>
              <div>
                <p className="text-gray-400">应支付日期</p>
                <p className="text-white">{format(coupon.paymentDate, 'yyyy-MM-dd')}</p>
              </div>
              <div>
                <p className="text-gray-400">状态</p>
                <p className={`${coupon.isDeferred ? 'text-rail-warning' : 'text-rail-success'}`}>
                  {coupon.isDeferred ? '需顺延' : '正常支付'}
                </p>
              </div>
            </div>
            {coupon.isDeferred && (
              <div className="mt-4 p-3 bg-rail-warning/10 border border-rail-warning/30 rounded-lg">
                <p className="text-rail-warning text-sm">
                  ⚠️ {coupon.deferralReason}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  顺延至: {coupon.deferredTo ? format(coupon.deferredTo, 'yyyy-MM-dd') : '-'}
                </p>
              </div>
            )}
          </div>

          {coupon.isDeferred && canProcess && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="acknowledge"
                checked={acknowledgeDeferral}
                onChange={(e) => setAcknowledgeDeferral(e.target.checked)}
                className="w-5 h-5 rounded border-gray-500"
              />
              <label htmlFor="acknowledge" className="text-gray-300 text-sm">
                我已确认该期票息需要顺延
              </label>
            </div>
          )}
        </div>
      )}

      {node.type === 'put_junction' && putOption && (
        <div className="space-y-4">
          <div className="bg-rail-accent/50 rounded-lg p-4 space-y-3">
            <h4 className="text-white font-medium">回售选择权信息</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">行权日期</p>
                <p className="text-white">{format(putOption.exerciseDate, 'yyyy-MM-dd')}</p>
              </div>
              <div>
                <p className="text-gray-400">行权价格</p>
                <p className="text-white">{putOption.strikePrice} 元/张</p>
              </div>
            </div>
          </div>

          {canProcess && (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">请做出你的选择：</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setPutChoice(true)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    putChoice === true
                      ? 'border-rail-info bg-rail-info/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <p className="text-white font-medium">行使回售权</p>
                  <p className="text-gray-400 text-sm">到期前赎回本金</p>
                </button>
                <button
                  onClick={() => setPutChoice(false)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    putChoice === false
                      ? 'border-rail-info bg-rail-info/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <p className="text-white font-medium">继续持有</p>
                  <p className="text-gray-400 text-sm">持有至到期</p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {node.type === 'default_trap' && defaultEvent && (
        <div className="space-y-4">
          <div className="bg-rail-danger/20 border border-rail-danger/30 rounded-lg p-4 space-y-3">
            <h4 className="text-rail-danger font-medium">⚠️ 信用事件</h4>
            <div className="text-sm space-y-2">
              <div>
                <p className="text-gray-400">事件类型</p>
                <p className="text-white">{defaultEvent.eventType === 'coupon_miss' ? '票息未支付' : defaultEvent.eventType}</p>
              </div>
              <div>
                <p className="text-gray-400">事件日期</p>
                <p className="text-white">{format(defaultEvent.eventDate, 'yyyy-MM-dd')}</p>
              </div>
              <div>
                <p className="text-gray-400">严重程度</p>
                <span className={`px-2 py-1 rounded text-xs bg-rail-danger/30 text-rail-danger`}>
                  {defaultEvent.severity === 'severe' ? '严重' : defaultEvent.severity === 'mild' ? '轻度' : '警告'}
                </span>
              </div>
              <div>
                <p className="text-gray-400">事件描述</p>
                <p className="text-white">{defaultEvent.description}</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-rail-bg/50 rounded">
              <p className="text-gray-400 text-sm">影响明细：</p>
              <ul className="text-gray-300 text-sm mt-1 space-y-1">
                {defaultEvent.impactDetails.map((detail, i) => (
                <li key={i}>• {detail}</li>
              ))}
              </ul>
            </div>
          </div>

          {canProcess && (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">你的判断：</p>
              <div className="flex gap-4">
                <button
                onClick={() => setDefaultJudgement('normal')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  defaultJudgement === 'normal'
                    ? 'border-rail-danger bg-rail-danger/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <p className="text-white font-medium">正常运营</p>
                <p className="text-gray-400 text-sm">不构成违约</p>
              </button>
              <button
                onClick={() => setDefaultJudgement('default')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  defaultJudgement === 'default'
                    ? 'border-rail-danger bg-rail-danger/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <p className="text-white font-medium">实质性违约</p>
                <p className="text-gray-400 text-sm">启动违约处置</p>
              </button>
            </div>
          )}
        </div>
      )}

      {node.type === 'destination' && bond && (
        <div className="bg-rail-success/20 border border-rail-success/30 rounded-lg p-4 space-y-3">
          <h4 className="text-rail-success font-medium">🏁 到期兑付</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">兑付日期</p>
              <p className="text-white">{format(bond.maturityDate, 'yyyy-MM-dd')}</p>
            </div>
            <div>
              <p className="text-gray-400">兑付金额</p>
              <p className="text-white">{(bond.faceValue / 10000).toFixed(0)} 万元</p>
            </div>
          </div>
          </div>
        </div>
      )}

      {node.error && (
        <div className="bg-rail-danger/20 border border-rail-danger/30 rounded-lg p-4">
          <h4 className="text-rail-danger font-medium mb-2">❌ 处理错误</h4>
          <p className="text-white text-sm mb-2">{node.error.message}</p>
          <div className="text-gray-400 text-sm space-y-1">
            <p>触发者: {node.error.triggeredBy}</p>
            <p>卡点: {node.error.blockedStep}</p>
            <p className="text-rail-warning">下一步: {node.error.nextAction}</p>
          </div>
        </div>
      )}

      {canProcess && (
        <div className="flex justify-end">
          <button
          onClick={handleProcess}
          disabled={
            (node.type === 'coupon_station' && coupon?.isDeferred && !acknowledgeDeferral) ||
            (node.type === 'put_junction' && putChoice === undefined) ||
            (node.type === 'default_trap' && !defaultJudgement)
            ? true
            : false
          }
          className="px-6 py-2 bg-rail-info text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rail-info/80"
        >
          处理节点
        </button>
      </div>
    )}
    </div>
  );
};

export default NodePanel;
