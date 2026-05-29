import { useStore } from '@/store/useStore';
import { calculateSubmergedArea, calculateCapacity } from '@/utils/waterLevel';
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  MapPin,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { ValidationResult } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function ValidationItem({ result, onDismiss }: { result: ValidationResult; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = result.type === 'error' ? AlertCircle : result.type === 'warning' ? AlertTriangle : Info;
  const colorClass =
    result.type === 'error'
      ? 'text-red-400 border-red-800/50 bg-red-950/40'
      : result.type === 'warning'
        ? 'text-yellow-400 border-yellow-800/50 bg-yellow-950/40'
        : 'text-blue-400 border-blue-800/50 bg-blue-950/40';

  return (
    <div className={`border rounded p-2 text-xs ${colorClass}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-200 break-words">{result.message}</div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-200 mt-1 flex items-center gap-1"
          >
            详情 {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              <div className="text-gray-300">
                <span className="text-gray-500">原因：</span>{result.reason}
              </div>
              <div className="text-gray-300">
                <span className="text-gray-500">建议：</span>{result.suggestion}
              </div>
              {result.affectedData && result.affectedData.length > 0 && (
                <div className="text-gray-400">
                  <span className="text-gray-500">涉及数据：</span>{result.affectedData.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-gray-300 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function DetailPanel() {
  const terrain = useStore((s) => s.terrain);
  const villages = useStore((s) => s.villages);
  const waterLevel = useStore((s) => s.waterLevel);
  const capacityCurve = useStore((s) => s.capacityCurve);
  const validationResults = useStore((s) => s.validationResults);
  const changeRecords = useStore((s) => s.changeRecords);
  const selectedVillageId = useStore((s) => s.selectedVillageId);
  const setSelectedVillageId = useStore((s) => s.setSelectedVillageId);
  const removeVillage = useStore((s) => s.removeVillage);
  const collapsed = useStore((s) => s.rightPanelCollapsed);
  const togglePanel = useStore((s) => s.toggleRightPanel);
  const [activeTab, setActiveTab] = useState<'villages' | 'capacity' | 'validation' | 'changes'>('villages');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (collapsed) {
    return (
      <div className="absolute right-0 top-0 h-full w-10 bg-gray-900/80 backdrop-blur-md flex items-center justify-center cursor-pointer border-l border-cyan-900/30 z-20"
        onClick={togglePanel}>
        <ChevronLeft className="w-4 h-4 text-cyan-400" />
      </div>
    );
  }

  const submergedArea = terrain ? calculateSubmergedArea(terrain, waterLevel) : 0;
  const capacity = terrain ? calculateCapacity(terrain, waterLevel) : 0;
  const submergedVillages = villages.filter((v) => v.elevation < waterLevel);

  const tabs = [
    { key: 'villages' as const, label: '村庄', icon: MapPin, badge: villages.length },
    { key: 'capacity' as const, label: '库容', icon: Activity },
    { key: 'validation' as const, label: '校验', icon: AlertTriangle, badge: validationResults.filter((r) => !dismissedIds.has(r.id)).length },
    { key: 'changes' as const, label: '变更', icon: FileText, badge: changeRecords.length },
  ];

  const filteredValidation = validationResults.filter((r) => !dismissedIds.has(r.id));

  const chartData = capacityCurve.map((p) => ({
    水位: p.level,
    库容: p.capacity,
  }));

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-gray-900/90 backdrop-blur-md border-l border-cyan-900/30 z-20 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-cyan-900/30">
        <h2 className="text-cyan-300 font-bold text-sm">数据明细</h2>
        <button onClick={togglePanel} className="text-gray-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 border-b border-cyan-900/30">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 text-[10px] flex flex-col items-center gap-0.5 transition-colors ${activeTab === tab.key ? 'text-cyan-300 bg-cyan-900/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-cyan-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-3 border-b border-cyan-900/30 bg-gray-800/50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-gray-500">淹没面积</div>
            <div className="text-cyan-300 font-mono text-xs font-bold">{(submergedArea / 10000).toFixed(1)}万m²</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">库容</div>
            <div className="text-cyan-300 font-mono text-xs font-bold">{capacity.toFixed(1)}万m³</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">受威胁村庄</div>
            <div className={`font-mono text-xs font-bold ${submergedVillages.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {submergedVillages.length}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'villages' && (
          <>
            {villages.map((v) => {
              const isSubmerged = v.elevation < waterLevel;
              const isSelected = v.id === selectedVillageId;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVillageId(isSelected ? null : v.id)}
                  className={`p-2 rounded border cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-900/30'
                      : 'border-gray-800 hover:border-gray-600 bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-200">{v.name}</span>
                    <div className="flex items-center gap-1">
                      {isSubmerged && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeVillage(v.id); }}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1 text-gray-400">
                    <span>高程:{v.elevation}m</span>
                    <span>人口:{v.population}</span>
                    <span>坐标:({v.x},{v.y})</span>
                  </div>
                  <div className={`mt-1 text-[10px] ${isSubmerged ? 'text-red-400' : 'text-green-400'}`}>
                    {isSubmerged ? `⚠ 低于水位${waterLevel}m，已淹没` : `✓ 高于水位${waterLevel}m`}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {activeTab === 'capacity' && (
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-[10px] text-gray-500 mb-2">库容曲线 (水位-库容关系)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="水位" tick={{ fontSize: 10, fill: '#888' }} unit="m" />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} unit="万m³" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #0F2E68', fontSize: 11 }}
                    labelFormatter={(v) => `${v}m`}
                  />
                  <Line type="monotone" dataKey="库容" stroke="#00bcd4" strokeWidth={2} dot={{ r: 3 }} />
                  <ReferenceLine
                    x={waterLevel}
                    stroke="#FF5722"
                    strokeDasharray="5 5"
                    label={{ value: `${waterLevel}m`, fontSize: 10, fill: '#FF5722' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {capacityCurve.map((p, i) => (
                <div key={i} className="flex justify-between text-[10px] px-1">
                  <span className="text-gray-500">{p.level}m</span>
                  <span className={`font-mono ${p.level <= waterLevel ? 'text-cyan-400' : 'text-gray-600'}`}>
                    {p.capacity}万m³
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-2">
            {filteredValidation.length === 0 ? (
              <div className="text-center text-gray-500 text-xs py-8">
                <Info className="w-6 h-6 mx-auto mb-2 text-green-500" />
                数据校验通过，未发现问题
              </div>
            ) : (
              filteredValidation.map((r) => (
                <ValidationItem
                  key={r.id}
                  result={r}
                  onDismiss={() => setDismissedIds((prev) => new Set(prev).add(r.id))}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="space-y-2">
            {changeRecords.length === 0 ? (
              <div className="text-center text-gray-500 text-xs py-8">
                <FileText className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                暂无变更记录
              </div>
            ) : (
              changeRecords.map((c, i) => (
                <div key={i} className="p-2 bg-yellow-950/30 border border-yellow-800/40 rounded text-xs">
                  <div className="text-yellow-300 font-medium">{c.field}</div>
                  <div className="text-gray-400 mt-1">
                    <span className="line-through text-red-400">{c.oldValue}</span>
                    {' → '}
                    <span className="text-green-400">{c.newValue}</span>
                  </div>
                  <div className="text-gray-600 text-[10px] mt-1">
                    {new Date(c.timestamp).toLocaleTimeString('zh-CN')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
