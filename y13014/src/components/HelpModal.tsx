import { X, FileDigit, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { useWarningStore } from '@/store/useWarningStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: Props) {
  const loadSampleData = useWarningStore((s) => s.loadSampleData);
  const rerunWarnings = useWarningStore((s) => s.rerunWarnings);
  const warnings = useWarningStore((s) => s.warnings);
  const navigate = useNavigate();

  if (!open) return null;

  const firstWithScreenshot = warnings.find((w) => w.screenshots.length > 0);

  const handleSample = () => {
    loadSampleData();
    onClose();
  };

  const handleRerun = () => {
    rerunWarnings();
    onClose();
  };

  const handleScreenshot = () => {
    if (firstWithScreenshot) {
      navigate(`/warning/${firstWithScreenshot.id}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-deep-sea-700">预警说明</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleSample}
            className="group text-left p-5 rounded-xl border border-slate-200 hover:border-deep-sea-300 hover:bg-deep-sea-50/40 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-deep-sea-100 text-deep-sea-700 flex items-center justify-center mb-3 group-hover:bg-deep-sea-700 group-hover:text-white transition">
              <FileDigit size={20} />
            </div>
            <div className="font-semibold text-slate-800 mb-1">放样例</div>
            <div className="text-sm text-slate-500 leading-relaxed">加载 12 条示例预警记录，含负数冲正、三态分布和备注样例。</div>
          </button>

          <button
            onClick={handleRerun}
            className="group text-left p-5 rounded-xl border border-slate-200 hover:border-deep-sea-300 hover:bg-deep-sea-50/40 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-deep-sea-100 text-deep-sea-700 flex items-center justify-center mb-3 group-hover:bg-deep-sea-700 group-hover:text-white transition">
              <RefreshCw size={20} />
            </div>
            <div className="font-semibold text-slate-800 mb-1">重跑</div>
            <div className="text-sm text-slate-500 leading-relaxed">重新运行预警逻辑，保留已确认的状态和人工备注。</div>
          </button>

          <button
            onClick={handleScreenshot}
            className="group text-left p-5 rounded-xl border border-slate-200 hover:border-deep-sea-300 hover:bg-deep-sea-50/40 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-deep-sea-100 text-deep-sea-700 flex items-center justify-center mb-3 group-hover:bg-deep-sea-700 group-hover:text-white transition">
              <ImageIcon size={20} />
            </div>
            <div className="font-semibold text-slate-800 mb-1">查看截图说明</div>
            <div className="text-sm text-slate-500 leading-relaxed">跳转至预警详情页，查看绑定的业务凭证截图说明。</div>
          </button>
        </div>
      </div>
    </div>
  );
}
