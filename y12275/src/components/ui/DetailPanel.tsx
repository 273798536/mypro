import { useMemo } from 'react';
import {
  X,
  Link2,
  FileText,
  MapPin,
  Plane,
  Clock,
  Database,
  Map,
  Route,
  ClipboardList,
  ExternalLink,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';

const sourceTypeIcons = {
  apron_model: Map,
  taxiway_data: MapPin,
  control_record: ClipboardList,
  report: FileText,
};

const sourceTypeLabels = {
  apron_model: '机坪模型',
  taxiway_data: '滑行道数据',
  control_record: '管制记录',
  report: '运行报告',
};

export function DetailPanel() {
  const {
    selectedConflictId,
    selectConflict,
    conflicts,
    gates,
    taxiways,
    focusOnGate,
    focusOnTaxiway,
    exportReport,
  } = useSandboxStore();

  const selectedConflict = useMemo(() => {
    return conflicts.find((c) => c.id === selectedConflictId);
  }, [conflicts, selectedConflictId]);

  const relatedGates = useMemo(() => {
    if (!selectedConflict) return [];
    return gates.filter((g) => selectedConflict.gateIds.includes(g.id));
  }, [selectedConflict, gates]);

  const relatedTaxiways = useMemo(() => {
    if (!selectedConflict) return [];
    return taxiways.filter((t) => selectedConflict.taxiwayIds.includes(t.id));
  }, [selectedConflict, taxiways]);

  const handleExport = () => {
    const reportData = exportReport();
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conflict-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedConflict) {
    return (
      <div className="w-80 bg-slate-900/95 border-l border-slate-700/50 flex flex-col items-center justify-center h-full">
        <div className="text-center p-6">
          <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">选择冲突项</h3>
          <p className="text-sm text-slate-500">
            点击左侧冲突列表或3D场景中的元素查看详情
          </p>
        </div>
      </div>
    );
  }

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-80 bg-slate-900/95 border-l border-slate-700/50 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{selectedConflict.title}</h2>
            <p className="text-xs text-slate-400 mt-1">ID: {selectedConflict.id}</p>
          </div>
          <button
            onClick={() => selectConflict(null)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              selectedConflict.severity === 'high'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : selectedConflict.severity === 'medium'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}
          >
            {selectedConflict.severity === 'high'
              ? '高优先级'
              : selectedConflict.severity === 'medium'
              ? '中优先级'
              : '低优先级'}
          </span>
          <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
            {selectedConflict.type === 'gate_conflict'
              ? '机位冲突'
              : selectedConflict.type === 'taxi_crossing'
              ? '滑行穿越'
              : '等待超时'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            冲突描述
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {selectedConflict.description}
          </p>
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            时间范围
          </h3>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">开始</span>
              <span className="text-cyan-400 font-mono">
                {formatTime(selectedConflict.startTime)}
              </span>
            </div>
            <div className="my-2 border-t border-slate-700 border-dashed" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">结束</span>
              <span className="text-cyan-400 font-mono">
                {formatTime(selectedConflict.endTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Plane className="w-4 h-4" />
            涉及航班
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedConflict.aircraftInvolved.map((flight) => (
              <span
                key={flight}
                className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-sm font-mono"
              >
                {flight}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            对应关系
          </h3>

          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-2">机位 ({relatedGates.length})</div>
            <div className="space-y-1">
              {relatedGates.map((gate) => (
                <button
                  key={gate.id}
                  onClick={() => focusOnGate(gate.id)}
                  className="w-full flex items-center justify-between p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        gate.status === 'conflict'
                          ? 'bg-red-500'
                          : gate.status === 'occupied'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}
                    />
                    <span className="text-sm text-white font-mono">{gate.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">滑行道 ({relatedTaxiways.length})</div>
            <div className="space-y-1">
              {relatedTaxiways.map((tw) => (
                <button
                  key={tw.id}
                  onClick={() => focusOnTaxiway(tw.id)}
                  className="w-full flex items-center justify-between p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-amber-300">{tw.name}</span>
                    <span className="text-xs text-slate-500">
                      {tw.direction === 'two-way' ? '双向' : '单向'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            数据追溯
          </h3>
          <div className="space-y-2">
            {selectedConflict.dataSources.map((source) => {
              const Icon = sourceTypeIcons[source.type];
              return (
                <a
                  key={source.id}
                  href={source.link}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-slate-700 rounded">
                    <Icon className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{source.name}</div>
                    <div className="text-xs text-slate-500">
                      {sourceTypeLabels[source.type]}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </a>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            导出冲突报告
          </button>
        </div>
      </div>
    </div>
  );
}
