import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import {
  PlayCircle,
  FlaskConical,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Loader2,
  Power,
  Lightbulb,
  BookOpen,
  Microscope,
  ArrowRight,
  Waves,
  X,
  Eye,
} from 'lucide-react';
import type { DemoCase } from '../../shared/types';

const demoCases: (DemoCase & { badgeColor: string; suggestions: string[]; affectedLotIndex: number })[] = [
  {
    id: 'BAD001',
    name: '条带拖尾污染',
    description: '3个样本出现位置异常偏大，质量分数低于30，灰度值连续递增',
    purpose: '识别电泳拖尾，需人工补录备注',
    band_count: 42,
    anomaly_types: ['拖尾污染', '低质量分'],
    badgeColor: 'bg-red-500',
    suggestions: [
      '检查凝胶浓度是否过高',
      '降低上样量 30%',
      '延长电泳时间 15 分钟',
      '补录备注：条带拖尾污染',
    ],
    affectedLotIndex: 0,
  },
  {
    id: 'BAD002',
    name: '过曝照片',
    description: '2张显微照片标记为过曝，灰度值全部>250，无法自动标注',
    purpose: '触发补录流程，需重新上传照片',
    band_count: 18,
    anomaly_types: ['图像过曝', '自动标注失败'],
    badgeColor: 'bg-orange-500',
    suggestions: [
      '调整相机曝光参数 -2 EV',
      '重新拍摄显微照片',
      '手动标注关键条带位置',
      '人工补录显微照片链接',
    ],
    affectedLotIndex: 1,
  },
  {
    id: 'BAD003',
    name: '批号笔误',
    description: 'lot_number 应为 RGT-2024-056 而误写为 RGT-2024-065，12个样本挂错批号',
    purpose: '演示批号修改并排对比，影响范围可视化',
    band_count: 56,
    anomaly_types: ['批号错误', '数据关联错误'],
    badgeColor: 'bg-amber-500',
    suggestions: [
      '在并排对比中确认关联错误',
      '批量更正 12 个样本批号',
      '检查并对比修改前后差异',
      '确认关联图重新生成统计',
    ],
    affectedLotIndex: 2,
  },
  {
    id: 'BAD004',
    name: '条带缺失',
    description: '5个样本目标条带(45kDa)未检出，标注为缺失，需补录确认',
    purpose: '人工确认判断：确为缺失还是算法漏检',
    band_count: 35,
    anomaly_types: ['条带缺失', '需补录'],
    badgeColor: 'bg-yellow-500',
    suggestions: [
      '检查电泳图是否存在弱条带',
      '与相邻样本对比确认',
      '如确为缺失：确认缺失标注',
      '如漏检：手动补录条带',
    ],
    affectedLotIndex: 0,
  },
  {
    id: 'BAD005',
    name: '采样地点缺失',
    description: '8个样本采样地点为空，采集日期早于生产日期，元数据异常',
    purpose: '补录关键元数据，交叉验证合理性',
    band_count: 28,
    anomaly_types: ['元数据缺失', '时间矛盾'],
    badgeColor: 'bg-lime-500',
    suggestions: [
      '查询采样记录补录地点',
      '校验采集日期合理性',
      '交叉验证与生产日期',
      '批量补录 8 条记录',
    ],
    affectedLotIndex: 1,
  },
  {
    id: 'BAD006',
    name: '差异分析改写',
    description: 'Run1 标注18条目标，Run2 新算法后变为14条目标+4条杂带',
    purpose: '分组统计前后变化，高亮4条改判样本',
    band_count: 64,
    anomaly_types: ['算法差异', '标注改判'],
    badgeColor: 'bg-emerald-500',
    suggestions: [
      '查看两次运行差异报告',
      '重点关注 4 条改判记录',
      '人工确认改判合理性',
      '确认最终标注结果',
    ],
    affectedLotIndex: 2,
  },
];

const anomalyGallery = [
  {
    title: '拖尾现象 (Smearing)',
    desc: '条带下方出现连续模糊区域',
    cause: '蛋白降解/上样过量/电泳条件不当',
    solution: '降低上样量，添加蛋白酶抑制剂',
    gradient: 'linear-gradient(180deg, #1e3a5f 0%, #3b82f6 20%, #f59e0b 55%, #ef4444 75%, #991b1b 100%)',
  },
  {
    title: '条带模糊 (Fuzzy Bands)',
    desc: '条带边缘不清晰呈扩散状',
    cause: '凝胶浓度不匹配/电压不稳',
    solution: '优化凝胶浓度，稳定电泳电压',
    gradient: 'linear-gradient(180deg, rgba(30,58,95,0.4) 0%, rgba(59,130,246,0.5) 35%, rgba(14,165,233,0.7) 65%, rgba(30,64,175,0.9) 100%)',
  },
  {
    title: '微笑效应 (Smiling Effect)',
    desc: '条带两端向上弯曲呈笑脸',
    cause: '凝胶不均一/温度过高',
    solution: '充分聚合凝胶，降低电泳温度',
    gradient: 'linear-gradient(180deg, #064e3b 10%, #059669 35%, #0ea5e9 60%, #1e40af 85%)',
  },
  {
    title: '条带缺失 (Missing Bands)',
    desc: '预期位置无条带信号',
    cause: '样品降解/转印失败/抗体失效',
    solution: '新鲜制备样品，验证抗体效价',
    gradient: 'linear-gradient(180deg, #18181b 5%, #3f3f46 40%, #71717a 75%, #a1a1aa 100%)',
  },
  {
    title: '非特异条带 (Non-specific)',
    desc: '多出预期外多条杂乱条带',
    cause: '抗体特异性差/封闭不足',
    solution: '提高稀释比例，延长封闭时间',
    gradient: 'linear-gradient(180deg, #450a0a 0%, #991b1b 25%, #dc2626 50%, #f59e0b 70%, #92400e 100%)',
  },
  {
    title: '背景过深 (High Background)',
    desc: '整体背景噪声高，条带对比差',
    cause: '洗涤不充分/抗体浓度过高',
    solution: '增加洗涤次数和时间',
    gradient: 'linear-gradient(180deg, #1c1917 0%, #44403c 25%, #78716c 50%, #a8a29e 75%, #d6d3d1 100%)',
  },
];

export default function DemoMode() {
  const {
    loadDemoCase,
    isDemoMode,
    currentDemoCase,
    toggleDemoMode,
    lots,
    fetchAllData,
  } = useWorkbenchStore();

  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (lots.length === 0) {
      fetchAllData();
    }
  }, [lots.length, fetchAllData]);

  const handleLoadCase = async (caseItem: typeof demoCases[0]) => {
    setLoadingId(caseItem.id);
    try {
      await loadDemoCase(caseItem.id);
      const affectedLot = lots[caseItem.affectedLotIndex] || lots[0];
      const affectedLotId = affectedLot?.id;
      const bandCount = caseItem.band_count;

      const toast = document.createElement('div');
      toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-medium shadow-2xl shadow-purple-500/30 flex items-center gap-2 animate-slideIn';
      toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>已加载 ${caseItem.id} 案例，共影响 ${bandCount} 条记录`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);

      if (affectedLotId) {
        setTimeout(() => navigate(`/lot/${affectedLotId}`), 600);
      }
    } catch (err) {
      console.error('Failed to load demo case:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleCardFlip = (id: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8 animate-slideIn relative">
      <style>{`
        .flip-container { perspective: 1200px; }
        .flip-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flip-inner.flipped { transform: rotateY(180deg); }
        .flip-face {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .flip-back { transform: rotateY(180deg); }
        .gel-gradient {
          position: relative;
          overflow: hidden;
        }
        .gel-gradient::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 12%, rgba(255,255,255,0.06) 12%, transparent 12.5%),
            repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px);
          background-size: 100% 100%, 100% 8px;
          pointer-events: none;
        }
        .gel-gradient::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E");
          opacity: 0.4;
          pointer-events: none;
        }
      `}</style>

      {/* DEMO 水印 */}
      {isDemoMode && <div className="demo-watermark" />}

      {/* 顶部开关区 */}
      <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-serif flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-lab-supplement" />
            坏数据演示库
          </h1>
          <p className="text-sm text-slate-500 mt-1">6 种典型坏数据场景 · 教学演示用 · 带异常现象参考图谱</p>
        </div>

        <div className="flex items-center gap-3">
          {isDemoMode && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 text-purple-800 text-sm font-medium shadow-sm">
              <PlayCircle className="w-4 h-4" />
              演示模式已激活
              {currentDemoCase && (
                <span className="ml-1 px-2 py-0.5 rounded bg-white/60 backdrop-blur-sm text-xs font-mono font-bold text-purple-700 border border-purple-200">
                  {currentDemoCase}
                </span>
              )}
            </div>
          )}
          <button
            onClick={toggleDemoMode}
            className={`group relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all overflow-hidden ${
              isDemoMode
                ? 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                : 'bg-gradient-to-r from-lab-supplement to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <Power className="w-4 h-4" />
              {isDemoMode ? '退出演示模式' : '启用演示模式'}
            </span>
          </button>
        </div>
      </div>

      {/* 案例卡片 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
        {demoCases.map((caseItem) => {
          const isCurrentCase = currentDemoCase === caseItem.id;
          const isLoading = loadingId === caseItem.id;
          const isFlipped = flippedCards.has(caseItem.id);

          return (
            <div
              key={caseItem.id}
              className="flip-container h-[340px]"
              onMouseEnter={() => toggleCardFlip(caseItem.id)}
              onMouseLeave={() => toggleCardFlip(caseItem.id)}
            >
              <div className={`flip-inner ${isFlipped ? 'flipped' : ''}`}>
                {/* 正面 */}
                <div
                  className="flip-face"
                  style={{
                    clipPath: 'polygon(0 0, 95% 0, 100% 8%, 100% 100%, 5% 100%, 0 92%)',
                  }}
                >
                  <div
                    className={`w-full h-full bg-white/90 backdrop-blur-sm border-2 p-5 flex flex-col ${
                      isCurrentCase
                        ? 'border-lab-supplement shadow-xl shadow-purple-500/15'
                        : 'border-slate-200/70 shadow-md hover:shadow-lg transition-shadow'
                    }`}
                    style={{
                      clipPath: 'polygon(0 0, 95% 0, 100% 8%, 100% 100%, 5% 100%, 0 92%)',
                    }}
                  >
                    {isCurrentCase && (
                      <div className="absolute top-3 right-4 z-10">
                        <CheckCircle2 className="w-6 h-6 text-lab-supplement drop-shadow-sm" />
                      </div>
                    )}

                    <div className="flex items-start gap-3 mb-3">
                      <div className={`shrink-0 px-2.5 py-1 rounded-md ${caseItem.badgeColor} text-white text-xs font-mono font-bold tracking-wider shadow-md`}>
                        {caseItem.id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">
                          {caseItem.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-3 leading-relaxed flex-1">
                      {caseItem.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {caseItem.anomaly_types.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                        >
                          {type}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-2 mb-4 pt-3 border-t border-dashed border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <FlaskConical className="w-3.5 h-3.5" />
                        涉及 <span className="font-mono font-bold text-slate-700 text-sm">{caseItem.band_count}</span> 条条带
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <BookOpen className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                        <span className="text-slate-600">
                          <span className="text-slate-500">教学目的：</span>
                          <span className="font-medium text-slate-700">{caseItem.purpose}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 pt-1 text-[10px] text-slate-400 italic">
                        <Eye className="w-3 h-3" />
                        悬停查看处理建议 →
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadCase(caseItem);
                      }}
                      disabled={isLoading}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md ${
                        isCurrentCase
                          ? 'bg-gradient-to-r from-lab-supplement to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 shadow-purple-500/20'
                          : 'bg-gradient-to-r from-lab-supplement to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 shadow-purple-500/20'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          加载中...
                        </>
                      ) : isCurrentCase ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          已加载 · 重新加载
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4" />
                          加载此案例
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 背面 */}
                <div
                  className="flip-face flip-back"
                  style={{
                    clipPath: 'polygon(0 0, 95% 0, 100% 8%, 100% 100%, 5% 100%, 0 92%)',
                  }}
                >
                  <div
                    className="w-full h-full bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 p-5 flex flex-col shadow-xl"
                    style={{
                      clipPath: 'polygon(0 0, 95% 0, 100% 8%, 100% 100%, 5% 100%, 0 92%)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-yellow-300" />
                      </div>
                      <div>
                        <div className="text-[11px] text-purple-200 font-mono">{caseItem.id}</div>
                        <h3 className="text-base font-bold text-white">{caseItem.name}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-px flex-1 bg-white/20" />
                      <span className="text-[11px] text-purple-200 font-semibold">处理建议</span>
                      <div className="h-px flex-1 bg-white/20" />
                    </div>

                    <ul className="space-y-2 flex-1">
                      {caseItem.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-purple-50">
                          <span className="mt-0.5 w-5 h-5 shrink-0 rounded-md bg-white/15 backdrop-blur-sm flex items-center justify-center text-[11px] font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
                      <span className="text-[10px] text-purple-200/80 flex items-center gap-1">
                        <Microscope className="w-3 h-3" />
                        翻转回正面
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadCase(caseItem);
                        }}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/25 transition-colors flex items-center gap-1"
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
                        加载案例
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部异常现象说明区 */}
      <div className="relative z-10 mt-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-slate-100 to-blue-50 border border-slate-200 text-xs font-medium text-slate-500 mb-4">
            <Waves className="w-3.5 h-3.5 text-lab-700" />
            ABNORMAL GALLERY
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'DM Serif Display', 'Noto Serif SC', Georgia, serif" }}>
            常见电泳异常与处理建议
          </h2>
          <div className="mt-2 text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
            基于实际实验经验总结的典型异常图谱 · 结合学术文献整理的标准处理流程
          </div>
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent max-w-md mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {anomalyGallery.map((item, idx) => (
            <div
              key={idx}
              className="group rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden"
            >
              <div className="flex gap-4 p-5">
                <div
                  className="gel-gradient w-24 h-40 shrink-0 rounded-xl shadow-md overflow-hidden border border-slate-900/20"
                  style={{ background: item.gradient }}
                />
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-0.5" style={{ fontFamily: "'DM Serif Display', 'Noto Serif SC', Georgia, serif" }}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 italic">{item.desc}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-0.5">可能原因</div>
                      <div className="text-xs text-red-800 leading-snug">{item.cause}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-0.5">解决方案</div>
                      <div className="text-xs text-emerald-900 leading-snug">{item.solution}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-1 border-t border-dashed border-slate-200">
                    <span className="text-[10px] text-slate-400">Fig. {String(idx + 1).padStart(2, '0')}</span>
                    <div className="flex-1" />
                    <AlertTriangle className="w-3 h-3 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/80 border border-slate-200 text-xs text-slate-500">
            <BookOpen className="w-4 h-4 text-lab-700" />
            <span>以上图谱为 CSS 模拟示意图，仅用于教学演示参考 · 实际实验请遵循实验室标准操作流程</span>
          </div>
        </div>
      </div>
    </div>
  );
}
