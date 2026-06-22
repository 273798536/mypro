import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyBlockProps {
  content: string
  title?: string
}

export default function CopyBlock({ content, title }: CopyBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  return (
    <div className="border border-slate-700/50 rounded overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/40">
          <span className="text-xs text-slate-400">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
      <pre className="p-3 text-xs font-mono text-slate-300 bg-[#0d0d1a] overflow-x-auto leading-relaxed">
        <code>{content}</code>
      </pre>
      {!title && (
        <div className="flex justify-end px-3 py-1 bg-slate-800/40 border-t border-slate-700/30">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
    </div>
  )
}
