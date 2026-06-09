import { Link } from 'react-router-dom';
import {
  Microscope, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  FlaskConical, BookOpen, Sparkles,
} from 'lucide-react';
import { sampleRecords } from '@/data/samples';
import { SectionCard } from '@/components/common/UIComponents';
import { formatDateTime, formatNumber } from '@/utils/format';
import type { GCRecord, RecordStatus } from '@/types';
import { cn } from '@/lib/utils';

const sampleMeta: Record<string, { tag: string; title: string; desc: string; accent: string; border: string; bg: string; icon: typeof CheckCircle2 }> = {
  'sample-001': {
    tag: '顺利记录',
    title: '标准合格流程',
    desc: '峰数据完整、无空值重复、配平总和接近100%，展示一份合格记录应该是什么样子。',
    accent: 'text-success-600',
    border: 'border-success-200',
    bg: 'from-success-50 to-white',
    icon: CheckCircle2,
  },
  'sample-002': {
    tag: '待确认记录',
    title: '典型数据质量问题',
    desc: '含空值、重复峰、配平略低，展示系统如何自动标记质量问题并触发复核流程。',
    accent: 'text-warning-600',
    border: 'border-warning-200',
    bg: 'from-warning-50 to-white',
    icon: AlertTriangle,
  },
  'sample-003': {
    tag: '明显坏数据',
    title: '无效进样教学案例',
    desc: '保留时间大幅漂移、备注混写数值格、基线漂移，展示什么样的数据必须报废重来。',
    accent: 'text-danger-600',
    border: 'border-danger-200',
    bg: 'from-danger-50 to-white',
    icon: XCircle,
  },
};

export default function SampleShowcase() {
  return (
    <div className="space-y-6 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lab-50 border border-lab-100 text-xs text-lab-600 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          教学样例
        </div>
        <h1 className="font-serif text-3xl font-semibold text-lab-900 flex items-center justify-center gap-2">
          <Microscope className="w-8 h-8 text-lab-600" />
          典型记录样例展示
        </h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-xl mx-auto">
          三条记录覆盖日常工作中的三种典型情况：顺利通过、需要复核、必须废弃。<br />
          每一条都包含完整的对齐过程解释和判读结论，可直接用于给新人讲解。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {sampleRecords.map((r, idx) => {
          const meta = sampleMeta[r.id] || sampleMeta['sample-001'];
          const Icon = meta.icon;
          return (
            <SampleCard
              key={r.id}
              record={r}
              meta={meta}
              Icon={Icon}
              index={idx}
            />
          );
        })}
      </div>

      <SectionCard title="使用说明" icon={<BookOpen className="w-5 h-5 text-lab-500" />} className="max-w-3xl mx-auto">
        <ol className="space-y-3 text-sm text-lab-700 list-decimal list-inside">
          <li className="pl-1">
            <span className="font-medium">先看「顺利记录」</span>：理解合格数据的标准长相、对齐步骤、以及一份报告里哪些内容缺一不可。
          </li>
          <li className="pl-1">
            <span className="font-medium">再看「待确认记录」</span>：认识常见的数据质量问题（空值、重复峰），了解为什么这些情况不能直接出报告。
          </li>
          <li className="pl-1">
            <span className="font-medium">最后看「坏数据」</span>：培养识别"什么时候该放弃重来"的判断力，这比会算数字更重要。
          </li>
          <li className="pl-1">
            <span className="font-medium">给课题组看结果时</span>：绿色标签可以直接使用，橙色标签需要找安全员复核确认，红色标签一律作废。
          </li>
        </ol>
        <div className="mt-4 p-3 bg-lab-50 rounded-lg border border-lab-100 text-xs text-lab-700 flex items-start gap-2">
          <FlaskConical className="w-4 h-4 shrink-0 mt-0.5 text-lab-500" />
          <div>
            <span className="font-medium">从空目录开始的试用提示：</span>
            首次打开系统会自动加载这三条样例。
            运行 <code className="bg-white px-1.5 py-0.5 rounded text-lab-600">npm install</code> 后执行 <code className="bg-white px-1.5 py-0.5 rounded text-lab-600">npm run dev</code>，
            点击顶部「样例展示」即可查看。所有数据保存在浏览器 LocalStorage 中。
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function SampleCard({
  record, meta, Icon, index,
}: {
  record: GCRecord;
  meta: typeof sampleMeta[string];
  Icon: typeof CheckCircle2;
  index: number;
}) {
  const issues = record.peaks.filter(p => p.dataQuality !== 'normal').length;
  return (
    <Link
      to={`/records/${record.id}`}
      className={cn(
        'card card-hover overflow-hidden group opacity-0 animate-fade-in-up flex flex-col',
        `stagger-${index + 1}`,
      )}
      style={{ animationFillMode: 'forwards' }}
    >
      <div className={cn('h-2', meta.accent.replace('text-', 'bg-'))} />
      <div className={cn('p-6 bg-gradient-to-br', meta.bg, 'flex-1 flex flex-col')}>
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-12 h-12 rounded-xl bg-white border shadow-soft flex items-center justify-center', meta.border)}>
            <Icon className={cn('w-6 h-6', meta.accent)} />
          </div>
          <span className={cn(
            'text-[11px] px-2 py-0.5 rounded-full font-medium border',
            meta.accent, meta.border, 'bg-white',
          )}>
            {meta.tag}
          </span>
        </div>
        <h3 className="font-serif text-lg font-semibold text-lab-800 mb-1">{meta.title}</h3>
        <p className="text-sm text-zinc-600 leading-relaxed mb-4">{meta.desc}</p>

        <div className="space-y-1.5 text-xs mb-5">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 w-16">批号</span>
            <span className="font-mono text-lab-700 font-medium">{record.batchNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 w-16">样品</span>
            <span className="text-lab-700">{record.sampleName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 w-16">峰数</span>
            <span className="text-lab-700">{record.peaks.length} 个{issues > 0 && <span className="text-warning-600 ml-1">（{issues} 处问题）</span>}</span>
          </div>
          {record.calculationResult && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-16">主含量</span>
              <span className="font-serif text-lg font-semibold text-lab-800 tabular-nums">
                {formatNumber(record.calculationResult.finalResult)}%
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 w-16">时间</span>
            <span className="text-zinc-600">{formatDateTime(record.updatedAt)}</span>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-lab-100/60">
          <div className={cn('inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5', meta.accent)}>
            查看完整详情
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
