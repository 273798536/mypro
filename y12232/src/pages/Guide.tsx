import { Users, Navigation, FileText, ChevronRight, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuideSection {
  icon: typeof Users
  title: string
  subtitle: string
  color: string
  sections: {
    heading: string
    items: string[]
  }[]
}

const guides: GuideSection[] = [
  {
    icon: Users,
    title: '农户档案准备指南',
    subtitle: '确保农户信息完整准确',
    color: 'text-primary bg-primary-50',
    sections: [
      {
        heading: '模板字段说明',
        items: [
          '身份证号：18位标准格式，需与公安系统一致',
          '姓名：与身份证一致的法定姓名',
          '村组：格式为"XX乡XX村XX组"',
          '联系电话：11位手机号码',
        ],
      },
      {
        heading: '填写规范',
        items: [
          '所有字段不得为空，无数据填"无"',
          '身份证号须通过校验位验证',
          '村组名称须与行政区划一致',
          '同一农户不可重复录入',
        ],
      },
      {
        heading: '常见错误',
        items: [
          '身份证号位数不足或校验位错误',
          '姓名含空格或异体字',
          '村组名称简写或不规范',
          '手机号格式错误或位数不对',
        ],
      },
    ],
  },
  {
    icon: Navigation,
    title: '轨迹断点复现方法',
    subtitle: '北斗轨迹数据异常判断与处理',
    color: 'text-warning bg-amber-50',
    sections: [
      {
        heading: '判断逻辑',
        items: [
          '相邻轨迹点时间间隔 > 30分钟视为断点',
          '相邻轨迹点距离 > 500米且无中间点视为断点',
          '轨迹面积与申报面积偏差 > 5% 标记为面积不一致',
          '单条轨迹点数 < 10 标记为轨迹不足',
        ],
      },
      {
        heading: '复现步骤',
        items: [
          '1. 在核验页面筛选"轨迹断点"类型记录',
          '2. 查看轨迹详情，确认断点位置和时长',
          '3. 对比农户当日作业申报，判断断点原因',
          '4. 合理断点（如换地块、午休）可备注说明',
          '5. 异常断点需标记问题并推进至复核',
        ],
      },
      {
        heading: '示例说明',
        items: [
          '正常断点：午休12:00-13:30，轨迹在原地附近恢复',
          '异常断点：轨迹突然跳转至5公里外，无作业记录',
          '面积偏差：轨迹覆盖面积仅为申报面积的80%',
        ],
      },
    ],
  },
  {
    icon: FileText,
    title: '导出清单解读',
    subtitle: '理解导出文件中各字段含义',
    color: 'text-success bg-green-50',
    sections: [
      {
        heading: '字段说明',
        items: [
          '核验面积：取申报面积与轨迹面积的较小值（有断点时以申报为准）',
          '补贴金额：核验面积 × 补贴标准（元/亩）',
          '问题标记：轨迹断点/面积重复/签字缺失',
          '复核结论：通过/驳回，对应最终补贴发放依据',
        ],
      },
      {
        heading: '问题标记含义',
        items: [
          '轨迹断点：北斗轨迹存在中断，需确认作业完整性',
          '面积重复：同一地块被多个农户申报',
          '签字缺失：面积申报表缺少农户签字确认',
          '严重程度：高→需驳回，中→需复核，低→备注即可',
        ],
      },
      {
        heading: '数据口径说明',
        items: [
          '补贴发放清单仅包含"已通过"状态记录',
          '问题清单包含所有标记问题的记录（含已处理）',
          '核验报告为全量数据快照，包含所有状态',
          '导出数据为当前时刻快照，不包含历史修改',
        ],
      },
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-serif font-semibold text-primary">使用说明</h2>
        <p className="text-sm text-gray-500 mt-1">系统操作指南与数据规范说明</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {guides.map((guide) => {
          const Icon = guide.icon
          return (
            <div key={guide.title} className="card overflow-hidden">
              <div className="p-5 border-b border-surface-border">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', guide.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-semibold text-primary text-base">{guide.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{guide.subtitle}</p>
              </div>

              <div className="p-5 space-y-5">
                {guide.sections.map((section, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      {idx === 0 ? (
                        <Info className="w-3.5 h-3.5 text-primary" />
                      ) : idx === 1 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-warning" />
                      )}
                      <h4 className="text-sm font-medium text-gray-700">{section.heading}</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                          <ChevronRight className="w-3 h-3 text-gray-300 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
