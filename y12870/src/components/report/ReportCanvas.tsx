import { useCalcStore } from '@/store/useCalcStore';
import MapView from '@/components/map/MapView';
import { countByStatus } from '@/utils/statusClassifier';
import { CheckCircle2, AlertTriangle, Ban, FileWarning, Waves, Zap, FlaskConical, CloudRain, Gauge } from 'lucide-react';
import type { ResultItem, MissingMaterial, ResultStatus } from '@/types';
import { getSourceMaterials } from '@/utils/tideCalculator';

const CAT_ICON: Record<string, any> = {
  weather: CloudRain, salinity: FlaskConical, tide: Waves, device: Zap, energy: Gauge,
};

const STATUS_BLOCK: Record<ResultStatus, { color: string; bg: string; icon: any; zh: string }> = {
  AVAILABLE: { color: '#0E7C7B', bg: '#E6F5F4', icon: CheckCircle2, zh: '可用（直接采用）' },
  DEFERRED: { color: '#E9A23B', bg: '#FDF3E3', icon: AlertTriangle, zh: '暂缓（需复核）' },
  RECOLLECT: { color: '#D64045', bg: '#FBE7E8', icon: Ban, zh: '需重新采集' },
};

export default function ReportCanvas() {
  const projectName = useCalcStore(s => s.projectName);
  const results = useCalcStore(s => s.results);
  const missing = useCalcStore(s => s.missingMaterials);
  const tides = useCalcStore(s => s.tidalSeries);
  const harmonics = useCalcStore(s => s.harmonics);
  const devices = useCalcStore(s => s.devices);
  const count = countByStatus(results);
  const total = results.length;
  const hls = tides.filter(t => t.type).slice(0, 8);
  const reportDate = new Date().toISOString().slice(0, 10);
  const sources = getSourceMaterials(harmonics);

  return (
    <div id="report-canvas" className="min-h-screen py-10 px-6 bg-ocean-100/40">
      <div className="a4-page animate-slide-up">
        {/* 抬头 */}
        <div className="border-b-4 border-ocean-900 pb-4 mb-5">
          <div className="flex items-center justify-between text-xs text-ocean-500 mb-2">
            <div className="font-serif">MARITIME ADMINISTRATION · 海事处</div>
            <div className="tabular-nums">报告编号：HS-WET-{reportDate.replace(/-/g, '')}-01</div>
          </div>
          <h1 className="text-[22pt] font-serif font-bold text-ocean-900 tracking-wider">
            {projectName}
          </h1>
          <div className="mt-1 text-sm text-ocean-700">海浪能设备布设 · 试算报告（预评审版）</div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="text-ocean-700">编制单位：海岛运维处 &nbsp;&nbsp; 编制人：系统自动生成</div>
            <div className="tabular-nums text-ocean-700">报告日期：{reportDate}</div>
          </div>
        </div>

        {/* 状态摘要 */}
        <div className="mb-5 p-3 rounded border border-slate-200 bg-slate-50">
          <div className="font-serif text-base font-semibold text-ocean-900 mb-2.5 pb-1.5 border-b border-slate-200">
            §1 结论状态总览
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['AVAILABLE', 'DEFERRED', 'RECOLLECT'] as ResultStatus[]).map(k => {
              const s = STATUS_BLOCK[k];
              const Ico = s.icon;
              const n = count[k];
              return (
                <div key={k} className="p-2.5 rounded" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ico className="w-3.5 h-3.5" style={{ color: s.color }} />
                    <span className="text-xs font-semibold" style={{ color: s.color }}>{s.zh}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-[22pt] font-serif font-bold tabular-nums" style={{ color: s.color }}>{n}</span>
                    <span className="text-xs text-ocean-500 pb-1">项 / 共 {total} 项</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-2 rounded-full bg-slate-200 flex overflow-hidden">
            <div style={{ width: `${total ? count.AVAILABLE / total * 100 : 0}%`, background: '#0E7C7B' }} />
            <div style={{ width: `${total ? count.DEFERRED / total * 100 : 0}%`, background: '#E9A23B' }} />
            <div style={{ width: `${total ? count.RECOLLECT / total * 100 : 0}%`, background: '#D64045' }} />
          </div>
          <div className="mt-2 text-xs text-ocean-700 flex items-center justify-between">
            <span>可用率：<b className="text-status-available tabular-nums">{total ? Math.round(count.AVAILABLE / total * 100) : 0}%</b></span>
            <span>海事处审核建议：{
              count.RECOLLECT > 0 ? <b className="text-status-recollect">退回补采红色标注项</b>
              : count.DEFERRED > 0 ? <b className="text-status-deferred">复核黄色标注项后通过</b>
              : <b className="text-status-available">全部通过，可直接采用</b>
            }</span>
          </div>
        </div>

        {/* 地图区域 */}
        <div className="mb-5">
          <div className="font-serif text-base font-semibold text-ocean-900 mb-2 pb-1 border-b border-slate-200">
            §2 设备布设 · 海图视角
          </div>
          <div id="capture-map" className="rounded border border-slate-200 overflow-hidden h-[140mm]">
            <MapView />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-ocean-500 tabular-nums">
            <span>底图：OSM 海图样式 &nbsp;·&nbsp; 坐标系：WGS84 &nbsp;·&nbsp; 状态色：绿=可用 / 黄=暂缓 / 红=越界或重采</span>
            <span>共 {devices.length} 台机组</span>
          </div>
        </div>

        {/* 详细结论 */}
        <div className="mb-5">
          <div className="font-serif text-base font-semibold text-ocean-900 mb-2 pb-1 border-b border-slate-200">
            §3 分项结论与下一步
          </div>
          <div className="space-y-2">
            {results.slice(0, 8).map(r => <ResultRow key={r.id} r={r} />)}
            {results.length > 8 && <div className="text-xs text-ocean-500 italic text-center py-1">另有 {results.length - 8} 条结论详见工作台</div>}
          </div>
        </div>

        {/* 潮位摘录 */}
        {hls.length > 0 && (
          <div className="mb-5">
            <div className="font-serif text-base font-semibold text-ocean-900 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>§4 主要高/低潮位摘录</span>
              <span className="text-xs font-normal text-ocean-500">
                来源：{sources.length ? sources.map(s => `《${s}》`).join(' · ') : '-'}
              </span>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: '#0A2540', color: 'white' }}>
                  <th className="px-2.5 py-1.5 text-left font-medium w-10">序</th>
                  <th className="px-2.5 py-1.5 text-left font-medium">时间</th>
                  <th className="px-2.5 py-1.5 text-left font-medium">类型</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">潮位 (m)</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">置信度</th>
                </tr>
              </thead>
              <tbody>
                {hls.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-2.5 py-1 tabular-nums">{i + 1}</td>
                    <td className="px-2.5 py-1 tabular-nums font-mono">{t.time}</td>
                    <td className="px-2.5 py-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        t.type === 'H' ? 'bg-status-deferred-soft text-status-deferred' : 'bg-ocean-100 text-ocean-700'
                      }`}>
                        {t.type === 'H' ? '高潮 H' : '低潮 L'}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-right tabular-nums font-mono font-semibold text-ocean-900">{t.level.toFixed(3)}</td>
                    <td className="px-2.5 py-1 text-right tabular-nums">
                      <span className={`${t.confidence >= 0.85 ? 'text-status-available' : t.confidence >= 0.6 ? 'text-status-deferred' : 'text-status-recollect'} font-semibold`}>
                        {Math.round(t.confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 材料缺口 */}
        {missing.length > 0 && (
          <div className="mb-5 p-3 rounded border-2 border-dashed border-status-recollect/40 bg-status-recollect-soft/40">
            <div className="flex items-center gap-1.5 mb-2">
              <FileWarning className="w-4 h-4 text-status-recollect" />
              <span className="font-serif text-base font-semibold text-status-recollect">§5 材料缺口清单（退回原因）</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {missing.map((m, i) => {
                const s = STATUS_BLOCK[m.severity];
                return (
                  <div key={m.id} className="p-2 rounded bg-white border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-mono text-ocean-500">{i + 1}.</span>
                      <span className="font-medium text-ocean-900">{m.name}</span>
                      {m.dateRange && <span className="text-ocean-500 tabular-nums">（{m.dateRange}）</span>}
                      <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ color: s.color, background: s.bg }}>
                        {s.zh}
                      </span>
                    </div>
                    <div className="pl-5 mt-0.5 text-ocean-700">影响：{m.impact}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 签字栏 */}
        <div className="mt-8 pt-3 border-t-2 border-ocean-900">
          <div className="grid grid-cols-2 gap-10 text-xs">
            <div>
              <div className="font-semibold text-ocean-900 mb-1">编制 / 海岛运维处</div>
              <div className="h-10 border-b border-slate-400" />
              <div className="mt-1 text-ocean-500 tabular-nums">签字 / 日期：______________</div>
            </div>
            <div>
              <div className="font-semibold text-ocean-900 mb-1">复核 / 海事处</div>
              <div className="h-10 border-b border-slate-400" />
              <div className="mt-1 text-ocean-500 tabular-nums">签字 / 日期：______________</div>
            </div>
          </div>
          <div className="mt-5 text-center text-[10px] text-ocean-400 italic">
            本报告由海浪能设备试算台自动生成 · 状态色标识规则：绿=直接用 / 黄=需复核 / 红=退回补采
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ r }: { r: ResultItem }) {
  const s = STATUS_BLOCK[r.status];
  const Ico = s.icon;
  const Cati = CAT_ICON[r.category] || Waves;
  return (
    <div className="p-2.5 rounded border border-slate-200 bg-white flex items-start gap-2.5">
      <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
        <Ico className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Cati className="w-3 h-3 text-ocean-500" />
          <span className="font-medium text-ocean-900">{r.label}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ color: s.color, background: s.bg }}>{s.zh}</span>
        </div>
        <div className="text-ocean-700 mt-0.5 leading-relaxed">{r.description}</div>
        {r.nextAction && (
          <div className="mt-1 pt-1 border-t border-dashed border-slate-200 text-[11px] flex items-start gap-1">
            <span style={{ color: s.color }} className="font-semibold shrink-0">▶ 下一步：</span>
            <span className="text-ocean-900">{r.nextAction.label}</span>
          </div>
        )}
        {r.sourceRefs?.length && (
          <div className="mt-0.5 text-[10px] text-ocean-500">
            来源：{r.sourceRefs.map(s => `《${s}》`).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}
