import { useState } from 'react';
import { FileText, Image, Clock } from 'lucide-react';
import type { SourceRef } from '../../types';

interface Props {
  source: SourceRef;
  children: React.ReactNode;
}

export default function SourceTooltip({ source, children }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      {show && (
        <div className="absolute z-50 left-0 top-full mt-2 w-80 bg-white rounded-sm-plus shadow-xl border border-paper-dark p-4 animate-fade-up">
          <div className="text-xs font-semibold text-lab-blue mb-3 pb-2 border-b border-paper-dark">
            原始来源引用
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-lab-blue mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-500">实验记录簿：</span>
                <span className="font-mono-chem text-gray-800">{source.notebookId}</span>
                <span className="text-gray-500">，第 </span>
                <span className="font-mono-chem text-lab-blue font-semibold">{source.lineNumber}</span>
                <span className="text-gray-500"> 行</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Image size={14} className="text-lab-blue mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-500">谱图文件：</span>
                <span className="font-mono-chem text-gray-800">{source.spectrumFile}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock size={14} className="text-lab-blue mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-500">采样时间：</span>
                <span className="font-mono-chem text-gray-800">{source.samplingTime}</span>
              </div>
            </div>

            {source.originalNote && (
              <div className="mt-3 p-2 bg-paper rounded-sm-plus text-xs text-gray-600 italic">
                "{source.originalNote}"
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
