import { useStore } from '@/store/useStore';
import { FileText, Calendar, CheckCircle, AlertTriangle, Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportStats } from '@/utils/export';

export default function Samples() {
  const { samples, loadSample, colorRules, currentSampleId } = useStore();
  const navigate = useNavigate();

  const handleLoadSample = (sampleId: string) => {
    loadSample(sampleId);
    navigate('/');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="font-mono text-2xl font-bold text-slate-800 mb-2">可复现样例管理</h1>
          <p className="text-sm text-slate-500 font-mono">
            所有样例均为可复现版本，包含完整的标注数据和人工备注。人工备注原样保留，不做任何格式化。
          </p>
        </div>

        <div className="grid gap-4">
          {samples.map(sample => {
            const stats = exportStats(sample.expectedAnnotations, colorRules);
            const isActive = sample.id === currentSampleId;

            return (
              <div
                key={sample.id}
                className={`bg-white rounded-lg border-2 transition-all ${
                  isActive ? 'border-blue-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <FileText size={20} className="text-slate-400" />
                        <h3 className="font-mono font-bold text-slate-800">{sample.name}</h3>
                        {sample.isDraft && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-mono border border-amber-200">
                            草稿
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-mono border border-blue-200">
                            当前打开
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(sample.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          {sample.warehouseLayout.length} 个货架
                        </span>
                        <span className="flex items-center gap-1">
                          {stats.summary.valid > 0 ? (
                            <CheckCircle size={12} className="text-green-600" />
                          ) : (
                            <AlertTriangle size={12} className="text-amber-600" />
                          )}
                          {sample.expectedAnnotations.length} 条标注
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLoadSample(sample.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-mono transition-colors"
                    >
                      <Eye size={14} />
                      打开样例
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {stats.byLevel.map(item => (
                      <div
                        key={item.level}
                        className="p-2 rounded text-center border border-slate-200"
                      >
                        <div
                          className="w-4 h-4 mx-auto mb-1 rounded border border-slate-300"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="text-[10px] text-slate-500 font-mono">{item.label}</div>
                        <div className="text-sm font-bold font-mono" style={{ color: item.color }}>
                          {item.count}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="p-2 bg-slate-50 rounded text-center">
                      <div className="text-lg font-bold text-slate-700 font-mono">{stats.summary.total}</div>
                      <div className="text-[10px] text-slate-500 font-mono">标注总数</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded text-center">
                      <div className="text-lg font-bold text-green-700 font-mono">{stats.summary.valid}</div>
                      <div className="text-[10px] text-green-600 font-mono">有效标注</div>
                    </div>
                    <div className="p-2 bg-red-50 rounded text-center">
                      <div className="text-lg font-bold text-red-700 font-mono">{stats.summary.invalid}</div>
                      <div className="text-[10px] text-red-600 font-mono">不可用记录</div>
                    </div>
                    <div className="p-2 bg-amber-50 rounded text-center">
                      <div className="text-lg font-bold text-amber-700 font-mono">{stats.summary.withNote}</div>
                      <div className="text-[10px] text-amber-600 font-mono">含人工备注</div>
                    </div>
                  </div>

                  {sample.manualNotes.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                      <h4 className="text-[11px] font-mono font-bold text-amber-700 mb-2 flex items-center gap-1">
                        <Clock size={12} />
                        人工备注（原话保留，未做任何修改）
                      </h4>
                      <div className="space-y-1">
                        {sample.manualNotes.map((note, i) => (
                          <p
                            key={i}
                            className="text-[11px] text-amber-900 font-mono pl-3 border-l-2 border-amber-300"
                          >
                            {i + 1}. {note}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-slate-800 text-white rounded-lg">
          <h3 className="text-sm font-mono font-bold mb-2">使用说明</h3>
          <ul className="text-[11px] text-slate-300 font-mono space-y-1">
            <li>• 点击「打开样例」进入工作台进行标注操作</li>
            <li>• 每个样例包含预置的标注数据，其中包含故意设置的重复标注用于测试校验系统</li>
            <li>• 人工备注会原样保留在导出报告中，学生可以从中了解背景信息</li>
            <li>• 月底转交时，重点关注「不可用记录」列，这些是被系统拦截的标注</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
