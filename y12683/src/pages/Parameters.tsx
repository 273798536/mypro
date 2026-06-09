import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  GitBranch,
  Info,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Database,
  Layers,
  Calculator,
} from 'lucide-react';

const parameterRelations = [
  {
    id: 'volume-calc',
    title: '容量计算参数链',
    description: '半径(r)和高度(h)决定舱体容量，容量进一步影响充载比例',
    params: [
      { name: '半径 r', value: '输入参数', color: '#3d69c2' },
      { name: '高度 h', value: '输入参数', color: '#3d69c2' },
      { name: '容量 V', value: '= π × r² × h', color: '#5a81cc' },
      { name: '充载比例', value: '= 实际水量 / V', color: '#7799d6' },
    ],
    formula: 'V = π × r² × h',
  },
  {
    id: 'quality-assess',
    title: '点云质量评估参数链',
    description: '点数和体积决定点密度，密度异常会触发质量警告',
    params: [
      { name: '点数 N', value: '扫描获取', color: '#38a169' },
      { name: '体积 V', value: '计算结果', color: '#38a169' },
      { name: '点密度 ρ', value: '= N / V', color: '#68d391' },
      { name: '质量评级', value: '100-500 正常', color: '#9ae6b4' },
    ],
    formula: 'ρ = N / V',
  },
  {
    id: 'collision-risk',
    title: '碰撞风险评估参数链',
    description: '点间距偏差和碰撞指数综合决定风险等级',
    params: [
      { name: '点间距 d', value: '点云分析', color: '#dd6b20' },
      { name: '间距偏差 δ', value: '= |d-d̄|/d̄', color: '#ed8936' },
      { name: '碰撞指数 CI', value: '= (1/V)×Σ(1/d²)', color: '#f6ad55' },
      { name: '风险等级', value: '低/中/高', color: '#fbd38d' },
    ],
    formula: 'CI = (1/V) × Σ(1/d²)',
  },
];

const thresholdInfo = [
  {
    name: '点密度 ρ',
    unit: 'points/m³',
    normal: '100 - 500',
    warning: '< 100 或 > 500',
    abnormal: '< 50 或 > 1000',
    impact: '密度过低影响精度，过高增加计算开销',
  },
  {
    name: '间距偏差 δ',
    unit: '%',
    normal: '< 15',
    warning: '15 - 25',
    abnormal: '> 25',
    impact: '偏差过大表明点云分布不均，可能存在扫描盲区',
  },
  {
    name: '碰撞指数 CI',
    unit: '1/m⁴',
    normal: '< 1000',
    warning: '1000 - 2000',
    abnormal: '> 2000',
    impact: '指数越高，说明点云聚集越严重，内部碰撞风险越大',
  },
];

export default function Parameters() {
  const relationChartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        textStyle: { color: '#e2e8f0' },
      },
      series: [
        {
          type: 'sankey',
          left: '5%',
          right: '15%',
          top: '5%',
          bottom: '5%',
          emphasis: { focus: 'adjacency' },
          nodeWidth: 20,
          nodeGap: 12,
          data: [
            { name: '半径 r', itemStyle: { color: '#3d69c2' } },
            { name: '高度 h', itemStyle: { color: '#3d69c2' } },
            { name: '点数 N', itemStyle: { color: '#38a169' } },
            { name: '点间距 d', itemStyle: { color: '#dd6b20' } },
            { name: '容量 V', itemStyle: { color: '#5a81cc' } },
            { name: '点密度 ρ', itemStyle: { color: '#68d391' } },
            { name: '间距偏差 δ', itemStyle: { color: '#ed8936' } },
            { name: '碰撞指数 CI', itemStyle: { color: '#f6ad55' } },
            { name: '质量评级', itemStyle: { color: '#9ae6b4' } },
            { name: '风险等级', itemStyle: { color: '#fbd38d' } },
          ],
          links: [
            { source: '半径 r', target: '容量 V', value: 10 },
            { source: '高度 h', target: '容量 V', value: 10 },
            { source: '点数 N', target: '点密度 ρ', value: 8 },
            { source: '容量 V', target: '点密度 ρ', value: 8 },
            { source: '点间距 d', target: '间距偏差 δ', value: 6 },
            { source: '点间距 d', target: '碰撞指数 CI', value: 6 },
            { source: '容量 V', target: '碰撞指数 CI', value: 5 },
            { source: '点密度 ρ', target: '质量评级', value: 8 },
            { source: '间距偏差 δ', target: '风险等级', value: 6 },
            { source: '碰撞指数 CI', target: '风险等级', value: 7 },
          ],
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.6,
          },
          label: {
            color: '#e2e8f0',
            fontSize: 12,
          },
        },
      ],
    }),
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-deep-sea-400" />
          参数联动说明
        </h1>
        <p className="text-tech-gray-400 mt-1">月底或课前复盘用 - 可视化参数间的依赖关系与联动逻辑</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning-orange-500" />
          全局参数关系图
        </h2>
        <ReactECharts option={relationChartOption} style={{ height: '380px', width: '100%' }} />
        <p className="text-xs text-tech-gray-500 mt-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          展示从基础输入参数（半径、高度、点数等）到最终评估结果（质量评级、风险等级）的完整传递路径
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {parameterRelations.map((relation) => (
          <div key={relation.id} className="glass-card p-5">
            <h3 className="text-white font-semibold mb-2">{relation.title}</h3>
            <p className="text-sm text-tech-gray-400 mb-4">{relation.description}</p>

            <div className="mb-4 p-3 rounded-lg bg-tech-gray-900/60 border border-deep-sea-500/20">
              <p className="text-xs text-tech-gray-500 mb-1">核心公式</p>
              <p className="text-deep-sea-300 font-mono text-lg">{relation.formula}</p>
            </div>

            <div className="space-y-2">
              {relation.params.map((param, i) => (
                <div key={param.name} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="w-4 h-4 text-tech-gray-600 shrink-0" />}
                  <div
                    className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ backgroundColor: `${param.color}15`, borderLeft: `3px solid ${param.color}` }}
                  >
                    <span className="text-white text-sm font-medium">{param.name}</span>
                    <span className="text-xs text-tech-gray-400">{param.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning-orange-500" />
          关键参数阈值参考
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-tech-gray-400 font-medium">参数名称</th>
                <th className="text-left py-3 px-4 text-tech-gray-400 font-medium">单位</th>
                <th className="text-left py-3 px-4 text-tech-gray-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success-green-500" />
                    正常范围
                  </span>
                </th>
                <th className="text-left py-3 px-4 text-tech-gray-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-warning-orange-500" />
                    警告范围
                  </span>
                </th>
                <th className="text-left py-3 px-4 text-tech-gray-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    异常阈值
                  </span>
                </th>
                <th className="text-left py-3 px-4 text-tech-gray-400 font-medium">影响说明</th>
              </tr>
            </thead>
            <tbody>
              {thresholdInfo.map((row) => (
                <tr key={row.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{row.name}</td>
                  <td className="py-3 px-4 text-tech-gray-400 font-mono">{row.unit}</td>
                  <td className="py-3 px-4">
                    <span className="status-badge border border-success-green-500/30 bg-success-green-500/10 text-success-green-500">
                      {row.normal}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="status-badge border border-warning-orange-500/30 bg-warning-orange-500/10 text-warning-orange-500">
                      {row.warning}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="status-badge border border-red-500/30 bg-red-500/10 text-red-500">
                      {row.abnormal}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-tech-gray-400 text-sm max-w-xs">{row.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-deep-sea-500/20 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-deep-sea-400" />
          </div>
          <div>
            <p className="text-sm text-tech-gray-400">打开计算工具</p>
            <p className="text-white font-medium">参数实时计算</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-success-green-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-success-green-500" />
          </div>
          <div>
            <p className="text-sm text-tech-gray-400">查看点云切片</p>
            <p className="text-white font-medium">关联测量记录</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-tech-gray-400">数据管理中心</p>
            <p className="text-white font-medium">导入历史与去重</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning-orange-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-warning-orange-500" />
          </div>
          <div>
            <p className="text-sm text-tech-gray-400">碰撞检测入口</p>
            <p className="text-white font-medium">实时风险监控</p>
          </div>
        </div>
      </div>
    </div>
  );
}
