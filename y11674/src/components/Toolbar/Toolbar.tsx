import { Play, Pause, Download, Upload, RotateCcw, Database, Eye, EyeOff, Tag, Shuffle } from 'lucide-react';
import { useNetworkStore } from '../../store/useNetworkStore';
export function Toolbar() {
 const { viewParams, setViewParams, generateMockData, saveParams, loadParams, exportReport, resetView, nodes, } = useNetworkStore();
 return (<div className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
 <Tag size={18} className="text-white"/>
 </div>
 <div>
 <h1 className="text-white font-bold text-sm">反欺诈关系网络分析</h1>
 <p className="text-slate-400 text-xs">Anti-Fraud Network Analysis</p>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button onClick={generateMockData} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20" title="生成模拟数据">
 <Shuffle size={16}/>
 造数
 </button>

 <div className="h-8 w-px bg-slate-700 mx-2"/>

 <button onClick={() => setViewParams({ showLabels: !viewParams.showLabels })} className={`p-2 rounded-lg transition-colors ${viewParams.showLabels
 ? 'bg-blue-500/20 text-blue-400'
 : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'}`} title="显示/隐藏标签">
 {viewParams.showLabels ? <Eye size={18}/> : <EyeOff size={18}/>}
 </button>

 <button onClick={() => setViewParams({ showEdges: !viewParams.showEdges })} className={`p-2 rounded-lg transition-colors ${viewParams.showEdges
 ? 'bg-blue-500/20 text-blue-400'
 : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'}`} title="显示/隐藏连线">
 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <line x1="18" y1="20" x2="10" y2="4"/>
 <line x1="14" y1="20" x2="6" y2="4"/>
 </svg>
 </button>

 <button onClick={() => setViewParams({ animationEnabled: !viewParams.animationEnabled })} className={`p-2 rounded-lg transition-colors ${viewParams.animationEnabled
 ? 'bg-blue-500/20 text-blue-400'
 : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'}`} title="启用/禁用动画">
 {viewParams.animationEnabled ? <Play size={18}/> : <Pause size={18}/>}
 </button>

 <div className="h-8 w-px bg-slate-700 mx-2"/>

 <button onClick={resetView} className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm transition-colors" title="重置视图">
 <RotateCcw size={16}/>
 重置
 </button>

 <button onClick={saveParams} className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm transition-colors" title="保存参数">
 <Download size={16}/>
 保存
 </button>

 <button onClick={loadParams} className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm transition-colors" title="加载参数">
 <Upload size={16}/>
 加载
 </button>

 <button onClick={exportReport} disabled={nodes.length === 0} className="flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="导出报告">
 <Database size={16}/>
 导出报告
 </button>
 </div>

 <div className="flex items-center gap-2">
 <span className="text-slate-400 text-sm">
 节点: <span className="text-white font-medium">{nodes.length}</span>
 </span>
 </div>
 </div>);
}

