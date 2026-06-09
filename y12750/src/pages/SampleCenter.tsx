import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, BookOpen, FlaskConical } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import StatusBadge from '../components/record/StatusBadge';

const sampleConfig = {
  passed: {
    color: 'lab-green',
    border: 'border-lab-green',
    bg: 'bg-lab-green/5',
    text: 'text-lab-green',
    icon: CheckCircle2,
    title: '顺利记录',
    subtitle: '配平正确 · 谱图突跃明显 · 可直接使用',
  },
  pending: {
    color: 'lab-yellow',
    border: 'border-lab-yellow',
    bg: 'bg-lab-yellow/5',
    text: 'text-lab-yellow',
    icon: AlertTriangle,
    title: '待确认记录',
    subtitle: '数据接近阈值 · 需核对原始记录 · 不可直接使用',
  },
  error: {
    color: 'lab-red',
    border: 'border-lab-red',
    bg: 'bg-lab-red/5',
    text: 'text-lab-red',
    icon: XCircle,
    title: '明显坏数据',
    subtitle: '浓度填错 · 谱图无突跃 · 必须重新实验',
  },
} as const;

export default function SampleCenter() {
  const navigate = useNavigate();
  const records = useAppStore((s) => s.records);
  const samples = records.filter((r) => r.isSample);
  const [expandedId, setExpandedId] = useState<string | null>(samples[0]?.id || null);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-3xl text-lab-blue font-bold mb-2 flex items-center gap-3">
          <BookOpen size={28} className="text-lab-green" />
          样例中心
        </h2>
        <p className="text-sm text-gray-500">
          三条标准样例展示环境监测员日常复核的典型场景，展开卡片可查看教师版讲解文案
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {(Object.keys(sampleConfig) as Array<keyof typeof sampleConfig>).map((status) => {
          const config = sampleConfig[status];
          const Icon = config.icon;
          const sample = samples.find((s) => s.status === status);
          const isExpanded = expandedId === sample?.id;

          return (
            <div
              key={status}
              className={`bg-white rounded-sm-plus border-2 ${config.border} overflow-hidden card-shadow transition-all hover:shadow-lg`}
            >
              <div className={`p-5 ${config.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-white shadow flex items-center justify-center ${config.text}`}>
                      <Icon size={26} />
                    </div>
                    <div>
                      <div className={`font-display text-xl font-bold ${config.text}`}>
                        {config.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{config.subtitle}</div>
                    </div>
                  </div>
                  {sample && <StatusBadge status={sample.status} size="sm" />}
                </div>

                {sample && (
                  <div className="text-sm text-gray-700">
                    <div className="font-mono-chem font-semibold mb-1">{sample.sampleCode}</div>
                    <div className="text-gray-500 text-xs mb-3">{sample.titrationType}</div>
                    <div className="text-sm leading-relaxed">{sample.summary}</div>
                  </div>
                )}
              </div>

              {sample && (
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sample.id)}
                  className="w-full px-5 py-3 bg-white border-t border-paper-dark flex items-center justify-between text-sm hover:bg-paper transition-colors"
                >
                  <span className="text-gray-600 font-medium flex items-center gap-2">
                    <BookOpen size={14} className="text-lab-blue" />
                    教师讲解
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </button>
              )}

              {sample && isExpanded && sample.teacherNote && (
                <div className="px-5 py-4 bg-paper-dark/30 border-t border-paper-dark">
                  <p
                    className="text-sm text-gray-700 leading-relaxed"
                    style={{ fontFamily: '"Source Sans 3", "KaiTi", serif', lineHeight: 1.9 }}
                  >
                    {sample.teacherNote}
                  </p>
                </div>
              )}

              {sample && (
                <div className="px-5 py-4 bg-white border-t border-paper-dark">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/record/${sample.id}`)}
                      className="flex-1 px-4 py-2 bg-lab-blue text-white rounded-sm-plus hover:bg-lab-blue-light transition-colors btn-press text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <FlaskConical size={14} />
                      查看完整复核详情
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-mono-chem">
                      来源：{sample.source.notebookId} 第 {sample.source.lineNumber} 行
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-sm-plus border border-paper-dark p-6 card-shadow">
        <h3 className="font-display text-lg text-lab-blue font-semibold mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-lab-blue rounded-full" />
          环境监测员复核要点速查
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
          <div className="p-4 bg-lab-green/8 rounded-sm-plus border border-lab-green/20">
            <div className="font-semibold text-lab-green mb-2">① 配平计算必查</div>
            <ul className="space-y-1 text-gray-600 text-xs leading-relaxed">
              <li>· 反应方程式系数是否正确</li>
              <li>· 有效数字位数（通常 4 位）</li>
              <li>· 浓度计算代入数值</li>
              <li>· 相对误差是否小于 0.5%</li>
            </ul>
          </div>
          <div className="p-4 bg-lab-yellow/8 rounded-sm-plus border border-lab-yellow/20">
            <div className="font-semibold text-lab-yellow mb-2">② 谱图判读必查</div>
            <ul className="space-y-1 text-gray-600 text-xs leading-relaxed">
              <li>· 是否存在明显突跃范围</li>
              <li>· 终点体积与计算是否一致</li>
              <li>· 曲线是否平滑（排除电极干扰）</li>
              <li>· 强酸强碱突跃 ΔpH 应大于 4</li>
            </ul>
          </div>
          <div className="p-4 bg-lab-red/8 rounded-sm-plus border border-lab-red/20">
            <div className="font-semibold text-lab-red mb-2">③ 异常留痕必做</div>
            <ul className="space-y-1 text-gray-600 text-xs leading-relaxed">
              <li>· 每处问题必须关联具体步骤</li>
              <li>· 引用原始行号和谱图文件名</li>
              <li>· 说明问题原因和处理建议</li>
              <li>· 学生可通过备注定位问题</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
