import { cn } from '@/lib/utils'
import { Search, FileX, Inbox, Database, AlertCircle } from 'lucide-react'

type EmptyStateVariant = 'default' | 'search' | 'no-data' | 'error' | 'empty-folder'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

const variantConfig: Record<EmptyStateVariant, {
  Icon: typeof Search
  iconClass: string
  bgClass: string
}> = {
  default: {
    Icon: Inbox,
    iconClass: 'text-audit-300',
    bgClass: 'bg-audit-50',
  },
  search: {
    Icon: Search,
    iconClass: 'text-audit-300',
    bgClass: 'bg-audit-50',
  },
  'no-data': {
    Icon: Database,
    iconClass: 'text-audit-300',
    bgClass: 'bg-audit-50',
  },
  error: {
    Icon: AlertCircle,
    iconClass: 'text-danger-400',
    bgClass: 'bg-danger-50',
  },
  'empty-folder': {
    Icon: FileX,
    iconClass: 'text-audit-300',
    bgClass: 'bg-audit-50',
  },
}

const defaultTexts: Record<EmptyStateVariant, { title: string; description: string }> = {
  default: {
    title: '暂无内容',
    description: '这里还没有任何数据，开始创建第一条记录吧。',
  },
  search: {
    title: '未找到匹配项',
    description: '尝试调整搜索条件或清除筛选器。',
  },
  'no-data': {
    title: '暂无数据',
    description: '当前条件下没有可展示的数据。',
  },
  error: {
    title: '加载失败',
    description: '数据加载出错，请稍后重试。',
  },
  'empty-folder': {
    title: '文件夹为空',
    description: '此目录下还没有任何文件。',
  },
}

export default function EmptyState({
  variant = 'default',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const texts = defaultTexts[variant]
  const { Icon } = config

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-12 text-center',
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
          config.bgClass,
          'pattern-dots'
        )}
      >
        <Icon className={cn('h-8 w-8', config.iconClass)} />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-audit-800 font-serif">
        {title ?? texts.title}
      </h3>
      <p className="mb-5 max-w-sm text-sm text-audit-500 leading-relaxed">
        {description ?? texts.description}
      </p>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  )
}
