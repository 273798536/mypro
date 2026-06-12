import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  GitBranch,
  UserX,
  CornerDownRight,
  History,
} from 'lucide-react';
import { useAppStoreShallow } from '@/store/useAppStoreShallow';

export default function AnomalyPage() {
  const { anomalies, parameters, versions } = useAppStoreShallow((s) => ({
    anomalies: s.anomalies,
    parameters: s.parameters,
    versions: s.versions,
  }));

  return (
    <div className="max-w-[1080px] mx-auto p-6 fade-in">
      <header className="mb-6">
        <h1 className="font-song text-2xl text-ink-800">异常追踪 · 不止一句警告</h1>
        <p className="text-sm text-ink-500 mt-1">
          外推越界、权重异动都能一路追到参数表的原始说法、哪次改的、当时备注。
        </p>
      </header>

      <div className="space-y-6">
        {anomalies.map((a, idx) => {
          const param = parameters.find((p) => p.id === a.paramId);
          const version = versions.find((v) => v.id === a.versionId);
          return (
            <article
              key={a.id}
              className="bg-white border border-ink-200 rounded-[2px] overflow-hidden"
            >
              {/* 顶部警告条 */}
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #f9ecc9 0, #f9ecc9 10px, #f2d78e 10px, #f2d78e 20px)',
                }}
              >
                <span className="w-9 h-9 shrink-0 rounded bg-ink-800 text-white flex items-center justify-center">
                  <AlertTriangle size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-600">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-song text-base text-ink-800">
                      {a.title}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-600 mt-0.5 font-hei">
                    关联参数 {param?.name ?? '-'} · 触发版本 v{version?.version} ·{' '}
                    {version?.timestamp}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-[2px] font-hei tracking-wide ${
                    a.type === 'extrapolation'
                      ? 'bg-amber-600 text-white'
                      : a.type === 'weight'
                      ? 'bg-ink-700 text-white'
                      : 'bg-ink-500 text-white'
                  }`}
                >
                  {a.type === 'extrapolation'
                    ? '外推越界'
                    : a.type === 'weight'
                    ? '权重异动'
                    : '其它异常'}
                </span>
              </div>

              {/* 溯源链 - 水平步骤条 */}
              <div className="px-5 py-5">
                <div className="text-[11px] text-ink-400 tracking-widest font-hei mb-4">
                  溯源链 · 警告 → 参数原始说法 → 改权重 → 当时备注
                </div>
                <ol className="grid grid-cols-4 gap-3 relative">
                  {/* 连接线 */}
                  <div className="absolute top-6 left-[12.5%] right-[12.5%] h-[2px] bg-ink-200">
                    <div className="h-full bg-amber-400 w-3/4" />
                  </div>

                  <Step
                    n={1}
                    active
                    icon={<AlertTriangle size={15} />}
                    title="警告卡片"
                    body={a.title}
                  />
                  <Step
                    n={2}
                    active
                    icon={<FileText size={15} />}
                    title="参数原始说法"
                    body={a.rawStatement}
                  />
                  <Step
                    n={3}
                    active={!!version}
                    icon={<GitBranch size={15} />}
                    title={
                      version ? (
                        <Link
                          to={`/history/${a.paramId}`}
                          className="link-underline text-ink-800"
                        >
                          改权重 · v{version.version}
                        </Link>
                      ) : (
                        '变更版本'
                      )
                    }
                    body={
                      version
                        ? `${version.operator} · ${version.weight.toFixed(2)} → ${version.newWeight.toFixed(2)}`
                        : '—'
                    }
                    note={
                      version?.operator === '匿名'
                        ? { icon: <UserX size={11} />, text: '匿名操作' }
                        : null
                    }
                  />
                  <Step
                    n={4}
                    active
                    icon={<History size={15} />}
                    title="追踪说明"
                    body={a.traceNote}
                  />
                </ol>
              </div>

              {/* 原始说法引用块 */}
              <div className="mx-5 mb-5 border-l-4 border-amber-400 bg-amber-50/60 p-4 rounded-r-[2px]">
                <div className="flex items-start gap-2">
                  <CornerDownRight size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-hei text-amber-800 mb-1">
                      参数表原始说法（不做含糊改写，原样引用）
                    </div>
                    <div className="text-ink-700">{a.rawStatement}</div>
                  </div>
                </div>
              </div>

              {/* 底部 CTA */}
              <div className="border-t border-ink-100 px-5 py-3 flex items-center justify-between bg-ink-50/60">
                <div className="text-[11px] text-ink-500 font-hei">
                  继续查看参数完整历史：
                </div>
                <Link
                  to={`/history/${a.paramId}`}
                  className="px-3 py-1.5 text-xs bg-ink-700 text-white rounded-[2px] hover:bg-ink-600 transition-colors font-hei inline-flex items-center gap-1"
                >
                  打开参数历史 <ChevronRight size={13} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Step({
  n,
  active,
  icon,
  title,
  body,
  note,
}: {
  n: number;
  active?: boolean;
  icon: React.ReactNode;
  title: React.ReactNode;
  body: React.ReactNode;
  note?: { icon: React.ReactNode; text: string } | null;
}) {
  return (
    <li className="relative z-10">
      <div
        className={`mx-auto w-12 h-12 rounded-full border-2 flex items-center justify-center mb-3 ${
          active
            ? 'bg-ink-800 border-ink-800 text-white'
            : 'bg-white border-ink-300 text-ink-400'
        }`}
      >
        {active ? icon : <span className="font-mono text-sm">{n}</span>}
      </div>
      <div className="text-center">
        <div className="text-[11px] text-ink-400 tracking-widest font-hei mb-1">
          Step {n}
        </div>
        <div className="text-xs font-hei text-ink-800 mb-1 min-h-[32px]">{title}</div>
        <div className="text-[11px] text-ink-600 leading-relaxed">{body}</div>
        {note && (
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border border-amber-300 text-amber-700 rounded-[2px] bg-amber-50 font-hei">
            {note.icon} {note.text}
          </div>
        )}
      </div>
    </li>
  );
}
