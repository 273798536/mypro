import { useMemo } from 'react'
import { Plus, Minus, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiffHighlightProps } from '@/types'

interface DiffPart {
  type: 'same' | 'add' | 'delete'
  value: string
}

function computeDiff(oldText: string, newText: string): { oldParts: DiffPart[]; newParts: DiffPart[] } {
  const oldChars = oldText.split('')
  const newChars = newText.split('')

  const dp: number[][] = Array(oldChars.length + 1)
    .fill(null)
    .map(() => Array(newChars.length + 1).fill(0))

  for (let i = 1; i <= oldChars.length; i++) {
    for (let j = 1; j <= newChars.length; j++) {
      if (oldChars[i - 1] === newChars[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const oldParts: DiffPart[] = []
  const newParts: DiffPart[] = []
  let i = oldChars.length
  let j = newChars.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldChars[i - 1] === newChars[j - 1]) {
      oldParts.unshift({ type: 'same', value: oldChars[i - 1] })
      newParts.unshift({ type: 'same', value: newChars[j - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newParts.unshift({ type: 'add', value: newChars[j - 1] })
      j--
    } else {
      oldParts.unshift({ type: 'delete', value: oldChars[i - 1] })
      i--
    }
  }

  const mergeParts = (parts: DiffPart[]): DiffPart[] => {
    if (parts.length === 0) return []
    const merged: DiffPart[] = [{ ...parts[0] }]
    for (let k = 1; k < parts.length; k++) {
      const last = merged[merged.length - 1]
      if (last.type === parts[k].type) {
        last.value += parts[k].value
      } else {
        merged.push({ ...parts[k] })
      }
    }
    return merged
  }

  return {
    oldParts: mergeParts(oldParts),
    newParts: mergeParts(newParts),
  }
}

export default function DiffHighlight({ oldValue, newValue, type }: DiffHighlightProps) {
  const diff = useMemo(() => {
    if (type === 'modify') {
      return computeDiff(oldValue, newValue)
    }
    return null
  }, [oldValue, newValue, type])

  if (type === 'add') {
    return (
      <div className="flex items-start gap-2 rounded-md bg-green-400/10 p-3 transition-all duration-200">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-green-400/20">
          <Plus className="h-3 w-3 text-green-400" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-medium text-green-400">新增</span>
          <div className="mt-1 break-all font-mono text-sm text-green-400">
            {newValue || <span className="italic opacity-60">空</span>}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'delete') {
    return (
      <div className="flex items-start gap-2 rounded-md bg-red-400/10 p-3 transition-all duration-200">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-400/20">
          <Minus className="h-3 w-3 text-red-400" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-medium text-red-400">删除</span>
          <div className="mt-1 break-all font-mono text-sm text-red-400 line-through">
            {oldValue || <span className="italic opacity-60">空</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-md bg-yellow-400/10 p-3 transition-all duration-200">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-yellow-400/20">
        <Pencil className="h-3 w-3 text-yellow-400" />
      </div>
      <div className="flex-1 space-y-2">
        <span className="text-xs font-medium text-yellow-400">修改</span>
        <div className="space-y-2">
          <div>
            <div className="text-xs text-lab-400 mb-1">旧值</div>
            <div className="break-all font-mono text-sm">
              {diff ? (
                diff.oldParts.map((part, index) => (
                  <span
                    key={index}
                    className={cn(
                      part.type === 'delete' && 'bg-red-400/30 text-red-300 line-through',
                      part.type === 'same' && 'text-lab-200',
                    )}
                  >
                    {part.value}
                  </span>
                ))
              ) : (
                <span className="text-red-400 line-through">{oldValue}</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-lab-400 mb-1">新值</div>
            <div className="break-all font-mono text-sm">
              {diff ? (
                diff.newParts.map((part, index) => (
                  <span
                    key={index}
                    className={cn(
                      part.type === 'add' && 'bg-green-400/30 text-green-300',
                      part.type === 'same' && 'text-lab-200',
                    )}
                  >
                    {part.value}
                  </span>
                ))
              ) : (
                <span className="text-green-400">{newValue}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
