import { useState } from 'react';
import { useMissionStore } from '@/store/missionStore';
import { useSceneStore } from '@/store/sceneStore';
import { riskColors, riskLabels, statusColors, statusLabels, waterQualityLabels } from '@/utils/color';
import { formatTimestamp } from '@/utils/diff';
import type { DataStatus, WaterQuality } from '@/types';
import {
  X,
  FileSpreadsheet,
  Image,
  StickyNote,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Save,
  ArrowRight,
  ExternalLink,
  History,
  Eye,
  Target,
} from 'lucide-react';

const statusOptions: { status: DataStatus; icon: typeof CheckCircle; label: string; desc: string }[] = [
  { status: 'approved', icon: CheckCircle, label: '通过', desc: '船队可直接使用' },
  { status: 'pending', icon: Clock, label: '待确认', desc: '等待潜水教练复核' },
  { status: 'delayed', icon: AlertTriangle, label: '暂缓', desc: '数据存疑，暂缓使用' },
  { status: 'recollect', icon: RotateCcw, label: '重采', desc: '数据失效，需重新采集' },
];

const sourceIconMap = {
  excel: FileSpreadsheet,
  image: Image,
  note: StickyNote,
};

const sourceTypeLabels = {
  excel: '数据表',
  image: '图片',
  note: '备注',
};

export default function RightPanel() {
  const selectedPoint = useMissionStore((s) => s.selectedPoint);
  const selectPoint = useMissionStore((s) => s.selectPoint);
  const setSelectedPointId = useSceneStore((s) => s.setSelectedPointId);
  const updatePointStatus = useMissionStore((s) => s.updatePointStatus);
  const [remark, setRemark] = useState('');
  const [targetStatus, setTargetStatus] = useState<DataStatus>('approved');

  if (!selectedPoint) {
    return (
      <div className="w-80 flex flex-col bg-[#0a1425]/95 backdrop-blur-md border-l border-cyan-500/15 items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-cyan-500/8 flex items-center justify-center mx-auto mb-4 border border-cyan-500/15">
            <Target size={20} className="text-cyan-400/50" />
          </div>
          <p className="text-xs text-gray-400">点击 3D 场景中的采样点</p>
          <p className="text-[10px] text-gray-600 mt-1">查看数据明细与复核操作</p>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    selectPoint(null);
    setSelectedPointId(null);
  };

  const handleStatusChange = () => {
    if (selectedPoint.status === targetStatus && !remark) return;
    updatePointStatus(selectedPoint.id, targetStatus, remark || `状态变更为${statusLabels[targetStatus]}`);
    setRemark('');
  };

  return (
    <div className="w-80 flex flex-col bg-[#0a1425]/95 backdrop-blur-md border-l border-cyan-500/15 overflow-hidden">
      <div className="px-4 py-3 border-b border-cyan-500/15 flex items-center justify-between bg-gradient-to-r from-[#0d1a2d] to-transparent">
        <div>
          <h2 className="text-sm font-mono text-cyan-300 tracking-wider">{selectedPoint.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{
                backgroundColor: riskColors[selectedPoint.riskLevel] + '20',
                color: riskColors[selectedPoint.riskLevel],
                border: `1px solid ${riskColors[selectedPoint.riskLevel]}30`,
              }}
            >
              {riskLabels[selectedPoint.riskLevel]}风险
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{
                backgroundColor: statusColors[selectedPoint.status] + '20',
                color: statusColors[selectedPoint.status],
                border: `1px solid ${statusColors[selectedPoint.status]}30`,
              }}
            >
              {statusLabels[selectedPoint.status]}
            </span>
          </div>
        </div>
        <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Section title="数据可用性">
          <div className="grid grid-cols-3 gap-1.5">
            <AvailCard label="可用" active={selectedPoint.available} color="#2ED573" desc="直接使用" />
            <AvailCard label="暂缓" active={selectedPoint.delayed} color="#FFD166" desc="待复核" />
            <AvailCard label="重采" active={selectedPoint.recollect} color="#FF6B35" desc="需重测" />
          </div>
        </Section>

        <Section title="水质参数" icon={<Eye size={10} />}>
          <div className="bg-[#0d1a2d] rounded-lg border border-cyan-500/10 overflow-hidden">
            {(Object.entries(selectedPoint.waterQuality) as [keyof WaterQuality, number][]).map(([key, value], i) => (
              <div
                key={key}
                className={`flex items-center justify-between px-2.5 py-1.5 ${
                  i > 0 ? 'border-t border-cyan-500/5' : ''
                }`}
              >
                <span className="text-[10px] text-gray-400">{waterQualityLabels[key]}</span>
                <span className="text-xs font-mono text-cyan-300">{value}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="位置坐标">
          <div className="bg-[#0d1a2d] rounded-lg p-2.5 border border-cyan-500/10">
            <div className="grid grid-cols-3 gap-2 text-center">
              <CoordItem label="X" value={selectedPoint.position.x.toFixed(1)} />
              <CoordItem label="Y" value={selectedPoint.position.y.toFixed(1)} />
              <CoordItem label="深度" value={`${selectedPoint.position.depth.toFixed(1)}m`} />
            </div>
          </div>
        </Section>

        <Section title="来源追溯" icon={<History size={10} />}>
          <div className="space-y-1.5">
            {selectedPoint.sources.map((src) => {
              const Icon = sourceIconMap[src.type];
              return (
                <div
                  key={src.id}
                  className="bg-[#0d1a2d] rounded-lg p-2.5 border border-cyan-500/10 hover:border-cyan-500/25 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: statusColors.pending + '15' }}
                    >
                      <Icon size={12} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {sourceTypeLabels[src.type]}
                        </span>
                        <button
                          className="text-[9px] text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                          title="跳转至来源"
                        >
                          <ExternalLink size={8} />
                          查看
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-300 truncate mt-0.5">{src.fileName}</p>
                      {src.rowNumber !== undefined && (
                        <p className="text-[9px] text-gray-500 mt-0.5">
                          行号 <span className="text-cyan-400 font-mono">#{src.rowNumber}</span>
                        </p>
                      )}
                      {src.remark && (
                        <p className="text-[9px] text-gray-500 mt-0.5 italic">&ldquo;{src.remark}&rdquo;</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {selectedPoint.reviewLogs.length > 0 && (
          <Section title="复核留痕" icon={<Clock size={10} />}>
            <div className="relative pl-3 space-y-2">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gradient-to-b from-cyan-500/40 to-transparent" />
              {selectedPoint.reviewLogs.map((log, idx) => (
                <div key={log.id} className="relative">
                  <div
                    className="absolute -left-2.5 top-1.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusColors[log.afterStatus] }}
                  />
                  <div className="bg-[#0d1a2d] rounded-lg p-2.5 border border-cyan-500/10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] text-gray-500 font-mono">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-[10px] text-cyan-400">{log.operator}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <StatusTag mini status={log.beforeStatus} />
                      <ArrowRight size={10} className="text-gray-500" />
                      <StatusTag mini status={log.afterStatus} />
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{log.remark}</p>
                    {log.diff && Object.keys(log.diff).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-cyan-500/10">
                        <p className="text-[9px] text-gray-500 mb-1">数据修正：</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(log.diff).map(([key, val]) => (
                            <span
                              key={key}
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                            >
                              {waterQualityLabels[key as keyof WaterQuality]?.split(' ')[0]}: {val as number}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="人工修正">
          <div className="space-y-2">
            <p className="text-[9px] text-gray-500">选择目标状态，提交后将记录复核留痕</p>
            <div className="grid grid-cols-2 gap-1.5">
              {statusOptions.map(({ status, icon: Icon, label, desc }) => (
                <button
                  key={status}
                  onClick={() => setTargetStatus(status)}
                  className={`text-left p-2 rounded-lg border transition-all ${
                    targetStatus === status ? '' : 'bg-[#0d1a2d] border-transparent hover:border-cyan-500/15'
                  }`}
                  style={
                    targetStatus === status
                      ? {
                          backgroundColor: statusColors[status] + '12',
                          borderColor: statusColors[status] + '40',
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon
                      size={10}
                      style={{ color: targetStatus === status ? statusColors[status] : '#666' }}
                    />
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: targetStatus === status ? statusColors[status] : '#888' }}
                    >
                      {label}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">{desc}</p>
                </button>
              ))}
            </div>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="输入修正备注（必填，记入复核留痕）..."
              rows={2}
              className="w-full px-2.5 py-2 bg-[#0d1a2d] border border-cyan-500/15 rounded-lg text-[11px] text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-400/40"
            />
            <button
              onClick={handleStatusChange}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-400/15 hover:from-cyan-500/30 hover:to-cyan-400/25 border border-cyan-400/30 rounded-lg text-xs text-cyan-200 transition-all font-medium"
            >
              <Save size={12} />
              提交修正
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        {icon && <span className="text-cyan-500/60">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

function AvailCard({
  label,
  active,
  color,
  desc,
}: {
  label: string;
  active: boolean;
  color: string;
  desc: string;
}) {
  return (
    <div
      className={`rounded-lg p-2 text-center border transition-all ${
        active ? '' : 'opacity-40'
      }`}
      style={{
        backgroundColor: active ? color + '10' : '#0d1a2d',
        borderColor: active ? color + '30' : 'transparent',
      }}
    >
      <p className="text-xs font-bold" style={{ color }}>
        {label}
      </p>
      <p className="text-[9px] text-gray-500 mt-0.5">{desc}</p>
    </div>
  );
}

function CoordItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-gray-500">{label}</p>
      <p className="text-xs font-mono text-cyan-300">{value}</p>
    </div>
  );
}

function StatusTag({ status, mini }: { status: DataStatus; mini?: boolean }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded font-mono ${mini ? 'text-[9px]' : 'text-[10px]'}`}
      style={{
        backgroundColor: statusColors[status] + '20',
        color: statusColors[status],
        border: `1px solid ${statusColors[status]}30`,
      }}
    >
      {statusLabels[status]}
    </span>
  );
}
