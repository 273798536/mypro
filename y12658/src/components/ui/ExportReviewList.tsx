import { CheckCircle2, AlertTriangle, Image as ImageIcon, Trash2, Eye, FileCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExportStore } from '@/store/useExportStore';
import { useViewStore } from '@/store/useViewStore';
import { downloadDataUrl } from '@/utils/screenshot';

export default function ExportReviewList() {
  const navigate = useNavigate();
  const exports = useExportStore((s) => s.exports);
  const deleteExport = useExportStore((s) => s.deleteExport);
  const viewpoints = useViewStore((s) => s.viewpoints);
  const restoreViewpoint = useViewStore((s) => s.restoreViewpoint);

  const total = exports.length;
  const okCount = exports.filter((e) => e.checklist.viewpoint && e.checklist.legend && e.checklist.outOfBounds).length;

  return (
    <div className="w-full h-full bg-ocean-950 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button className="btn-ocean flex items-center gap-1.5 text-xs" onClick={() => navigate('/')}>
              <ArrowLeft className="w-3.5 h-3.5" />
              返回 3D 渲染
            </button>
            <div>
              <div className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-data-cyan" />
                截图导出检查清单
              </div>
              <div className="text-xs text-slate-500 mt-0.5">月底/课前复核：确保每张讲解截图视角、图例、越界提示齐全</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="panel-ocean px-3 py-2 flex items-center gap-2">
              <span className="text-slate-400">总截图</span>
              <span className="text-data-cyan font-mono text-lg">{total}</span>
            </div>
            <div className="panel-ocean px-3 py-2 flex items-center gap-2">
              <span className="text-slate-400">通过检查</span>
              <span className={`font-mono text-lg ${okCount === total ? 'text-data-green' : 'text-data-orange'}`}>{okCount}</span>
            </div>
          </div>
        </div>

        {exports.length === 0 ? (
          <div className="panel-ocean p-12 text-center">
            <ImageIcon className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <div className="text-sm text-slate-400">暂无导出记录</div>
            <div className="text-xs text-slate-600 mt-1">请先在 3D 渲染界面导出评审截图</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {exports.map((e) => {
              const allOk = e.checklist.viewpoint && e.checklist.legend && e.checklist.outOfBounds;
              const vp = viewpoints.find((v) => v.id === e.viewpointId);
              return (
                <div key={e.id} className="panel-ocean overflow-hidden flex flex-col">
                  <div className="relative aspect-video bg-ocean-950 overflow-hidden">
                    {e.dataUrl ? (
                      <img src={e.dataUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                      allOk ? 'bg-data-green/90 text-ocean-900' : 'bg-data-orange/90 text-ocean-900'
                    }`}>
                      {allOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {allOk ? '通过' : '待完善'}
                    </div>
                    {e.dataUrl && (
                      <a
                        href={e.dataUrl}
                        download={e.filename}
                        onClick={(ev) => { ev.preventDefault(); downloadDataUrl(e.dataUrl!, e.filename); }}
                        className="absolute bottom-2 right-2 p-1.5 rounded bg-ocean-900/80 text-slate-200 hover:text-data-cyan opacity-0 hover:opacity-100 transition-opacity"
                        title="下载"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-mono text-slate-200 truncate flex-1">{e.filename}</div>
                      <button
                        className="p-1 text-slate-500 hover:text-data-red shrink-0"
                        onClick={() => deleteExport(e.id)}
                        title="删除记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      {[
                        { key: 'viewpoint', label: '视角', ok: e.checklist.viewpoint },
                        { key: 'legend', label: '图例', ok: e.checklist.legend },
                        { key: 'outOfBounds', label: '越界', ok: e.checklist.outOfBounds },
                      ].map((c) => (
                        <div key={c.key} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                          c.ok ? 'bg-data-green/10 text-data-green' : 'bg-data-orange/10 text-data-orange'
                        }`}>
                          {c.ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                          <span>{c.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-ocean-700 mt-auto">
                      <span>{e.resolution} · {e.hasLegend ? '图例' : '无图例'} · {e.hasWatermark ? '水印' : '无水印'}</span>
                      <span>{e.createdAt.slice(5, 16).replace('T', ' ')}</span>
                    </div>
                    {vp && (
                      <button
                        onClick={() => { restoreViewpoint(vp.id); navigate('/'); }}
                        className="btn-ocean text-[10px] py-1 mt-1 flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        跳转到视角「{vp.name}」
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
