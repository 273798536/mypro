import { cn } from '@/lib/utils'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export default function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="min-w-full divide-y divide-border">
        {children}
      </table>
    </div>
  )
}

export function TableHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <thead className={cn('bg-muted', className)}>
      {children}
    </thead>
  )
}

export function TableBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <tbody className={cn('divide-y divide-border bg-card', className)}>
      {children}
    </tbody>
  )
}

export function TableRow({
  children,
  className,
  hover,
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <tr className={cn(hover && 'hover:bg-accent', className)}>
      {children}
    </tr>
  )
}

export function TableHead({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground',
        className
      )}
    >
      {children}
    </th>
  )
}

export function TableCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn('whitespace-nowrap px-6 py-4 text-sm text-foreground', className)}>
      {children}
    </td>
  )
}
