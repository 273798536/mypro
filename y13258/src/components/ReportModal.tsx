import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  markdown: string;
  title: string;
}

export default function ReportModal({ open, onClose, markdown, title }: ReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-[#0D7377]">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={15} className="text-[#0D7377]" />
                  <span className="text-[#0D7377]">已复制!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>复制</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1 prose prose-sm max-w-none">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
