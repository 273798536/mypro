import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Save, User, Calendar } from 'lucide-react';
import { useAppStore } from '../../store';
import type { ExplanationReport } from '../../../shared/types';

interface ReportFormProps {
  productId: string | null;
  report: ExplanationReport | null;
  hasConflict: boolean;
}

export function ReportForm({ productId, report, hasConflict }: ReportFormProps) {
  const { updateReport } = useAppStore();
  const [formData, setFormData] = useState<Partial<ExplanationReport>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (report) {
      setFormData(report);
      setIsEditing(false);
    } else if (productId) {
      setFormData({
        productId,
        content: '',
        reporter: '',
        reportTime: Date.now(),
        sourceMaterial: '',
      });
      setIsEditing(true);
    }
  }, [report, productId]);

  if (!productId) {
    return null;
  }

  const handleChange = (field: keyof ExplanationReport, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (formData.productId) {
      updateReport(formData.productId, formData);
      setIsEditing(false);
    }
  };

  const detectYields = () => {
    if (!formData.content) return [];
    const yieldMatch = formData.content.match(/(\d+(?:\.\d+)?)\s*%/g);
    if (yieldMatch) {
      return yieldMatch.map((y) => parseFloat(y.replace('%', '')));
    }
    return [];
  };

  const detectedYields = detectYields();

  return (
    <div className="space-y-4 pt-4 border-t border-space-600">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-cyber-400 text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          讲解报告
        </h3>
        {hasConflict && (
          <span className="flex items-center gap-1 text-xs text-warning-400 bg-warning-500/10 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3" />
            口径冲突
          </span>
        )}
      </div>

      <div className={`space-y-4 ${hasConflict ? 'border-l-2 border-warning-500 pl-3' : ''}`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
              <User className="w-3 h-3" />
              讲解人
            </label>
            <input
              type="text"
              value={formData.reporter || ''}
              onChange={(e) => handleChange('reporter', e.target.value)}
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              报告时间
            </label>
            <input
              type="datetime-local"
              value={formData.reportTime ? new Date(formData.reportTime).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleChange('reportTime', new Date(e.target.value).getTime())}
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">讲解内容</label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => handleChange('content', e.target.value)}
            rows={6}
            placeholder="输入讲解内容，系统将自动检测其中的收益率数字..."
            className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors resize-none font-mono leading-relaxed"
          />
        </div>

        {detectedYields.length > 0 && (
          <div className="bg-space-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">检测到的收益率数字</div>
            <div className="flex flex-wrap gap-2">
              {detectedYields.map((y, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-cyber-500/20 text-cyber-400 rounded text-xs font-mono"
                >
                  {y}%
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1">声称收益率 (%)</label>
          <input
            type="number"
            step="0.01"
            value={formData.claimedYield ?? ''}
            onChange={(e) => handleChange('claimedYield', parseFloat(e.target.value))}
            placeholder="从上方内容中选择或手动输入"
            className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">材料来源</label>
          <input
            type="text"
            value={formData.sourceMaterial || ''}
            onChange={(e) => handleChange('sourceMaterial', e.target.value)}
            className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
          />
        </div>

        {isEditing && (
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-cyber-500 hover:bg-cyber-400 text-space-900 font-semibold py-2 px-4 rounded transition-colors"
          >
            <Save className="w-4 h-4" />
            保存讲解报告
          </button>
        )}
      </div>
    </div>
  );
}
