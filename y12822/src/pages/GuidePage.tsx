import { RocketOutline, ImportOutline, SearchEyeOutline, ExportOutline } from '@/components/Icons'
import { useOffTargetStore } from '@/store/offTargetStore'
import { useEffect } from 'react'

const steps = [
  {
    num: 1,
    title: '启动',
    icon: RocketOutline,
    content: [
      '首次打开系统时，会自动加载示例数据（5个试剂批次、12条脱靶候选、6条审计记录），可直接操作体验。',
      '数据存储在浏览器 localStorage 中，关闭浏览器不会丢失。',
      '如需重置为初始示例数据，可在浏览器开发者工具中清除 localStorage。',
    ],
  },
  {
    num: 2,
    title: '导入与浏览',
    icon: ImportOutline,
    content: [
      '在"候选表总览"页面查看所有脱靶候选记录。',
      '使用顶部筛选栏按试剂批号、状态、阴性对照结果、日期范围筛选。',
      '搜索框支持按样本ID、位点、处理意见关键词检索。',
      '统计图表随筛选条件实时更新，图表与表格共享同一数据源。',
    ],
  },
  {
    num: 3,
    title: '查看异常与追溯',
    icon: SearchEyeOutline,
    content: [
      '点击表格中任意行进入"候选明细与追溯"页面。',
      '橙色左边框的行表示异常状态，青色左边框表示已复核通过。',
      '在明细页可查看试剂批号追溯链：候选 → 样本 → 试剂批号 → 该批次所有关联异常。',
      '标记异常或复核通过时需填写原因，操作将自动写入审计日志。',
      '修改处理意见也会留痕，记录操作人、时间和原因。',
    ],
  },
  {
    num: 4,
    title: '导出结果',
    icon: ExportOutline,
    content: [
      '进入"数据导出"页面，选择 CSV 或 JSON 格式。',
      '导出内容基于当前筛选条件，与界面展示数据一致。',
      'CSV 文件可用 Excel 直接打开，JSON 适用于程序处理。',
    ],
  },
]

export default function GuidePage() {
  const store = useOffTargetStore()

  useEffect(() => {
    store.initialize()
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">说明文档</h1>
        <p className="text-sm text-zinc-500 mt-1">启动、导入、查看异常、导出结果——四步操作指南</p>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.num} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-teal-700">{step.num}</span>
              </div>
              <h2 className="text-base font-semibold text-zinc-800">{step.title}</h2>
            </div>
            <div className="px-5 py-4 space-y-2">
              {step.content.map((line, i) => (
                <p key={i} className="text-sm text-zinc-600 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">注意事项</h3>
        <ul className="space-y-1.5 text-sm text-amber-700">
          <li>• 所有修正操作（标记异常、复核通过、修改意见）均需填写原因，不可跳过。</li>
          <li>• 审计日志不可编辑或删除，确保追溯链完整性。</li>
          <li>• 导出数据与当前筛选条件一致，导出前请确认筛选范围。</li>
          <li>• 阴性对照异常被复核通过后，在审计日志中可查到操作人、时间和原因。</li>
        </ul>
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">质控验收追溯路径</h3>
        <p className="text-sm text-zinc-600 leading-relaxed">
          打开审计日志 → 定位异常修正记录 → 查看操作人/时间/原因 → 点击试剂批号 →
          查看该批次所有关联候选 → 验证处理意见一致性。沿此路径可从任一异常追溯到试剂批号与处理意见。
        </p>
      </div>
    </div>
  )
}
