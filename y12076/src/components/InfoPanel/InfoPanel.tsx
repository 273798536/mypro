import { motion } from 'framer-motion';
import { AlertTriangle, FileText, Info, MousePointer2 } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import { ConflictAlert } from './ConflictAlert';
import { ReportCard } from './ReportCard';

export function InfoPanel() {
  const { conflicts, issues, interaction, magnets, fieldLineParams, fieldLineVersion } = useConfigStore();
  
  const unresolvedConflicts = conflicts.filter(c => !c.resolved);
  const activeIssues = issues;

  const getInteractionInstructions = () => {
    if (interaction.isDragging) {
      return {
        title: '正在拖动磁体',
        content: '松开鼠标完成移动。场线将在释放后自动重新计算。',
        icon: <MousePointer2 className="w-4 h-4 text-yellow-400" />,
        highlight: true,
      };
    }
    
    if (interaction.isPaused) {
      return {
        title: '动画已暂停',
        content: '点击"继续"按钮恢复场线动画。暂停时可以更清晰地观察场线结构。',
        icon: <Info className="w-4 h-4 text-blue-400" />,
        highlight: false,
      };
    }

    if (magnets.length > 1) {
      return {
        title: '多磁体模式',
        content: `当前有 ${magnets.length} 个磁体。拖动任意磁体观察场线变化，或点击磁体选中后调整参数。`,
        icon: <Info className="w-4 h-4 text-cyan-400" />,
        highlight: false,
      };
    }

    return {
      title: '交互提示',
      content: '拖动磁体移动位置，使用左侧面板调整磁极方向和场线参数。场线版本: ' + fieldLineVersion,
      icon: <Info className="w-4 h-4 text-slate-400" />,
      highlight: false,
    };
  };

  const instructions = getInteractionInstructions();

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      className="w-80 h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-700 flex flex-col"
    >
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-slate-200">信息面板</h2>
        <p className="text-xs text-slate-400 mt-1">冲突检测与问题报告</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={`rounded-lg p-3 border ${
          instructions.highlight 
            ? 'bg-yellow-900/20 border-yellow-500/30' 
            : 'bg-slate-800/50 border-slate-700'
        }`}>
          <div className="flex items-start gap-2">
            {instructions.icon}
            <div>
              <h4 className={`text-sm font-medium ${
                instructions.highlight ? 'text-yellow-400' : 'text-slate-200'
              }`}>
                {instructions.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {instructions.content}
              </p>
            </div>
          </div>
        </div>

        {unresolvedConflicts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              配置冲突 ({unresolvedConflicts.length})
            </h3>
            <div className="space-y-2">
              {unresolvedConflicts.map((conflict) => (
                <ConflictAlert key={conflict.id} conflict={conflict} />
              ))}
            </div>
          </div>
        )}

        {activeIssues.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              问题报告 ({activeIssues.length})
            </h3>
            <div className="space-y-2">
              {activeIssues.map((issue) => (
                <ReportCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {unresolvedConflicts.length === 0 && activeIssues.length === 0 && (
          <div className="bg-slate-800/30 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-slate-200">系统运行正常</h4>
            <p className="text-xs text-slate-400 mt-1">
              未检测到配置冲突或问题。
            </p>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">当前配置摘要</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">磁体数量</span>
              <span className="text-slate-200 font-mono">{magnets.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">采样密度</span>
              <span className={`font-mono ${
                fieldLineParams.sampleDensity > 8 ? 'text-yellow-400' : 'text-slate-200'
              }`}>
                {fieldLineParams.sampleDensity}
                {fieldLineParams.sampleDensity > 8 && ' ⚠️'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">场线数量</span>
              <span className="text-slate-200 font-mono">{fieldLineParams.lineCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">场强上限</span>
              <span className="text-slate-200 font-mono">{fieldLineParams.maxFieldStrength}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">场线版本</span>
              <span className="text-cyan-400 font-mono">v{fieldLineVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">动画状态</span>
              <span className={interaction.isPaused ? 'text-yellow-400' : 'text-green-400'}>
                {interaction.isPaused ? '⏸️ 暂停' : '▶️ 播放'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">📚 物理知识</h3>
          <div className="text-xs text-slate-400 space-y-2">
            <p>
              <span className="text-red-400">● N极</span> 发出场线，
              <span className="text-blue-400">● S极</span> 接收场线。
            </p>
            <p>
              场线密度代表磁场强度，越密集表示磁场越强。
            </p>
            <p>
              同名磁极相互排斥，异名磁极相互吸引。
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
