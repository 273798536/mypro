import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, AlertTriangle, X, MapPin } from 'lucide-react';
import type { SecurityUnitType, Deployment } from '../../engine/types';
import { securityUnits } from '../../data/patrols';

interface DeploymentPanelProps {
  selectedUnitType: SecurityUnitType;
  selectedCount: number;
  onUnitTypeChange: (type: SecurityUnitType) => void;
  onCountChange: (count: number) => void;
  deployments: Deployment[];
  selectedDeploymentId: string | null;
  onRemoveDeployment: () => void;
  disabled?: boolean;
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  selectedUnitType,
  selectedCount,
  onUnitTypeChange,
  onCountChange,
  deployments,
  selectedDeploymentId,
  onRemoveDeployment,
  disabled = false
}) => {
  const totalDeployed = deployments.reduce((sum, d) => sum + d.count, 0);
  const selectedDeployment = deployments.find(d => d.id === selectedDeploymentId);

  const getUnitIcon = (type: SecurityUnitType) => {
    switch (type) {
      case 'fixed_post': return Shield;
      case 'patrol': return Users;
      case 'emergency_response': return AlertTriangle;
      default: return Shield;
    }
  };

  const getUnitColor = (type: SecurityUnitType) => {
    switch (type) {
      case 'fixed_post': return 'from-blue-500 to-blue-600';
      case 'patrol': return 'from-green-500 to-green-600';
      case 'emergency_response': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getUnitBgColor = (type: SecurityUnitType) => {
    switch (type) {
      case 'fixed_post': return 'bg-blue-500/20 border-blue-500/50';
      case 'patrol': return 'bg-green-500/20 border-green-500/50';
      case 'emergency_response': return 'bg-orange-500/20 border-orange-500/50';
      default: return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  return (
    <div className="bg-slate-800/90 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-400" />
        安保布阵
      </h3>

      {!disabled && (
        <div className="space-y-4 mb-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">选择单位类型</label>
            <div className="grid grid-cols-3 gap-2">
              {securityUnits.map(unit => {
                const Icon = getUnitIcon(unit.type);
                const isSelected = selectedUnitType === unit.type;
                return (
                  <motion.button
                    key={unit.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onUnitTypeChange(unit.type)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? getUnitBgColor(unit.type) + ' border'
                        : 'bg-slate-700/50 border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <div className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                      {unit.name}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              部署人数: <span className="text-white font-bold">{selectedCount}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCountChange(Math.max(1, selectedCount - 1))}
                disabled={selectedCount <= 1}
                className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 h-10 bg-slate-900/50 rounded-lg flex items-center justify-center">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <div
                    key={num}
                    className={`w-2 h-6 mx-0.5 rounded transition-all ${
                      num <= selectedCount
                        ? `bg-gradient-to-t ${getUnitColor(selectedUnitType)}`
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => onCountChange(Math.min(8, selectedCount + 1))}
                disabled={selectedCount >= 8}
                className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 rotate-45" />
              </button>
            </div>
          </div>

          <div className="text-center text-sm text-slate-400">
            点击地图上的位置进行部署
          </div>
        </div>
      )}

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-400">已部署单位</span>
          <span className="text-sm font-mono text-white">{totalDeployed} 人</span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {deployments.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              暂无部署
            </div>
          ) : (
            deployments.map((deployment, index) => {
              const unit = securityUnits.find(u => u.type === deployment.unitType);
              const Icon = getUnitIcon(deployment.unitType);
              const isSelected = deployment.id === selectedDeploymentId;
              
              return (
                <motion.div
                  key={deployment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getUnitColor(deployment.unitType)} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {unit?.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {deployment.count}人 · 位置({Math.round(deployment.x)}, {Math.round(deployment.y)})
                    </div>
                  </div>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDeployment();
                      }}
                      className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {selectedDeployment && (
        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="text-xs text-cyan-400 mb-1">已选中部署</div>
          <div className="text-sm text-white">
            {securityUnits.find(u => u.type === selectedDeployment.unitType)?.name} × {selectedDeployment.count}
          </div>
          <button
            onClick={onRemoveDeployment}
            className="mt-2 w-full px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded text-sm transition-colors"
          >
            撤回该部署
          </button>
        </div>
      )}
    </div>
  );
};
