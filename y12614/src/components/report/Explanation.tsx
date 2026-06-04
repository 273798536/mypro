import { useState } from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';
import { ExportService } from '@/services/exportService';
import { DetectionService } from '@/services/detectionService';
import type { Selection } from '@/types';

interface ExplanationProps {
  selections: Selection[];
  sampleName: string;
}

export function Explanation({ selections, sampleName }: ExplanationProps) {
  const [copied, setCopied] = useState(false);

  const mandarinExplanation = DetectionService.getMandarinExplanation(
    selections.map(s => ({
      isOutOfBounds: s.isOutOfBounds,
      isColliding: s.isColliding
    })),
    sampleName
  );

  const handleCopy = async () => {
    const success = await ExportService.copyTextToClipboard(mandarinExplanation);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2D5A27]/10 rounded-lg">
            <MessageSquare className="w-6 h-6 text-[#2D5A27]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">普通话解释</h3>
            <p className="text-sm text-gray-500">可直接复制给同事的标准解释文本</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          disabled={selections.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A27] text-white rounded-lg hover:bg-[#3d7336] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              一键复制
            </>
          )}
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border">
        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
          {selections.length > 0 
            ? mandarinExplanation 
            : '完成病斑圈选后，这里将生成可直接复制的普通话解释文本。\n\n解释文本将包含：\n• 检测结果汇总\n• 颜色越界被拦截的原因说明\n• 边界碰撞被拦截的原因说明\n• 操作建议和注意事项'}
        </pre>
      </div>

      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-700">
          <strong>💡 提示：</strong>复制这段文字后可以直接发送给同事，无需再做翻译或整理。
          系统会根据实际检测结果自动生成最准确的解释。
        </p>
      </div>
    </div>
  );
}
