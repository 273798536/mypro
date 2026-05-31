import { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { CARGO_COLORS, CARGO_LABELS } from '@/types';
import type { GravityTrackPoint } from '@/types';

function GravityTrackCanvas({ track }: { track: GravityTrackPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || track.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${w / dpr}px`;
    canvas.style.height = `${h / dpr}px`;

    ctx.clearRect(0, 0, w, h);

    const pad = 40;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;
    const centerX = pad + plotW / 2;
    const centerY = pad + plotH / 2;

    ctx.fillStyle = '#0F1B2E';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1E3A5F';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, centerY);
    ctx.lineTo(w - pad, centerY);
    ctx.moveTo(centerX, pad);
    ctx.lineTo(centerX, h - pad);
    ctx.stroke();

    ctx.fillStyle = '#4A6A8A';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('横向偏移', centerX, h - 8);
    ctx.save();
    ctx.translate(12, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('纵向偏移', 0, 0);
    ctx.restore();

    const safeZoneR = Math.min(plotW, plotH) * 0.3;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, safeZoneR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, safeZoneR * 1.8, 0, Math.PI * 2);
    ctx.stroke();

    if (track.length > 1) {
      const maxAbs = Math.max(
        ...track.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))),
        0.5
      );
      const scale = (Math.min(plotW, plotH) / 2 - 10) / maxAbs;

      ctx.strokeStyle = '#E8602C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < track.length; i++) {
        const px = centerX + track[i].x * scale;
        const py = centerY - track[i].y * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      for (let i = 0; i < track.length; i++) {
        const px = centerX + track[i].x * scale;
        const py = centerY - track[i].y * scale;
        ctx.fillStyle = i === track.length - 1 ? '#FF4444' : '#E8602C80';
        ctx.beginPath();
        ctx.arc(px, py, i === track.length - 1 ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#6A8AAA';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🟢 安全区', w - pad - 60, pad + 12);
    ctx.fillText('🔴 危险区', w - pad - 60, pad + 26);
  }, [track]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 500 * dpr;
    canvas.height = 350 * dpr;
    draw();
  }, [draw]);

  return <canvas ref={canvasRef} className="rounded-lg border border-slate-700/50" />;
}

export default function Report() {
  const navigate = useNavigate();
  const reports = useGameStore(s => s.reports);
  const latestReport = reports[reports.length - 1];

  if (!latestReport) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0A1628] text-slate-400">
        <div className="text-center">
          <p className="text-lg mb-4">暂无航行报告</p>
          <button
            onClick={() => navigate('/')}
            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            返回装载台
          </button>
        </div>
      </div>
    );
  }

  const loadedCargo = latestReport.cargoManifest.filter(c => c.loaded);

  return (
    <div className="min-h-screen bg-[#0A1628] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-['Oswald'] uppercase tracking-wider text-orange-400">
              航行报告
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              提交时间: {new Date(latestReport.submittedAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            ← 返回装载台
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase tracking-wider">安全评分</div>
            <div className={`text-3xl font-bold font-['Oswald'] mt-1 ${
              latestReport.score >= 80 ? 'text-emerald-400' : latestReport.score >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {latestReport.score}
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase tracking-wider">装载货物</div>
            <div className="text-3xl font-bold font-['Oswald'] mt-1 text-blue-400">
              {loadedCargo.length}
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase tracking-wider">总载重量</div>
            <div className="text-3xl font-bold font-['Oswald'] mt-1 text-orange-400">
              {loadedCargo.reduce((s, c) => s + c.weight, 0)}
              <span className="text-sm text-slate-400 ml-1">吨</span>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase tracking-wider">违规数</div>
            <div className={`text-3xl font-bold font-['Oswald'] mt-1 ${
              latestReport.violations.length === 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {latestReport.violations.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">装载明细表</h2>
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-2.5 text-xs text-slate-400 uppercase">货物</th>
                    <th className="text-right px-4 py-2.5 text-xs text-slate-400 uppercase">重量</th>
                    <th className="text-center px-4 py-2.5 text-xs text-slate-400 uppercase">类别</th>
                    <th className="text-center px-4 py-2.5 text-xs text-slate-400 uppercase">位置</th>
                    <th className="text-center px-4 py-2.5 text-xs text-slate-400 uppercase">受压载影响</th>
                  </tr>
                </thead>
                <tbody>
                  {loadedCargo.map(cargo => {
                    const affectedByBallast = latestReport.ballastLog.some(op =>
                      op.isRetroactive && op.affectedCargoIds.includes(cargo.id)
                    );
                    return (
                      <tr
                        key={cargo.id}
                        className={`border-b border-slate-700/30 ${affectedByBallast ? 'bg-amber-500/10' : ''}`}
                      >
                        <td className="px-4 py-2 text-slate-200">{cargo.name}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{cargo.weight}吨</td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${CARGO_COLORS[cargo.category]}22`,
                              color: CARGO_COLORS[cargo.category],
                            }}
                          >
                            {CARGO_LABELS[cargo.category]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-slate-400 text-xs">
                          {cargo.position ? `${cargo.position.row},${cargo.position.col}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {affectedByBallast && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                              受压载影响
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">重心轨迹图</h2>
            <GravityTrackCanvas track={latestReport.gravityTrack} />
          </div>
        </div>

        {latestReport.ballastLog.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">压载水操作记录</h2>
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
              <div className="space-y-3">
                {latestReport.ballastLog.map((op, i) => (
                  <div key={op.id || i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${op.isRetroactive ? 'bg-amber-400' : 'bg-blue-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200">
                          {op.action === 'fill' ? '注入' : '排出'} {op.amount}吨
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(op.timestamp).toLocaleTimeString('zh-CN')}
                        </span>
                        {op.isRetroactive && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                            补录
                          </span>
                        )}
                      </div>
                      {op.isRetroactive && op.affectedCargoIds.length > 0 && (
                        <div className="mt-1.5">
                          <span className="text-[10px] text-slate-500">影响货物：</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {op.affectedCargoIds.map(cid => {
                              const cargo = latestReport.cargoManifest.find(c => c.id === cid);
                              return cargo ? (
                                <span key={cid} className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded">
                                  {cargo.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {latestReport.violations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">违规详情</h2>
            <div className="space-y-2">
              {latestReport.violations.map((v, i) => {
                const sevStyle = v.severity === 'critical' ? 'border-red-500/40 bg-red-500/10' :
                  v.severity === 'danger' ? 'border-orange-500/40 bg-orange-500/10' :
                  'border-yellow-500/40 bg-yellow-500/10';
                const sevColor = v.severity === 'critical' ? 'text-red-400' :
                  v.severity === 'danger' ? 'text-orange-400' : 'text-yellow-400';
                const ruleLabel: Record<string, string> = {
                  overload: '超载下沉',
                  gravity_shift: '重心偏移',
                  ballast_omit: '压载遗漏',
                  draft_exceed: '吃水超标',
                };
                return (
                  <div key={i} className={`rounded-lg border p-4 ${sevStyle}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase ${sevColor}`}>
                        {v.severity === 'critical' ? '严重' : v.severity === 'danger' ? '危险' : '警告'}
                      </span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-300">{ruleLabel[v.rule] || v.rule}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{v.message}</p>
                    {v.relatedCargoIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-500">关联货物：</span>
                        {v.relatedCargoIds.map(cid => {
                          const cargo = latestReport.cargoManifest.find(c => c.id === cid);
                          return cargo ? (
                            <span key={cid} className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded">
                              {cargo.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
