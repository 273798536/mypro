import { X, Copy, Check, FileJson } from 'lucide-react';
import { useState } from 'react';
import type { Sample } from '@/types';

interface JsonViewerModalProps {
  sample: Sample | null;
  onClose: () => void;
}

export default function JsonViewerModal({ sample, onClose }: JsonViewerModalProps) {
  const [copied, setCopied] = useState(false);

  if (!sample) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(sample.apiResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-border-color rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <FileJson size={20} className="text-accent-blue" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white">接口返回数据</h3>
              <p className="text-xs text-gray-400">{sample.productName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-tertiary/80 text-sm text-gray-300 hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-accent-green" />
                  已复制
                </>
              ) : (
                <>
                  <Copy size={14} />
                  复制
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-tertiary text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh]">
          <pre className="text-xs font-mono text-gray-300 bg-bg-primary rounded-lg p-4 overflow-auto">
            <code>{JSON.stringify(sample.apiResponse, null, 2)}</code>
          </pre>
        </div>

        <div className="p-4 border-t border-border-color flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Request ID: {String(sample.apiResponse.data?.request_id || 'N/A')}
          </div>
          <div className="text-xs text-gray-500">
            处理时间: {String(sample.apiResponse.data?.processing_time || 'N/A')}
          </div>
        </div>
      </div>
    </div>
  );
}
