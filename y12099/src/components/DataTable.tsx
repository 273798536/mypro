import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Lightbulb,
  AlertCircle,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { DetailRecord, ShadowSeverity } from '../data/types';

const SEVERITY_CONFIG: Record<ShadowSeverity, { label: string; color: string; icon: typeof CheckCircle }> = {
  none: { label: '无', color: 'text-green-400', icon: CheckCircle },
  low: { label: '低', color: 'text-green-400', icon: CheckCircle },
  medium: { label: '中', color: 'text-yellow-400', icon: AlertCircle },
  high: { label: '高', color: 'text-orange-400', icon: AlertTriangle },
  critical: { label: '严重', color: 'text-red-400', icon: XCircle },
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  shadow: { label: '阴影', color: 'bg-red-900/50 text-red-400 border-red-800' },
  azimuth: { label: '方位角', color: 'bg-orange-900/50 text-orange-400 border-orange-800' },
  season: { label: '季节', color: 'bg-cyan-900/50 text-cyan-400 border-cyan-800' },
};

const SEASON_LABELS: Record<string, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

export function DataTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'shadow' | 'azimuth' | 'season'>('all');

  const getDetailRecords = useAppStore((s) => s.getDetailRecords);
  const selectedDetailId = useAppStore((s) => s.selectedDetailId);
  const setSelectedDetailId = useAppStore((s) => s.setSelectedDetailId);
  const focusPanel = useAppStore((s) => s.focusPanel);
  const diagnosticResult = useAppStore((s) => s.diagnosticResult);
  const filters = useAppStore((s) => s.filters);

  const allRecords = useMemo(() => getDetailRecords(), [getDetailRecords, diagnosticResult]);

  const filteredRecords = useMemo(() => {
    let records = allRecords;

    if (activeTab !== 'all') {
      records = records.filter((r) => r.type === activeTab);
    }

    if (filters.severity !== 'all') {
      records = records.filter((r) => r.severity === filters.severity);
    }

    if (filters.season !== 'all') {
      records = records.filter((r) => r.season === filters.season || r.type === 'azimuth');
    }

    if (filters.panelId !== 'all') {
      records = records.filter((r) => r.panelId === filters.panelId);
    }

    return records;
  }, [allRecords, activeTab, filters]);

  const handleLocate = (panelId: string, recordId: string) => {
    focusPanel(panelId);
    setSelectedDetailId(recordId);
    setExpandedId(expandedId === recordId ? null : recordId);
  };

  if (!diagnosticResult) {
    return (
      <div className="h-64 bg-slate-900 border-t border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">等待分析完成</p>
          <p className="text-slate-600 text-xs mt-1">明细记录将在此显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-slate-900 border-t border-slate-700 flex flex-col">
      <div className="flex items-center px-3 py-2 border-b border-slate-700 gap-4">
        <div className="flex items-center gap-1">
          {(['all', 'shadow', 'azimuth', 'season'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded-none border transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab === 'all'
                ? `全部 (${allRecords.length})`
                : `${TYPE_LABELS[tab].label} (${allRecords.filter((r) => r.type === tab).length})`}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="text-slate-500 text-xs">
          显示 {filteredRecords.length} / {allRecords.length} 条记录
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            暂无符合筛选条件的记录
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="text-slate-400">
                <th className="text-left py-1.5 px-2 font-medium w-6"></th>
                <th className="text-left py-1.5 px-2 font-medium w-16">类型</th>
                <th className="text-left py-1.5 px-2 font-medium w-20">组件</th>
                <th className="text-left py-1.5 px-2 font-medium">描述</th>
                <th className="text-left py-1.5 px-2 font-medium w-16">严重度</th>
                <th className="text-left py-1.5 px-2 font-medium w-16">季节</th>
                <th className="text-left py-1.5 px-2 font-medium w-16">时间</th>
                <th className="text-left py-1.5 px-2 font-medium w-20">损失</th>
                <th className="text-left py-1.5 px-2 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const isExpanded = expandedId === record.id;
                const isSelected = selectedDetailId === record.id;
                const sevConfig = SEVERITY_CONFIG[record.severity];
                const SevIcon = sevConfig.icon;
                const typeConfig = TYPE_LABELS[record.type];

                return (
                  <React.Fragment key={record.id}>
                    <tr
                      className={`border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-900/30' : ''
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      <td className="py-1.5 px-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] border ${typeConfig.color}`}
                        >
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-mono text-slate-300">{record.panelId}</td>
                      <td className="py-1.5 px-2 text-slate-300">
                        <span className="font-medium">{record.title}</span>
                        <span className="text-slate-500 ml-2">{record.description}</span>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`flex items-center gap-1 ${sevConfig.color}`}>
                          <SevIcon className="w-3 h-3" />
                          {sevConfig.label}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-400">
                        {record.season ? SEASON_LABELS[record.season] : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-slate-400 font-mono">
                        {record.hour !== undefined ? `${String(record.hour).padStart(2, '0')}:00` : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-orange-400 font-mono">
                        {record.energyLossKwh.toFixed(1)} kWh
                      </td>
                      <td className="py-1.5 px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLocate(record.panelId, record.id);
                          }}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <MapPin className="w-3 h-3" />
                          定位
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-800/30">
                        <td colSpan={9} className="py-3 px-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 p-3 border border-slate-700">
                              <h5 className="text-slate-400 text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                问题详情
                              </h5>
                              <p className="text-slate-300 text-xs">{record.description}</p>
                              {record.type === 'shadow' && (
                                <p className="text-slate-500 text-[11px] mt-1">
                                  {SEASON_LABELS[record.season!]} {record.hour}:00 时段
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-900/50 p-3 border border-emerald-900/50">
                              <h5 className="text-emerald-400 text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                可操作修正建议
                              </h5>
                              <p className="text-slate-300 text-xs">{record.suggestion}</p>
                              <p className="text-emerald-400 text-[11px] mt-1 font-mono">
                                预计可挽回 {record.energyLossKwh.toFixed(1)} kWh 发电量损失
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
