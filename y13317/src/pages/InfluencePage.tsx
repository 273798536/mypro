import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
  ChevronRight,
  Users,
  UserCheck,
  XCircle,
  FileWarning,
} from 'lucide-react';

import { fetchAllSamples } from '@/mock';
import type { QualitySample, SourceType } from '@/types';
import { useOperatorStore, type Filters } from '@/store/operatorStore';
import { generateDefectTypes } from '@/mock/generators';

interface SourceCard {
  key: SourceType;
  title: string;
  headerColor: string;
  headerBg: string;
  iconBg: string;
  sampleCount: number;
  ratio: number;
  impact: number;
  impactPositive: boolean;
  barColors: string[];
  badge?: string;
}

const InfluencePage: React.FC = () => {
  const navigate = useNavigate();
  const { setFilters } = useOperatorStore();

  const [samples, setSamples] = useState<QualitySample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const data = await fetchAllSamples();
      setSamples(data);
      setLoading(false);
    };
    init();
  }, []);

  const defectTypes = generateDefectTypes();

  const total = samples.length;

  const sources: SourceCard[] = useMemo(() => {
    if (total === 0) {
      return [
        {
          key: 'old_correction',
          title: '旧版人工修正',
          headerColor: 'text-white',
          headerBg: 'bg-gradient-to-r from-blue-600 to-blue-500',
          iconBg: 'bg-blue-500',
          sampleCount: 42,
          ratio: 35,
          impact: 2.1,
          impactPositive: true,
          barColors: ['bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600'],
        },
        {
          key: 'normal_record',
          title: '正常记录',
          headerColor: 'text-white',
          headerBg: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
          iconBg: 'bg-emerald-500',
          sampleCount: 54,
          ratio: 45,
          impact: 0.8,
          impactPositive: true,
          barColors: ['bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600'],
        },
        {
          key: 'verbal_note',
          title: '口头备注',
          headerColor: 'text-white',
          headerBg: 'bg-gradient-to-r from-purple-600 to-purple-500',
          iconBg: 'bg-purple-500',
          sampleCount: 24,
          ratio: 20,
          impact: 0.5,
          impactPositive: false,
          barColors: ['bg-purple-300', 'bg-purple-400', 'bg-purple-500', 'bg-purple-600'],
          badge: '需重点关注',
        },
      ];
    }

    const counts: Record<SourceType, number> = {
      old_correction: 0,
      normal_record: 0,
      verbal_note: 0,
    };
    samples.forEach((s) => {
      counts[s.sourceType]++;
    });

    const calcImpact = (key: SourceType) => {
      const ss = samples.filter((s) => s.sourceType === key);
      if (ss.length === 0) return 0;
      const passed = ss.filter((s) => s.workflowStatus === 'approved').length;
      return +((passed / ss.length) * 100 - 85).toFixed(1);
    };

    return [
      {
        key: 'old_correction',
        title: '旧版人工修正',
        headerColor: 'text-white',
        headerBg: 'bg-gradient-to-r from-blue-600 to-blue-500',
        iconBg: 'bg-blue-500',
        sampleCount: counts.old_correction,
        ratio: Math.round((counts.old_correction / total) * 100),
        impact: Math.abs(calcImpact('old_correction')),
        impactPositive: calcImpact('old_correction') >= 0,
        barColors: ['bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600'],
      },
      {
        key: 'normal_record',
        title: '正常记录',
        headerColor: 'text-white',
        headerBg: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
        iconBg: 'bg-emerald-500',
        sampleCount: counts.normal_record,
        ratio: Math.round((counts.normal_record / total) * 100),
        impact: Math.abs(calcImpact('normal_record')),
        impactPositive: calcImpact('normal_record') >= 0,
        barColors: ['bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600'],
      },
      {
        key: 'verbal_note',
        title: '口头备注',
        headerColor: 'text-white',
        headerBg: 'bg-gradient-to-r from-purple-600 to-purple-500',
        iconBg: 'bg-purple-500',
        sampleCount: counts.verbal_note,
        ratio: Math.round((counts.verbal_note / total) * 100),
        impact: Math.abs(calcImpact('verbal_note')) === 0 ? 0.5 : Math.abs(calcImpact('verbal_note')),
        impactPositive: false,
        barColors: ['bg-purple-300', 'bg-purple-400', 'bg-purple-500', 'bg-purple-600'],
        badge: '需重点关注',
      },
    ];
  }, [samples, total]);

  const sankeyOption = useMemo(() => {
    const sourceKeys: SourceType[] = ['old_correction', 'normal_record', 'verbal_note'];
    const sourceNodes = [
      { name: '旧版人工修正', itemStyle: { color: '#3b82f6' } },
      { name: '正常记录', itemStyle: { color: '#10b981' } },
      { name: '口头备注', itemStyle: { color: '#8b5cf6' } },
    ];

    const middleNodes = defectTypes.slice(0, 6).map((dt) => ({
      name: dt,
      itemStyle: { color: '#64748b' },
    }));

    const rightNodes = [
      { name: '通过', itemStyle: { color: '#10b981' } },
      { name: '打回补材料', itemStyle: { color: '#f59e0b' } },
      { name: '待确认', itemStyle: { color: '#6366f1' } },
    ];

    const links: Array<{ source: string; target: string; value: number }> = [];

    if (samples.length > 0) {
      sourceKeys.forEach((sk, sIdx) => {
        const ss = samples.filter((s) => s.sourceType === sk);
        middleNodes.forEach((m, mIdx) => {
          const defectGroup = ss.filter((s) => s.defectType === defectTypes[mIdx]);
          if (defectGroup.length > 0) {
            links.push({
              source: sourceNodes[sIdx].name,
              target: m.name,
              value: defectGroup.length,
            });
          }
        });
      });

      middleNodes.forEach((m) => {
        const mg = samples.filter((s) => s.defectType === m.name);
        if (mg.length === 0) return;
        const a = mg.filter((s) => s.workflowStatus === 'approved').length;
        const b = mg.filter((s) => s.workflowStatus === 'need_material').length;
        const c = mg.filter((s) => s.workflowStatus === 'pending' || s.workflowStatus === 'recheck').length;
        if (a > 0) links.push({ source: m.name, target: '通过', value: a });
        if (b > 0) links.push({ source: m.name, target: '打回补材料', value: b });
        if (c > 0) links.push({ source: m.name, target: '待确认', value: c });
      });
    } else {
      const s = sourceNodes;
      const mid = ['表面划痕', '边缘缺损', '颜色偏差', '尺寸超差', '气泡空洞', '异物污染'];
      const pairs: Array<[string, string, number]> = [
        [s[0].name, mid[0], 10], [s[0].name, mid[1], 8], [s[0].name, mid[2], 7],
        [s[0].name, mid[3], 6], [s[0].name, mid[4], 6], [s[0].name, mid[5], 5],
        [s[1].name, mid[0], 12], [s[1].name, mid[1], 10], [s[1].name, mid[2], 9],
        [s[1].name, mid[3], 8], [s[1].name, mid[4], 8], [s[1].name, mid[5], 7],
        [s[2].name, mid[0], 5], [s[2].name, mid[1], 5], [s[2].name, mid[2], 4],
        [s[2].name, mid[3], 4], [s[2].name, mid[4], 3], [s[2].name, mid[5], 3],
      ];
      pairs.forEach(([a, b, v]) => links.push({ source: a, target: b, value: v }));

      const right = ['通过', '打回补材料', '待确认'];
      const finalPairs: Array<[string, string, number]> = [];
      const dist = [
        [15, 7, 5], [13, 6, 4], [12, 5, 3], [10, 5, 3], [10, 4, 3], [9, 3, 3],
      ];
      dist.forEach((row, i) => {
        row.forEach((v, j) => {
          if (v > 0) finalPairs.push([mid[i], right[j], v]);
        });
      });
      finalPairs.forEach(([a, b, v]) => links.push({ source: a, target: b, value: v }));
    }

    return {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: (params: { dataType: string; name: string; value: number }) => {
          if (params.dataType === 'edge') {
            return `${params.name}<br/>影响样本数: <b>${params.value}</b>`;
          }
          return `<b>${params.name}</b>`;
        },
      },
      series: [
        {
          type: 'sankey',
          left: 30,
          right: 120,
          top: 30,
          bottom: 30,
          nodeWidth: 18,
          nodeGap: 14,
          nodeAlign: 'left',
          emphasis: { focus: 'adjacency' },
          data: [...sourceNodes, ...middleNodes, ...rightNodes],
          links,
          label: {
            fontSize: 12,
            color: '#334155',
            fontWeight: 500,
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.35,
          },
        },
      ],
    };
  }, [samples, defectTypes]);

  const heatmapData = useMemo(() => {
    const sourceKeys: SourceType[] = ['old_correction', 'normal_record', 'verbal_note'];
    const sourceLabelsInner = ['旧版人工修正', '正常记录', '口头备注'];
    const data: Array<{ defect: string; source: string; count: number; passRate: number; intensity: number }> = [];
    let maxCount = 0;

    defectTypes.forEach((dt) => {
      sourceKeys.forEach((sk, sIdx) => {
        const group = samples.filter((s) => s.defectType === dt && s.sourceType === sk);
        const count = group.length;
        const passRate =
          group.length > 0
            ? Math.round((group.filter((s) => s.workflowStatus === 'approved').length / group.length) * 100)
            : 0;
        maxCount = Math.max(maxCount, count);
        data.push({
          defect: dt,
          source: sourceLabelsInner[sIdx],
          count,
          passRate,
          intensity: 0,
        });
      });
    });

    return data.map((d) => ({ ...d, intensity: maxCount > 0 ? d.count / maxCount : 0 }));
  }, [samples, defectTypes]);

  const [sortKey, setSortKey] = useState<'defect' | 'old_correction' | 'normal_record' | 'verbal_note'>('defect');
  const [sortAsc, setSortAsc] = useState(true);

  const sortedDefects = useMemo(() => {
    const sourceLabelsMap: Record<SourceType, string> = {
      old_correction: '旧版人工修正',
      normal_record: '正常记录',
      verbal_note: '口头备注',
    };
    const getVal = (dt: string, sk: SourceType) =>
      heatmapData.find((d) => d.defect === dt && d.source === sourceLabelsMap[sk])?.count ?? 0;
    const defectSet = new Set(heatmapData.map((d) => d.defect));
    const arr = Array.from(defectSet);

    return arr.sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (sortKey === 'defect') {
        return sortAsc ? a.localeCompare(b) : b.localeCompare(a);
      }
      if (sortKey === 'old_correction') {
        va = getVal(a, 'old_correction');
        vb = getVal(b, 'old_correction');
      } else if (sortKey === 'normal_record') {
        va = getVal(a, 'normal_record');
        vb = getVal(b, 'normal_record');
      } else {
        va = getVal(a, 'verbal_note');
        vb = getVal(b, 'verbal_note');
      }
      return sortAsc ? va - vb : vb - va;
    });
  }, [heatmapData, sortKey, sortAsc]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleCardClick = (sourceType: SourceType) => {
    const f: Partial<Filters> = {
      batchId: '',
      defectType: '',
      sourceType,
      citationStatus: '',
      workflowStatus: '',
      keyword: '',
    };
    setFilters(f);
    navigate('/trace');
  };

  const heatmapCellColor = (intensity: number) => {
    const alpha = 0.15 + intensity * 0.7;
    return `rgba(99, 102, 241, ${alpha.toFixed(3)})`;
  };

  const sourceLabels = ['旧版人工修正', '正常记录', '口头备注'];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">影响因素分析</h1>
            <p className="text-sm text-slate-500 mt-1">
              量化各类来源对改判质量的贡献度、传导链路与交叉影响热力
            </p>
          </div>
          <button
            onClick={() => navigate('/trace')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            返回追溯工作台 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-slate-400">加载中...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-5">
              {sources.map((src) => (
                <div
                  key={src.key}
                  onClick={() => handleCardClick(src.key)}
                  className="group cursor-pointer rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative"
                >
                  {src.badge && (
                    <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {src.badge}
                    </div>
                  )}
                  <div className={`${src.headerBg} ${src.headerColor} px-5 py-4 flex items-center gap-3`}>
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{src.title}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">来源数据基于当前版本 v1+v2</div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">样本数</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-800">N={src.sampleCount}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">占比</div>
                        <div className="text-2xl font-bold text-slate-800">{src.ratio}%</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs text-slate-400 mb-2">影响方向 · 通过率</div>
                      <div className="inline-flex items-center gap-1.5">
                        {src.impactPositive ? (
                          <TrendingUp className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <span
                          className={`text-lg font-bold ${src.impactPositive ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {src.impactPositive ? '↑' : '↓'}
                          {src.impact}%
                        </span>
                        <span className="text-sm text-slate-500 ml-1">通过率</span>
                      </div>
                    </div>

                    <div className="pt-3">
                      <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" />
                        各缺陷类型分布
                      </div>
                      <div className="flex items-end gap-1.5 h-12">
                        {src.barColors.map((c, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-t ${c} opacity-80 group-hover:opacity-100 transition-opacity`}
                            style={{ height: `${60 - i * 8 + ((i % 2) * 1.4)}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 pt-2 border-t border-dashed border-slate-100">
                      点击跳转追溯页筛选 <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                    </div>
                    桑基影响链路图
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    来源 → 缺陷类型 → 最终结论 三级传导，线宽=影响权重
                  </p>
                </div>
              </div>
              <div className="h-[440px]">
                <ReactECharts option={sankeyOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
              </div>
              <div className="flex items-center justify-center gap-6 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" /> 旧版人工修正
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" /> 正常记录
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500" /> 口头备注
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> 通过
                </div>
                <div className="flex items-center gap-1.5">
                  <FileWarning className="w-3.5 h-3.5 text-amber-500" /> 打回补材料
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-indigo-500" /> 待确认
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    交叉影响分析 · Heatmap
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">单元格：样本数 / 通过率，颜色越深影响强度越大</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                      <th
                        className="px-4 py-3 border-b border-slate-200 sticky left-0 bg-slate-50 z-10 cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSort('defect')}
                      >
                        <div className="flex items-center gap-1">
                          缺陷类型 {sortKey === 'defect' && (sortAsc ? '↑' : '↓')}
                        </div>
                      </th>
                      {(['old_correction', 'normal_record', 'verbal_note'] as const).map((sk, idx) => (
                        <th
                          key={sk}
                          className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort(sk)}
                        >
                          <div className="flex items-center gap-1">
                            {sourceLabels[idx]}
                            {sortKey === sk && (sortAsc ? '↑' : '↓')}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDefects.map((dt) => {
                      const row = heatmapData.filter((d) => d.defect === dt);
                      return (
                        <tr key={dt} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 border-b border-slate-100 sticky left-0 bg-white font-medium text-slate-700">
                            {dt}
                          </td>
                          {sourceLabels.map((sl) => {
                            const cell = row.find((d) => d.source === sl);
                            const bg = cell ? heatmapCellColor(cell.intensity) : 'transparent';
                            const tc = cell && cell.intensity > 0.5 ? 'text-white' : 'text-slate-800';
                            return (
                              <td
                                key={sl}
                                className="px-4 py-3 border-b border-slate-100"
                                style={{ backgroundColor: bg }}
                              >
                                {cell && cell.count > 0 ? (
                                  <div className={tc}>
                                    <div className="font-medium">{cell.count} 个</div>
                                    <div className="text-[11px] opacity-80 mt-0.5">通过率 {cell.passRate}%</div>
                                  </div>
                                ) : (
                                  <div className="text-slate-300">-</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>影响强度：</span>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }} />
                  <span>弱</span>
                  <div className="w-24 h-4 rounded bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-600" />
                  <span>强</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InfluencePage;
