import { Activity, AlertTriangle, AlertCircle, Download, Save, Clock, Zap, BatteryFull } from 'lucide-react';
import { useCalcStore } from '../store/useCalcStore';
import { DRONE_SPECS, BATTERY_SPECS } from '../types';
import { saveRecord, downloadCSV, exportToCSV } from '../utils';
import type { CalcRecord } from '../types';

interface EnergyBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
  sourceLine: string;
}

function EnergyBar({ label, value, total, color, sourceLine }: EnergyBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-300">
          {value.toFixed(1)} Wh ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-slate-600 mt-0.5">来源: {sourceLine}</p>
    </div>
  );
}

interface WarningCardProps {
  type: string;
  severity: string;
  message: string;
  sourceLine: string;
}

function WarningCard({ type, severity, message, sourceLine }: WarningCardProps) {
  const isError = severity === 'error';
  
  return (
    <div className={`p-3 rounded-lg border ${isError ? 'bg-red-900/20 border-red-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
      <div className="flex items-start gap-2">
        {isError ? (
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className={`text-sm ${isError ? 'text-red-300' : 'text-amber-300'}`}>
            {message}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            来源行号: <code className="bg-slate-800 px-1 rounded">{sourceLine}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DetailPanel() {
  const { params, result, loadRecords } = useCalcStore();
  const drone = DRONE_SPECS.find(d => d.id === params.droneId) || DRONE_SPECS[0];
  const battery = BATTERY_SPECS.find(b => b.id === params.batteryId) || BATTERY_SPECS[0];

  const availableEnergy = battery.capacityWh * battery.dischargeEfficiency;
  const energyUsedPercent = (result.totalEnergyNeeded / availableEnergy) * 100;
  const batteryRemainingPercent = Math.max(0, (result.remainingEnergy / availableEnergy) * 100);

  const handleSave = () => {
    const record = saveRecord(params, result, params.sourceRef);
    loadRecords();
    alert(`记录已保存!\nID: ${record.id}\n时间: ${new Date(record.timestamp).toLocaleString('zh-CN')}`);
  };

  const handleExport = () => {
    const csv = exportToCSV(params, result, drone, battery, params.sourceRef);
    downloadCSV(csv, `无人机续航试算_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border-l border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            续航明细
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition-colors text-white"
              title="保存记录"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-white"
              title="导出CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <BatteryFull className="w-4 h-4" />
            电池状态
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {result.totalEnergyNeeded.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500">所需能耗 (Wh)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold font-mono ${result.remainingEnergy < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {result.remainingEnergy.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500">剩余电量 (Wh)</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  energyUsedPercent > 90 ? 'bg-red-500' : energyUsedPercent > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(energyUsedPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>已用 {energyUsedPercent.toFixed(1)}%</span>
              <span>剩余 {batteryRemainingPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            飞行时间
          </h3>
          <div className="text-center">
            <div className="text-3xl font-bold font-mono text-cyan-400">
              {result.flightTime.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500">预计飞行时长 (分钟)</div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-lg font-mono text-slate-400">
              有效航程: <span className="text-cyan-400">{result.effectiveRange.toFixed(0)} m</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            能耗明细
          </h3>
          
          <EnergyBar
            label="悬停能耗"
            value={result.breakdown.hoverEnergy}
            total={result.totalEnergyNeeded}
            color="#00D4FF"
            sourceLine="drone.hoverPower × hoverTime"
          />
          <EnergyBar
            label="爬升能耗"
            value={result.breakdown.climbEnergy}
            total={result.totalEnergyNeeded}
            color="#22d3ee"
            sourceLine="drone.hoverPower × 1.5 × climbTime"
          />
          <EnergyBar
            label="前飞能耗(去程)"
            value={result.breakdown.cruiseOutEnergy}
            total={result.totalEnergyNeeded}
            color="#06b6d4"
            sourceLine="cruisePower × outTime × windFactor"
          />
          <EnergyBar
            label="前飞能耗(回程)"
            value={result.breakdown.cruiseBackEnergy}
            total={result.totalEnergyNeeded}
            color="#0891b2"
            sourceLine="cruisePower × backTime × windFactor"
          />
          
          {result.breakdown.windPenalty > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <EnergyBar
                label="逆风附加能耗"
                value={result.breakdown.windPenalty}
                total={result.totalEnergyNeeded}
                color="#FF9500"
                sourceLine="windFactor差异造成的额外消耗"
              />
            </div>
          )}
          
          {result.breakdown.payloadPenalty > 0 && (
            <EnergyBar
              label="载重附加能耗"
              value={result.breakdown.payloadPenalty}
              total={result.totalEnergyNeeded}
              color="#FF6B6B"
              sourceLine="weightRatio > 1 造成的额外消耗"
            />
          )}
          
          <div className="mt-2 pt-2 border-t border-slate-700">
            <EnergyBar
              label="返航余量"
              value={result.reserveEnergy}
              total={result.totalEnergyNeeded}
              color="#10b981"
              sourceLine="totalEnergy × returnReserveRatio"
            />
          </div>
        </div>

        {result.warnings.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              风险提示 ({result.warnings.length})
            </h3>
            <div className="space-y-2">
              {result.warnings.map((w) => (
                <WarningCard
                  key={w.id}
                  type={w.type}
                  severity={w.severity}
                  message={w.message}
                  sourceLine={w.sourceLine}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">数据来源</h3>
          <div className="space-y-1 text-xs text-slate-500">
            <p>无人机参数来源: {drone.sourceRef}</p>
            <p>电池参数来源: {battery.sourceRef}</p>
            <p>现场数据来源: {params.sourceRef}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
