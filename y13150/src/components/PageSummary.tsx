import { useState } from 'react';
import { FileText, Database, AlertTriangle, Clock, Play, HelpCircle, X, CheckCircle, RefreshCw, SplitSquareVertical } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function QuickGuideModal({ isOpen, onClose }: QuickGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-lab-panel border border-lab-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-lab-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <HelpCircle size={20} className="text-lab-accent" />
            快速操作指南
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-lab-border rounded transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="bg-lab-bg rounded-lg p-4 border border-lab-accent/30">
              <h4 className="text-lab-accent font-semibold mb-3 flex items-center gap-2">
                <Play size={16} />
                1. 放样例（加载示例数据）
              </h4>
              <p className="text-gray-300 text-sm mb-3">
                点击页面右上角的「加载示例」按钮，系统会自动加载预设的实验数据，包括：
              </p>
              <ul className="text-sm text-gray-400 space-y-1 ml-5 list-disc">
                <li>8 个实验对象（墙壁、天花板、声源、接收点等）</li>
                <li>7 条维修备注记录（含正常、异常、补录等场景）</li>
                <li>3 组参数配置（标准、夏季、极端条件）</li>
                <li>3 条异常记录（待确认和已确认）</li>
              </ul>
            </div>

            <div className="bg-lab-bg rounded-lg p-4 border border-lab-accent/30">
              <h4 className="text-lab-accent font-semibold mb-3 flex items-center gap-2">
                <RefreshCw size={16} />
                2. 重跑（执行复算）
              </h4>
              <p className="text-gray-300 text-sm mb-3">
                有两种方式执行复算：
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-lab-accent/20 text-lab-accent flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">A</span>
                  <div>
                    <span className="text-white font-medium">单条备注复算</span>
                    <p className="text-gray-400 mt-1">在左侧「维修备注」面板中，点击任意备注展开详情，然后点击「执行复算」按钮</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-lab-accent/20 text-lab-accent flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">B</span>
                  <div>
                    <span className="text-white font-medium">批量复算</span>
                    <p className="text-gray-400 mt-1">在右侧「复算结果」面板中，点击顶部的「重新计算所有」按钮（刷新图标）</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-lab-bg rounded-lg p-4 border border-lab-accent/30">
              <h4 className="text-lab-accent font-semibold mb-3 flex items-center gap-2">
                <FileText size={16} />
                3. 查看页面摘要
              </h4>
              <p className="text-gray-300 text-sm mb-3">
                页面顶部状态栏实时显示关键信息：
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-lab-panel p-3 rounded">
                  <div className="text-lab-accent font-mono text-lg">7</div>
                  <div className="text-gray-500 text-xs">维修备注总数</div>
                </div>
                <div className="bg-lab-panel p-3 rounded">
                  <div className="text-lab-warning font-mono text-lg">2</div>
                  <div className="text-gray-500 text-xs">待确认异常</div>
                </div>
                <div className="bg-lab-panel p-3 rounded">
                  <div className="text-emerald-400 font-mono text-lg">3</div>
                  <div className="text-gray-500 text-xs">参数组</div>
                </div>
                <div className="bg-lab-panel p-3 rounded">
                  <div className="text-purple-400 font-mono text-lg">8</div>
                  <div className="text-gray-500 text-xs">实验对象</div>
                </div>
              </div>
            </div>

            <div className="bg-lab-warning/10 border border-lab-warning/30 rounded-lg p-4">
              <h4 className="text-lab-warning font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                异常处理说明
              </h4>
              <p className="text-sm text-gray-300">
                当检测到极端值、单位不匹配或噪声干扰时，系统会暂停计算并显示橙色警告。
                请负责人确认异常原因后，点击「确认异常，继续计算」按钮方可继续复算。
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <SplitSquareVertical size={16} />
                双参数对照功能
              </h4>
              <p className="text-sm text-gray-300">
                点击复算结果面板右上角的「双参数对照」按钮，选择两组不同参数进行并行计算，
                系统会自动显示结果差异百分比，方便负责人对比分析。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageSummary() {
  const {
    abnormalRecords,
    notes,
    parameterSets,
    objects,
    loadExampleData,
    selectedObjectId,
    toggleCompareMode,
    compareMode
  } = useAppStore();

  const [showGuide, setShowGuide] = useState(false);

  const pendingAbnormal = abnormalRecords.filter(r => !r.confirmed).length;
  const confirmedAbnormal = abnormalRecords.filter(r => r.confirmed).length;

  return (
    <>
      <div className="h-14 bg-lab-panel border-b border-lab-border flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lab-accent to-blue-600 flex items-center justify-center">
              <Database size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">声学混响实验复算</h1>
              <p className="text-xs text-gray-500">Acoustic Reverb Experiment Recalculator</p>
            </div>
          </div>

          <div className="h-8 w-px bg-lab-border" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">备注:</span>
              <span className="text-sm font-mono font-semibold text-white">{notes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-lab-warning" />
              <span className="text-sm text-gray-400">待确认:</span>
              <span className={`text-sm font-mono font-semibold ${pendingAbnormal > 0 ? 'text-lab-warning' : 'text-lab-success'}`}>
                {pendingAbnormal}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-lab-success" />
              <span className="text-sm text-gray-400">已确认:</span>
              <span className="text-sm font-mono font-semibold text-lab-success">{confirmedAbnormal}</span>
            </div>
            <div className="flex items-center gap-2">
              <Database size={14} className="text-purple-400" />
              <span className="text-sm text-gray-400">参数组:</span>
              <span className="text-sm font-mono font-semibold text-purple-400">{parameterSets.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-blue-400" />
              <span className="text-sm text-gray-400">对象:</span>
              <span className="text-sm font-mono font-semibold text-blue-400">{objects.length}</span>
            </div>
          </div>

          {selectedObjectId && (
            <>
              <div className="h-8 w-px bg-lab-border" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">当前选中:</span>
                <span className="text-sm font-medium text-lab-accent">
                  {objects.find(o => o.id === selectedObjectId)?.name}
                </span>
              </div>
            </>
          )}

          {compareMode && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-lab-accent/20 border border-lab-accent/50 rounded text-xs text-lab-accent">
              <SplitSquareVertical size={12} />
              双参数对照模式
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-lab-border/50 hover:bg-lab-border text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            <HelpCircle size={14} />
            操作指南
          </button>
          <button
            onClick={toggleCompareMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              compareMode
                ? 'bg-lab-accent text-white'
                : 'bg-lab-border/50 hover:bg-lab-border text-gray-300 hover:text-white'
            }`}
          >
            <SplitSquareVertical size={14} />
            {compareMode ? '退出对照' : '双参数对照'}
          </button>
          <button
            onClick={loadExampleData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-lab-accent to-blue-600 hover:from-lab-accent-dark hover:to-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-lab-accent/20"
          >
            <Play size={14} />
            加载示例
          </button>
        </div>
      </div>

      <QuickGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
