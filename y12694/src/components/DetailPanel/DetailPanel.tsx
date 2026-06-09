import {
  Info,
  MapPin,
  Activity,
  AlertTriangle,
  FileText,
  Gauge,
  Ban,
  ArrowRightLeft,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getRegionById } from '@/data/brainRegions';
import {
  coordinateLabel,
  statusColor,
  statusLabel,
  validationTypeLabel,
} from '@/utils/validation';
import { formatTimestamp } from '@/utils/timestamp';
import { Section } from './Section';
import { RiskNotesEditor } from './RiskNotesEditor';

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/5">
      <ArrowRightLeft className="h-7 w-7 text-cyan-400/50" />
    </div>
    <h3
      className="text-sm font-bold text-slate-300"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      未选择记录
    </h3>
    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
      从右侧列表选择一条测量记录，
      <br />
      或在3D图谱中点击节点/连线查看完整明细。
    </p>
  </div>
);

export const DetailPanel = () => {
  const { records, selectedRecordId, brainRegions } = useAppStore();
  const record = records.find((r) => r.id === selectedRecordId);

  if (!record) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-[#0B1026]/70 backdrop-blur-sm">
        <EmptyState />
      </div>
    );
  }

  const from = getRegionById(record.fromRegion);
  const to = getRegionById(record.toRegion);
  const blockingIssues = record.validationIssues.filter(
    (v) => v.severity === 'error',
  );
  const warningIssues = record.validationIssues.filter(
    (v) => v.severity === 'warning',
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-[#0B1026]/70 backdrop-blur-sm">
      <div className="flex-shrink-0 border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <h2
              className="text-sm font-bold text-slate-100"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              明细解释
            </h2>
          </div>
          <span
            className="rounded px-2 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: `${statusColor[record.status]}22`,
              color: statusColor[record.status],
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {statusLabel[record.status]}
          </span>
        </div>
        <div
          className="mt-2 font-mono text-[13px] font-bold text-cyan-300"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {record.id}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="基本信息" icon={<Info className="h-3.5 w-3.5" />}>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">连接路径</span>
              <span className="text-right text-slate-200">
                <span className="font-medium text-slate-100">
                  {from?.abbr ?? record.fromRegion}
                </span>
                <span className="mx-1 text-slate-600">→</span>
                <span className="font-medium text-slate-100">
                  {to?.abbr ?? record.toRegion}
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">起点脑区</span>
              <span className="text-right text-slate-300">{from?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">终点脑区</span>
              <span className="text-right text-slate-300">{to?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">所属脑叶</span>
              <span className="text-right text-slate-300">
                {from?.lobe} → {to?.lobe}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">连接强度</span>
              <span
                className="font-mono font-bold text-cyan-300"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {(record.strength * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">记录时间</span>
              <span
                className="font-mono text-slate-300"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatTimestamp(record.timestamp)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">采集时间点</span>
              <span
                className="font-mono font-bold text-slate-200"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {record.acquisitionTime}
              </span>
            </div>
          </div>
        </Section>

        <Section
          title="坐标系"
          icon={<MapPin className="h-3.5 w-3.5" />}
          badge={record.coordinateSystem}
          badgeColor={
            record.coordinateSystem === 'MNI' ? '#34D399' : record.coordinateSystem === 'Talairach' ? '#F59E0B' : '#F87171'
          }
        >
          <div className="space-y-1.5 text-[11px]">
            <div className="text-slate-200">{coordinateLabel[record.coordinateSystem]}</div>
            {record.coordinateSystem !== 'MNI' && (
              <div className="mt-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-2 text-[10.5px] leading-relaxed text-amber-200/90">
                ⚠️ 非 MNI152 标准空间数据在组分析中可能出现配准偏差，建议确认是否完成空间标准化。
              </div>
            )}
          </div>
        </Section>

        <Section
          title="连接参数"
          icon={<Gauge className="h-3.5 w-3.5" />}
          badge={record.outOfBounds ? '越界' : undefined}
          badgeColor="#F87171"
        >
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md bg-[#0F172A]/60 px-2.5 py-2">
              <div className="text-[9px] text-slate-500">纤维束长度</div>
              <div
                className="mt-0.5 font-mono text-[12px] font-bold text-slate-200"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {record.parameters.tractLength} mm
              </div>
            </div>
            <div className="rounded-md bg-[#0F172A]/60 px-2.5 py-2">
              <div className="text-[9px] text-slate-500">FA 值</div>
              <div
                className={`mt-0.5 font-mono text-[12px] font-bold ${
                  record.parameters.faValue < 0.35 ? 'text-[#F87171]' : 'text-slate-200'
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {record.parameters.faValue.toFixed(2)}
              </div>
            </div>
            <div className="rounded-md bg-[#0F172A]/60 px-2.5 py-2">
              <div className="text-[9px] text-slate-500">MD 值</div>
              <div
                className={`mt-0.5 font-mono text-[12px] font-bold ${
                  record.parameters.mdValue > 1.2 ? 'text-[#F87171]' : 'text-slate-200'
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {record.parameters.mdValue.toFixed(2)}
              </div>
            </div>
            <div className="rounded-md bg-[#0F172A]/60 px-2.5 py-2">
              <div className="text-[9px] text-slate-500">流线数</div>
              <div
                className={`mt-0.5 font-mono text-[12px] font-bold ${
                  record.parameters.streamlineCount < 100 ? 'text-[#F87171]' : 'text-slate-200'
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {record.parameters.streamlineCount}
              </div>
            </div>
          </div>
          {record.outOfBounds && record.outOfBoundsReason && (
            <div className="mt-2.5 rounded-md border border-[#F87171]/40 bg-[#F87171]/5 p-2 text-[10.5px] leading-relaxed text-[#FCA5A5]">
              🚨 {record.outOfBoundsReason}
            </div>
          )}
        </Section>

        <Section
          title="状态判定依据"
          icon={<Activity className="h-3.5 w-3.5" />}
          badge={
            record.validationIssues.length > 0
              ? String(record.validationIssues.length)
              : undefined
          }
          badgeColor={
            blockingIssues.length > 0 ? '#F87171' : warningIssues.length > 0 ? '#F59E0B' : '#34D399'
          }
        >
          {record.validationIssues.length === 0 ? (
            <div className="rounded-md border border-emerald-400/30 bg-emerald-400/5 p-2.5 text-[11px] text-emerald-300">
              ✅ 所有校验项通过，无异常。
            </div>
          ) : (
            <div className="space-y-2">
              {blockingIssues.map((issue, idx) => (
                <div
                  key={`err-${idx}`}
                  className="rounded-md border border-[#F87171]/40 bg-[#F87171]/5 p-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Ban className="h-3 w-3 text-[#F87171]" />
                    <span
                      className="text-[10.5px] font-bold text-[#F87171]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      ERROR · {validationTypeLabel[issue.type]}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-200">
                    {issue.message}
                  </div>
                  <div className="mt-1 text-[10.5px] leading-relaxed text-slate-400">
                    {issue.detail}
                  </div>
                </div>
              ))}
              {warningIssues.map((issue, idx) => (
                <div
                  key={`warn-${idx}`}
                  className="rounded-md border border-amber-400/30 bg-amber-400/5 p-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <span
                      className="text-[10.5px] font-bold text-amber-400"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      WARNING · {validationTypeLabel[issue.type]}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-200">
                    {issue.message}
                  </div>
                  <div className="mt-1 text-[10.5px] leading-relaxed text-slate-400">
                    {issue.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="风险备注"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          badge={record.riskNotes.length > 0 ? String(record.riskNotes.length) : undefined}
          badgeColor="#F59E0B"
          defaultOpen={record.riskNotes.length > 0}
        >
          <RiskNotesEditor recordId={record.id} notes={record.riskNotes} />
        </Section>
      </div>
    </div>
  );
};
