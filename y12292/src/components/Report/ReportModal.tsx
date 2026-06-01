
import { useState } from 'react';
import { X, Download, FileText, AlertTriangle, CheckCircle, AlertCircle, Copy, Share2 } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import type { Problem } from '../../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [exporting, setExporting] = useState(false);
  const problems = useDataStore(state => state.problems);
  const beacons = useDataStore(state => state.beacons);
  const trajectories = useDataStore(state => state.trajectories);
  
  if (!isOpen) return null;
  
  const highCount = problems.filter(p => p.severity === 'high').length;
  const mediumCount = problems.filter(p => p.severity === 'medium').length;
  const lowCount = problems.filter(p => p.severity === 'low').length;
  
  const passRate = problems.length === 0 ? 100 : Math.max(0, Math.round((1 - highCount / problems.length) * 100));
  
  const handleExport = async () => {
    setExporting(true);
    
    try {
      const reportContent = generateReportText();
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `定位质量报告-${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };
  
  const generateReportText = () => {
    let text = '='.repeat(60) + '\n';
    text += '           室内定位质量检测报告\n';
    text += '='.repeat(60) + '\n\n';
    text += `生成时间: ${new Date().toLocaleString()}\n`;
    text += '-'.repeat(60) + '\n\n';
    
    text += '【一、数据概览】\n\n';
    text += `  • 信标设备数量: ${beacons.length} 个\n`;
    text += `  • 定位轨迹点数: ${trajectories.length} 个\n`;
    text += `  • 检测到问题数: ${problems.length} 个\n\n`;
    
    text += '【二、验收结果】\n\n';
    text += `  通过率: ${passRate}%\n\n`;
    
    if (highCount > 0) {
      text += '  ❌ 严重问题: ' + highCount + ' 个 (需要立即修复)\n';
    }
    if (mediumCount > 0) {
      text += '  ⚠️  中等问题: ' + mediumCount + ' 个 (建议优化)\n';
    }
    if (lowCount > 0) {
      text += '  🟡 轻微问题: ' + lowCount + ' 个 (可后续处理)\n';
    }
    if (problems.length === 0) {
      text += '  ✅ 未检测到问题，定位质量良好！\n';
    }
    text += '\n';
    
    text += '【三、问题详情】\n';
    text += '-'.repeat(60) + '\n\n';
    
    if (problems.length === 0) {
      text += '  本次检测未发现问题。\n\n';
    } else {
      problems.forEach((problem, index) => {
        text += `\n问题 ${index + 1}: ${problem.title}\n`;
        text += `严重程度: ${getSeverityText(problem.severity)}\n`;
        text += `\n📝 技术说明:\n  ${problem.description}\n\n`;
        text += `💡 人话解释:\n  ${problem.humanReadable}\n\n`;
        text += `🔍 证据:\n`;
        problem.evidence.forEach(e => {
          text += `    • ${e}\n`;
        });
        text += '\n' + '-'.repeat(40) + '\n';
      });
    }
    
    text += '\n【四、改进建议】\n\n';
    
    const hasFloorJump = problems.some(p => p.type === 'floor_jump');
    const hasDuplicate = problems.some(p => p.type === 'duplicate_beacon');
    const hasDrift = problems.some(p => p.type === 'trajectory_drift');
    
    if (hasFloorJump) {
      text += '1. 针对楼层串跳问题:\n';
      text += '   • 检查各楼层信标的发射功率，适当降低以减少跨层干扰\n';
      text += '   • 在楼层交界处增加信标密度，提高定位精度\n';
      text += '   • 优化定位算法，增加楼层切换的平滑处理\n\n';
    }
    
    if (hasDuplicate) {
      text += '2. 针对信标重号问题:\n';
      text += '   • 立即现场核查所有信标的MAC地址配置\n';
      text += '   • 建立信标设备台账，确保每个物理设备唯一标识\n';
      text += '   • 部署前进行全场设备扫描，避免冲突\n\n';
    }
    
    if (hasDrift) {
      text += '3. 针对轨迹漂移问题:\n';
      text += '   • 检查漂移区域附近是否有金属物体或大型设备\n';
      text += '   • 排查是否有其他无线设备造成信号干扰\n';
      text += '   • 增加信标密度，优化信号覆盖\n\n';
    }
    
    if (problems.length === 0) {
      text += '  当前定位系统运行良好，建议：\n';
      text += '  • 定期进行信号巡检，确保信标正常工作\n';
      text += '  • 记录环境变化，及时调整信标布局\n';
      text += '  • 持续收集定位数据，优化算法参数\n';
    }
    
    text += '\n' + '='.repeat(60) + '\n';
    text += '报告结束\n';
    text += '='.repeat(60) + '\n';
    
    return text;
  };
  
  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴 严重';
      case 'medium': return '🟡 中等';
      case 'low': return '🟢 轻微';
      default: return '⚪ 未知';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'floor_jump': return '⬆️';
      case 'duplicate_beacon': return '⚠️';
      case 'trajectory_drift': return '💨';
      default: return '❓';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">定位质量检测报告</h2>
                <p className="text-gray-500 text-sm">可导出分享给非技术同事查看</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-4 text-center border border-green-500/30">
              <div className="text-3xl font-bold text-green-400 mb-1">{passRate}%</div>
              <div className="text-green-400/70 text-xs">通过率</div>
            </div>
            <div className="bg-red-500/10 rounded-2xl p-4 text-center border border-red-500/30">
              <div className="text-3xl font-bold text-red-400 mb-1">{highCount}</div>
              <div className="text-red-400/70 text-xs">严重问题</div>
            </div>
            <div className="bg-yellow-500/10 rounded-2xl p-4 text-center border border-yellow-500/30">
              <div className="text-3xl font-bold text-yellow-400 mb-1">{mediumCount}</div>
              <div className="text-yellow-400/70 text-xs">中等问题</div>
            </div>
            <div className="bg-blue-500/10 rounded-2xl p-4 text-center border border-blue-500/30">
              <div className="text-3xl font-bold text-blue-400 mb-1">{beacons.length}</div>
              <div className="text-blue-400/70 text-xs">信标数量</div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              问题列表（人话版）
            </h3>
            <div className="space-y-4">
              {problems.length === 0 ? (
                <div className="bg-green-500/10 rounded-2xl p-6 text-center border border-green-500/30">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <div className="text-green-400 font-bold">未检测到问题</div>
                  <div className="text-green-400/70 text-sm">定位系统运行良好，继续保持！</div>
                </div>
              ) : (
                problems.map(problem => (
                  <div
                    key={problem.id}
                    className={`rounded-2xl p-4 border ${
                      problem.severity === 'high'
                        ? 'bg-red-500/10 border-red-500/30'
                        : problem.severity === 'medium'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{getTypeIcon(problem.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-bold">{problem.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            problem.severity === 'high'
                              ? 'bg-red-500/20 text-red-400'
                              : problem.severity === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {problem.severity === 'high' ? '严重' : problem.severity === 'medium' ? '中等' : '轻微'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">{problem.description}</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-xl p-3 ml-9">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-400 text-xs font-bold">人话解释</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {problem.humanReadable}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              报告生成时间: {new Date().toLocaleString()}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-gray-400 hover:bg-slate-700 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    导出报告
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

