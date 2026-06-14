import { FileDown, ClipboardCheck, Users } from 'lucide-react'
import ExportConfig from '@/components/ExportConfig'
import ConsistencyCheck from '@/components/ConsistencyCheck'
import AliasDuplicateCheck from '@/components/AliasDuplicateCheck'

const SECTIONS = [
  { title: '导出配置', icon: FileDown, Component: ExportConfig },
  { title: '一致性校验', icon: ClipboardCheck, Component: ConsistencyCheck },
  { title: '别名重复检查', icon: Users, Component: AliasDuplicateCheck },
]

export default function Export() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] p-6">
      <h1 className="mb-8 text-2xl font-bold text-[#e8e8e8]">CSV导出与校验</h1>
      <div className="mx-auto max-w-4xl space-y-6">
        {SECTIONS.map(({ title, icon: Icon, Component }) => (
          <section
            key={title}
            className="rounded-2xl border border-[#3a3a55] bg-[#2d2d44] p-6 shadow-lg"
          >
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-[#f0a500]">
              <Icon size={20} />
              {title}
            </h2>
            <Component />
          </section>
        ))}
      </div>
    </div>
  )
}
