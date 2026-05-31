import katex from 'katex'
import 'katex/dist/katex.min.css'

function toLatex(expr: string): string {
  let s = expr
  s = s.replace(/\bpi\b/g, '\\pi')
  s = s.replace(/\bsqrt\(([^)]+)\)/g, '\\sqrt{$1}')
  s = s.replace(/\*/g, ' \\cdot ')
  s = s.replace(/\^(\d+)/g, '^{$1}')
  return s
}

export default function FormulaDisplay({ expression }: { expression: string }) {
  const latex = toLatex(expression)
  let html = ''
  try {
    html = katex.renderToString(latex, { throwOnError: false, displayMode: true })
  } catch {
    html = `<span style="color:#ffb347">${expression}</span>`
  }

  return (
    <div
      className="text-center py-2 font-mono"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
