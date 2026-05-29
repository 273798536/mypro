import type { MirrorSegment, ParseResult, ParseError } from '@/utils/types';
import { FileDown } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  result: ParseResult<MirrorSegment>;
  onLoadSample: () => void;
}

function lineOffsets(text: string): number[] {
  const lines = text.split('\n');
  const offsets: number[] = [];
  let pos = 0;
  for (const line of lines) {
    offsets.push(pos);
    pos += line.length + 1;
  }
  return offsets;
}

export default function MirrorInput({ value, onChange, result, onLoadSample }: Props) {
  const errorLines = new Set(result.errors.map((e: ParseError) => e.line));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f0c040]" />
          镜面线段
        </h3>
        <button
          onClick={onLoadSample}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[#f0c040]/40 text-[#f0c040] hover:bg-[#f0c040]/10 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          加载样例
        </button>
      </div>
      <div className="relative flex-1 rounded-lg border border-[#2d2d44] bg-[#0d0d1a] overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-10 flex-shrink-0 bg-[#0a0a16] text-gray-600 text-xs font-mono text-right pr-2 pt-3 select-none overflow-hidden leading-[1.65]">
            {value.split('\n').map((_, i) => (
              <div
                key={i}
                className={`h-[1.65em] ${errorLines.has(i + 1) ? 'text-red-500/60' : ''}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent text-gray-200 text-sm font-mono p-3 pl-2 resize-none outline-none leading-[1.65] placeholder:text-gray-600"
            placeholder={"每行一条: startX,startY,endX,endY[,normalAngle]\n或 JSON 数组格式"}
            spellCheck={false}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        {result.data.length > 0 && (
          <span className="text-emerald-400">✅ 格式正确 {result.data.length} 条</span>
        )}
        {result.errors.length > 0 && (
          <span className="text-red-400">
            ❌ 格式错误 {result.errors.length} 条
            {result.errors.map((e: ParseError) => ` (第${e.line}行: ${e.message})`).join('')}
          </span>
        )}
      </div>
    </div>
  );
}
