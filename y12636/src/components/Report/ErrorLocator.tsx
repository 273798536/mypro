import { useStore } from '../../store/useStore';
import {
  AlertTriangle, MapPin, Lightbulb, FileText, ChevronRight,
  ArrowRight, ArrowLeftRight, ScanLine, Hash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const errorTypeIcons: Record<string, any> = {
  '坐标翻转': ArrowLeftRight,
  '比例尺错用': ScanLine,
  '漏填单位': Hash,
};

export default function ErrorLocator() {
  const { errors, materials, operations, selectBerth, setCanvas } = useStore();
  const navigate = useNavigate();

  const jumpToBerth = (x: number, y: number, berthId?: string) => {
    if (berthId) selectBerth(berthId);
    setCanvas({
      panX: -x + 200,
      panY: -y + 150,
      zoom: 1.3,
    });
    navigate('/');
  };

  return (
    <div className="border-t border-port-border flex flex-col" style={{ maxHeight: '55%' }}>
      <div className="px-5 py-3 border-b border-port-border flex items-center justify-between bg-port-panel/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-port-danger" />
          <h4 className="text-sm font-semibold text-white">错误定位清单</h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-port-danger/20 text-port-danger">
            {errors.length} 条
          </span>
        </div>
        <span className="text-[11px] text-slate-500">学生可通过每条错误追溯到具体材料</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {errors.map((e, idx) => {
          const mat = materials.find((m) => m.id === e.materialId);
          const op = operations.find((o) => o.id === e.operationId);
          const Icon = errorTypeIcons[e.errorType] || AlertTriangle;

          return (
            <div key={e.id} className="panel p-4 border-port-danger/30 bg-port-danger/5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-port-danger/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-port-danger" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-port-danger/20 text-port-danger font-medium">
                      错误 #{idx + 1}
                    </span>
                    <h5 className="text-sm font-bold text-white">{e.errorType}</h5>
                    {op?.isSupplementary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-port-warning/20 text-port-warning">
                        含补录
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">错误原因</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{e.errorReason}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">修正建议</p>
                      <p className="text-xs text-port-success leading-relaxed flex items-start gap-1">
                        <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {e.suggestion}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-port-bg border border-port-border flex items-center gap-3">
                    {mat && (
                      <>
                        <img src={mat.imageUrl} className="w-14 h-10 object-cover rounded flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-port-warning" />
                            <p className="text-xs font-medium text-slate-200 truncate">{mat.title}</p>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            学生可从此材料定位「{e.errorType}」发生的具体证据
                            {mat.source && ` · 来源: ${mat.source}`}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => jumpToBerth(e.errorPosition.x, e.errorPosition.y, op?.berthId)}
                      className="flex items-center gap-1.5 text-xs text-port-deep hover:text-blue-300 transition-colors font-medium"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      在调度图上定位错误坐标 ({e.errorPosition.x}, {e.errorPosition.y})
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <div className="text-[10px] text-slate-500">
                      {new Date(e.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
