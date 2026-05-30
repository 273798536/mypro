import React, { useState } from 'react';
import { AlertTriangle, Zap, HelpCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { verifierContacts } from '../utils/mockData';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, icon, iconColor = 'text-orange-400' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className={cn('px-6 py-4 border-b border-slate-700 flex items-center gap-3', iconColor.replace('text-', 'bg-').replace('400', '500/10'))}>
          <div className={cn('p-2 rounded-lg', iconColor.replace('text-', 'bg-').replace('400', '400/20'))}>
            {icon}
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const PriceJumpModal: React.FC = () => {
  const { showPriceJumpModal, currentPriceJump, confirmPriceJump, position } = useGameStore();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = (accept: boolean) => {
    setIsVerifying(true);
    setTimeout(() => {
      confirmPriceJump(accept);
      setIsVerifying(false);
    }, 800);
  };

  if (!currentPriceJump?.jumpBranch) return null;

  return (
    <Modal
      isOpen={showPriceJumpModal}
      title="检测到价格异常跳变"
      icon={<AlertTriangle className="w-6 h-6" />}
      iconColor="text-orange-400"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
            <div className="text-xs text-orange-400 mb-1">预言机报价</div>
            <div className="text-xl font-bold text-orange-300 font-mono">
              ${currentPriceJump.price.toFixed(2)}
            </div>
            <div className="text-xs text-orange-400/70 mt-1">
              {(((currentPriceJump.price - currentPriceJump.jumpBranch.alternativePrice) / currentPriceJump.jumpBranch.alternativePrice) * 100).toFixed(1)}% 异常波动
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="text-xs text-emerald-400 mb-1">验证参考价</div>
            <div className="text-xl font-bold text-emerald-300 font-mono">
              ${currentPriceJump.jumpBranch.alternativePrice.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-400/70 mt-1">
              来自 {currentPriceJump.jumpBranch.verifier}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-300">
              <p className="mb-1">当前抵押率: <span className={position.currentRatio <= position.liquidationThreshold ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{position.currentRatio.toFixed(1)}%</span></p>
              <p className="text-slate-400 text-xs">
                {verifierContacts[currentPriceJump.jumpBranch.verifier] || '请联系相关方进行核实'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleConfirm(true)}
            disabled={isVerifying}
            className="px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            接受报价
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={isVerifying}
            className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            拒绝异常价
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const RepeatedLiqModal: React.FC = () => {
  const { showRepeatedLiqModal, currentLiquidationEvent, handleRepeatedLiquidation } = useGameStore();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = (verify: boolean) => {
    setIsVerifying(true);
    setTimeout(() => {
      handleRepeatedLiquidation(verify);
      setIsVerifying(false);
    }, 800);
  };

  return (
    <Modal
      isOpen={showRepeatedLiqModal}
      title="检测到重复清算"
      icon={<Zap className="w-6 h-6" />}
      iconColor="text-red-400"
    >
      <div className="space-y-4">
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">风险警告</span>
          </div>
          <p className="text-sm text-red-200">
            该仓位可能已被清算过，再次执行清算将导致双重惩罚。
          </p>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-300">
              <p className="font-medium text-slate-200 mb-1">核实指引</p>
              <p className="text-slate-400 text-xs">
                {verifierContacts['协议方核实']}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleVerify(true)}
            disabled={isVerifying}
            className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            核实并取消
          </button>
          <button
            onClick={() => handleVerify(false)}
            disabled={isVerifying}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            不核实，执行
          </button>
        </div>

        <p className="text-xs text-center text-slate-500">
          不核实将扣除额外 40 分惩罚
        </p>
      </div>
    </Modal>
  );
};

export const GasModal: React.FC = () => {
  const { showGasModal, currentLiquidationEvent, handleGasIssue } = useGameStore();
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = (resolve: boolean) => {
    setIsResolving(true);
    setTimeout(() => {
      handleGasIssue(resolve);
      setIsResolving(false);
    }, 800);
  };

  return (
    <Modal
      isOpen={showGasModal}
      title="Gas 费用不足"
      icon={<Zap className="w-6 h-6" />}
      iconColor="text-yellow-400"
    >
      <div className="space-y-4">
        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">交易可能失败</span>
          </div>
          <p className="text-sm text-yellow-200">
            当前 Gas 费用不足以支付清算交易，需要调整 Gas 价格或补充资金。
          </p>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-300">
              <p className="font-medium text-slate-200 mb-1">处理指引</p>
              <p className="text-slate-400 text-xs">
                {verifierContacts['钱包方核实']}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleResolve(true)}
            disabled={isResolving}
            className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            解决Gas问题
          </button>
          <button
            onClick={() => handleResolve(false)}
            disabled={isResolving}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            忽略，继续
          </button>
        </div>

        <p className="text-xs text-center text-slate-500">
          忽略将扣除额外 25 分惩罚
        </p>
      </div>
    </Modal>
  );
};
