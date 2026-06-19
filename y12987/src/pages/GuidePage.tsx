import { useState, useEffect } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Terminal, PlayCircle, Upload, AlertTriangle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuideSection {
  id: string
  title: string
  icon: React.ElementType
  steps: { text: string; code?: string }[]
}

const DEFAULT_SECTIONS: GuideSection[] = [
  {
    id: 'startup',
    title: '启动系统',
    icon: PlayCircle,
    steps: [
      { text: '安装项目依赖', code: 'npm install' },
      { text: '启动开发服务器（前端 + 后端并发）', code: 'npm run dev' },
      { text: '确认终端输出 Client → http://localhost:5173，Server → http://localhost:3000' },
      { text: '浏览器打开 http://localhost:5173 即可进入系统' },
    ],
  },
  {
    id: 'import',
    title: '导入数据',
    icon: Upload,
    steps: [
      { text: '进入拓扑看板页面，点击右上角「导入」按钮' },
      { text: '选择 JSON 或 CSV 格式的任务配置文件', code: '格式参考：{ "tasks": [{ "id", "name", "upstream": [] }] }' },
      { text: '系统自动解析依赖关系并渲染拓扑图' },
      { text: '导入完成后可在拓扑看板中查看节点及上下游连线' },
    ],
  },
  {
    id: 'exceptions',
    title: '查看异常',
    icon: AlertTriangle,
    steps: [
      { text: '在拓扑看板中，失败节点以红色高亮标识' },
      { text: '点击失败节点，右侧抽屉展示最近运行信息与错误日志' },
      { text: '切换到「业务工单」页面，筛选 status=open 查看未解决工单' },
      { text: '在工单详情中可查看完整版本历史与变更原因' },
    ],
  },
  {
    id: 'export',
    title: '导出结果',
    icon: Download,
    steps: [
      { text: '进入审计日志页面，设置筛选条件后点击「查询」' },
      { text: '点击「导出 CSV」按钮，浏览器自动下载筛选后的审计数据' },
      { text: '导出接口地址', code: '/api/audit-logs/export?actionType=update&startDate=2025-01-01' },
      { text: 'CSV 文件包含：操作类型、对象类型、对象ID、操作人、操作时间、变更原因' },
    ],
  },
]

export default function GuidePage() {
  const [sections, setSections] = useState<GuideSection[]>(DEFAULT_SECTIONS)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['startup']))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/guide')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.sections && Array.isArray(json.data.sections) && json.data.sections.length > 0) {
          const mapped: GuideSection[] = json.data.sections.map((s: { title: string; steps: { title: string; description: string }[] }, idx: number) => ({
            id: ['startup', 'import', 'exceptions', 'export'][idx] || `section-${idx}`,
            title: s.title,
            icon: [PlayCircle, Upload, AlertTriangle, Download][idx] || BookOpen,
            steps: s.steps.map((st: { title: string; description: string }) => ({
              text: st.title + '：' + st.description,
            })),
          }))
          setSections(mapped)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleSection = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-brand-info" />
          <h1 className="text-2xl font-bold text-brand-text">操作指南</h1>
        </div>
        <p className="text-brand-muted text-sm mt-1.5 ml-9">启动、导入、查看异常、导出结果</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-brand-muted">加载中…</div>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => {
            const isExpanded = expandedIds.has(section.id)
            const Icon = section.icon
            return (
              <div
                key={section.id}
                className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-brand-elevated/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-brand-info shrink-0" />
                    <span className="text-brand-text font-medium text-sm">{section.title}</span>
                  </div>
                  <div className={cn('text-brand-muted transition-transform duration-200', isExpanded && 'rotate-180')}>
                    <ChevronDown size={16} />
                  </div>
                </button>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="px-5 pb-5 space-y-4">
                    <div className="h-px bg-brand-border" />
                    <ol className="space-y-4">
                      {section.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-elevated text-brand-muted text-xs flex items-center justify-center font-medium mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 space-y-2">
                            <p className="text-sm text-brand-text">{step.text}</p>
                            {step.code && (
                              <div className="flex items-start gap-2 bg-brand-bg border border-brand-border rounded-lg px-3 py-2">
                                <Terminal size={13} className="text-brand-muted mt-0.5 shrink-0" />
                                <code className="text-xs font-mono text-brand-info break-all">{step.code}</code>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
