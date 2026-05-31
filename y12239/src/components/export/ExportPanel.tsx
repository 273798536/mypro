import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { GameSession, ExportOptions } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { generateReviewDetails } from '@/utils/export';
import { cn } from '@/lib/utils';

interface ExportPanelProps {
  session: GameSession;
}

export function ExportPanel({ session }: ExportPanelProps) {
  const { exportReport } = useGameStore();
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [includeReviewDetails, setIncludeReviewDetails] = useState(true);
  const [includeCorrections, setIncludeCorrections] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const reviewDetails = generateReviewDetails(session);
  const hasScoreReport = !!session.scoreReport;
  const hasCorrections = session.corrections.length > 0;

  const handleExport = () => {
    if (!hasScoreReport) return;

    setIsExporting(true);
    setExportSuccess(false);

    const options: ExportOptions = {
      format,
      includeReviewDetails,
      includeCorrections,
      timestamp: Date.now(),
    };

    setTimeout(() => {
      exportReport(session.id, options);
      setIsExporting(false);
      setExportSuccess(true);

      setTimeout(() => setExportSuccess(false), 3000);
    }, 500);
  };

  const getExportPreview = () => {
    if (!hasScoreReport) return null;

    const preview = [];
    preview.push(`学生: ${session.playerName}`);
    preview.push(`总分: ${session.scoreReport?.totalScore} / ${session.scoreReport?.maxScore}`);
    preview.push(`等级: ${session.scoreReport?.grade}`);

    if (includeReviewDetails) {
      preview.push(`复核详情: ${reviewDetails.length} 条测绘点记录`);
    }

    if (includeCorrections && hasCorrections) {
      preview.push(`修正记录: ${session.corrections.length} 条`);
    }

    return preview;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#0F3460]/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#16C79A]/10 rounded-lg">
          <Download size={20} className="text-[#16C79A]" />
        </div>
        <div>
          <h3 className="font-bold text-[#0F3460] text-lg">成绩导出</h3>
          <p className="text-sm text-[#2C3E50]/60">
            导出包含测绘点、角度尺和成绩完整对应关系的报告
          </p>
        </div>
      </div>

      {!hasScoreReport ? (
        <div className="text-center py-8 text-[#2C3E50]/50">
          <AlertTriangle size={40} className="mx-auto mb-3 text-[#FFD93D]" />
          <p className="font-medium">暂无成绩报告</p>
          <p className="text-sm">完成测绘任务并提交后可导出成绩</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-3">
              选择导出格式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('json')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                  format === 'json'
                    ? 'border-[#0F3460] bg-[#0F3460]/5 shadow-md'
                    : 'border-[#0F3460]/10 hover:border-[#0F3460]/30 hover:bg-[#0F3460]/5'
                )}
              >
                <FileJson
                  size={32}
                  className={format === 'json' ? 'text-[#0F3460]' : 'text-[#2C3E50]/40'}
                />
                <span
                  className={cn(
                    'font-medium',
                    format === 'json' ? 'text-[#0F3460]' : 'text-[#2C3E50]/60'
                  )}
                >
                  JSON 格式
                </span>
                <span className="text-xs text-[#2C3E50]/40">
                  适合程序解析
                </span>
              </button>

              <button
                onClick={() => setFormat('csv')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                  format === 'csv'
                    ? 'border-[#16C79A] bg-[#16C79A]/5 shadow-md'
                    : 'border-[#0F3460]/10 hover:border-[#0F3460]/30 hover:bg-[#0F3460]/5'
                )}
              >
                <FileSpreadsheet
                  size={32}
                  className={format === 'csv' ? 'text-[#16C79A]' : 'text-[#2C3E50]/40'}
                />
                <span
                  className={cn(
                    'font-medium',
                    format === 'csv' ? 'text-[#16C79A]' : 'text-[#2C3E50]/60'
                  )}
                >
                  CSV 格式
                </span>
                <span className="text-xs text-[#2C3E50]/40">
                  适合 Excel 查看
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#2C3E50]">
              导出内容选项
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-[#0F3460]/10 hover:bg-[#0F3460]/5 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={includeReviewDetails}
                onChange={(e) => setIncludeReviewDetails(e.target.checked)}
                className="w-5 h-5 rounded border-[#0F3460]/30 text-[#0F3460] focus:ring-[#0F3460] focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="font-medium text-[#2C3E50]">包含复核详情</div>
                <div className="text-xs text-[#2C3E50]/50">
                  测绘点ID、角度尺参数、三角函数值、得分的完整对应关系
                </div>
              </div>
              <FileText size={18} className="text-[#0F3460]/40" />
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-[#0F3460]/10 hover:bg-[#0F3460]/5 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={includeCorrections}
                onChange={(e) => setIncludeCorrections(e.target.checked)}
                disabled={!hasCorrections}
                className={cn(
                  'w-5 h-5 rounded border-[#0F3460]/30 text-[#0F3460] focus:ring-[#0F3460] focus:ring-offset-0',
                  !hasCorrections && 'opacity-50 cursor-not-allowed'
                )}
              />
              <div className="flex-1">
                <div className={cn(
                  'font-medium',
                  hasCorrections ? 'text-[#2C3E50]' : 'text-[#2C3E50]/30'
                )}>
                  包含修正记录
                </div>
                <div className="text-xs text-[#2C3E50]/50">
                  {hasCorrections
                    ? `${session.corrections.length} 条教师修正记录，含新旧值对比`
                    : '暂无修正记录'}
                </div>
              </div>
              {hasCorrections ? (
                <span className="text-xs bg-[#FFD93D]/20 text-[#b8860b] px-2 py-1 rounded-full">
                  {session.corrections.length} 条
                </span>
              ) : (
                <AlertTriangle size={18} className="text-[#2C3E50]/20" />
              )}
            </label>
          </div>

          <div className="bg-[#F5F7FA] rounded-xl p-4">
            <div className="text-xs font-semibold text-[#2C3E50]/50 uppercase tracking-wider mb-3">
              导出内容预览
            </div>
            <div className="space-y-2">
              {getExportPreview()?.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#2C3E50]">
                  <CheckCircle size={14} className="text-[#16C79A] flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {exportSuccess && (
            <div className="flex items-center gap-2 p-3 bg-[#16C79A]/10 border border-[#16C79A]/30 rounded-lg">
              <CheckCircle size={18} className="text-[#16C79A]" />
              <span className="text-sm font-medium text-[#16C79A]">
                导出成功！文件已下载
              </span>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting || !hasScoreReport}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-all duration-300',
              isExporting
                ? 'bg-[#0F3460]/50 cursor-wait'
                : 'bg-gradient-to-r from-[#0F3460] to-[#1a4a8a] hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
            )}
            style={{ color: 'white' }}
          >
            {isExporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>正在导出...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>导出 {format.toUpperCase()} 文件</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
