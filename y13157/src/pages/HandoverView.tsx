import { useReplayStore } from '@/store/useReplayStore'
import PageHeader from '@/components/PageHeader'
import { FileSearch, AlertOctagon, Download, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { exportReport } from '@/utils/detect'

export default function HandoverView() {
  const navigate = useNavigate()
  const { anomalies, steps, currentVersionId, currentParams } = useReplayStore()

  const anomalySteps = anomalies.map((a) => steps.find((s) => s.id === a.stepId)).filter(Boolean)

  return (
    <div>
      <PageHeader title="师傅接班 · 极简三要素" subtitle="阿岑你好，下面 3 条是你接班只需要知道的" />
      <div className="p-6 grid gap-5 md:grid-cols-3">
        <BigCard
          color="blue"
          Icon={FileSearch}
          title="样例在哪"
          subtitle="打开回放主页看完整步骤"
          actionLabel="进入回放主页"
          onClick={() => navigate('/')}
          detailLines={[
            `当前参数版本包含 ${steps.length} 条步骤`,
            `其中 ${steps.filter(s=>s.isRetracted).length} 条为撤回记录（演示包故意保留）`,
            '每条步骤左侧带现场照片，右侧为参数表',
          ]}
        />
        <BigCard
          color="orange"
          Icon={AlertOctagon}
          title="异常在哪"
          subtitle={`${anomalies.filter(a=>a.status!=='resolved').length} 处待处理异常`}
          actionLabel="跳到复核一页通"
          onClick={() => navigate('/review')}
          detailLines={anomalySteps.map(
            (s, i) => `${i + 1}. 步骤 ${s?.stepIndex}｜${s?.title}`,
          )}
        />
        <BigCard
          color="green"
          Icon={Download}
          title="结果怎么导出"
          subtitle="一键导出 JSON 回放包"
          actionLabel="立即导出结果"
          onClick={() =>
            exportReport(currentVersionId, {
              params: currentParams,
              anomalies,
            })
          }
          detailLines={[
            '导出内容：所有参数 + 异常清单',
            '格式：JSON，可直接发给现场老师',
            '文件名带版本号与时间戳，便于归档',
          ]}
        />
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-lg border border-industrial-border bg-industrial-card p-4">
          <div className="text-sm font-semibold text-white mb-2">快速入口</div>
          <div className="flex flex-wrap gap-2">
            <QuickLink to="/compare" label="对比两版参数差异" />
            <QuickLink to="/teacher" label="看老师那边的进度" />
            <QuickLink to="/review" label="复核一页通" />
          </div>
        </div>
      </div>
    </div>
  )
}

function BigCard({
  color,
  Icon,
  title,
  subtitle,
  actionLabel,
  onClick,
  detailLines,
}: {
  color: 'blue' | 'orange' | 'green'
  Icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  subtitle: string
  actionLabel: string
  onClick: () => void
  detailLines: string[]
}) {
  const colors = {
    blue: {
      bg: 'bg-industrial-blue/10',
      border: 'border-industrial-blue/40',
      text: 'text-industrial-blue',
      btn: 'bg-industrial-blue hover:bg-industrial-blue-dark',
    },
    orange: {
      bg: 'bg-industrial-orange/10',
      border: 'border-industrial-orange/40',
      text: 'text-industrial-orange',
      btn: 'bg-industrial-orange hover:bg-industrial-orange/90',
    },
    green: {
      bg: 'bg-industrial-green/10',
      border: 'border-industrial-green/40',
      text: 'text-industrial-green',
      btn: 'bg-industrial-green hover:bg-industrial-green/90',
    },
  }[color]

  return (
    <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-6 flex flex-col min-h-[280px]`}>
      <div className={`w-12 h-12 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center border ${colors.border}`}>
        <Icon size={26} />
      </div>
      <h3 className="mt-4 text-2xl font-bold text-white">{title}</h3>
      <p className="text-sm text-industrial-muted mt-1">{subtitle}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-industrial-text flex-1">
        {detailLines.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={colors.text}>·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`mt-5 w-full py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all ${colors.btn}`}
      >
        {actionLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  )
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <button
      onClick={() => window.location.hash = to}
      className="px-3 py-1.5 rounded border border-industrial-border bg-industrial-panel text-sm text-industrial-text hover:text-white hover:border-industrial-blue/50 transition-colors"
    >
      {label}
    </button>
  )
}
