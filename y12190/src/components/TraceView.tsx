import React from 'react';
import { GitBranch, Music, FileText, Sparkles, CheckCircle, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TraceNodeType } from '../types';

const TraceView: React.FC = () => {
  const { traceNodes, selectedTraceNodeId, selectTraceNode, setCurrentMeasure, getMeasureById } = useStore();

  const getNodeIcon = (type: TraceNodeType) => {
    switch (type) {
      case 'audio':
        return <Music size={16} />;
      case 'transcription':
        return <FileText size={16} />;
      case 'motif':
        return <Sparkles size={16} />;
      case 'accidental':
        return <Music size={16} />;
      case 'conclusion':
        return <CheckCircle size={16} />;
      default:
        return <GitBranch size={16} />;
    }
  };

  const getNodeColor = (type: TraceNodeType) => {
    switch (type) {
      case 'audio':
        return 'bg-jazz-burgundy-700 border-jazz-burgundy-500';
      case 'transcription':
        return 'bg-jazz-blue-700 border-jazz-blue-500';
      case 'motif':
        return 'bg-jazz-gold-700 border-jazz-gold-500';
      case 'accidental':
        return 'bg-purple-700 border-purple-500';
      case 'conclusion':
        return 'bg-green-700 border-green-500';
      default:
        return 'bg-jazz-ink-600 border-jazz-ink-500';
    }
  };

  const getNodeLabel = (type: TraceNodeType) => {
    switch (type) {
      case 'audio':
        return '录音';
      case 'transcription':
        return '转写';
      case 'motif':
        return '动机';
      case 'accidental':
        return '外音';
      case 'conclusion':
        return '结论';
      default:
        return type;
    }
  };

  const handleNodeClick = (node: any) => {
    selectTraceNode(selectedTraceNodeId === node.id ? null : node.id);
    if (node.measureId) {
      setCurrentMeasure(node.measureId);
    }
  };

  const renderNode = (node: any, level: number = 0, isLast: boolean = false) => {
    const isSelected = selectedTraceNodeId === node.id;
    const measure = node.measureId ? getMeasureById(node.measureId) : null;

    return (
      <div key={node.id} className="relative">
        <div className="flex items-start">
          <div className="flex flex-col items-center mr-3">
            <button
              onClick={() => handleNodeClick(node)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                border-2 transition-all duration-200
                ${getNodeColor(node.type)}
                ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-jazz-ink-800 scale-110' : 'hover:scale-105'}
              `}
            >
              {getNodeIcon(node.type)}
            </button>
            {node.children.length > 0 && (
              <div className="w-0.5 h-full min-h-[40px] bg-jazz-ink-600 mt-1"></div>
            )}
          </div>

          <div className="flex-1 pb-4">
            <div
              onClick={() => handleNodeClick(node)}
              className={`
                p-3 rounded-lg cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'bg-jazz-ink-700 border border-jazz-burgundy-500/50' 
                  : 'bg-jazz-ink-700/50 hover:bg-jazz-ink-700 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-jazz-ink-600 text-jazz-ink-300">
                  {getNodeLabel(node.type)}
                </span>
                {measure && (
                  <span className="text-xs font-mono px-1.5 py-0.5 bg-jazz-burgundy-700/30 text-jazz-burgundy-300 rounded">
                    m{measure.measureNumber}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-jazz-ink-100 mt-1">{node.title}</h4>
              <p className="text-sm text-jazz-ink-400 mt-1">{node.description}</p>
            </div>

            {isSelected && measure && (
              <div className="mt-2 p-3 bg-jazz-ink-900/50 rounded-lg border border-jazz-ink-600 animate-slide-in">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-jazz-ink-400">关联小节</span>
                  <span className="font-mono text-jazz-gold-400">
                    {measure.chord}
                  </span>
                </div>
                {measure.problemType && (
                  <div className="mt-2 pt-2 border-t border-jazz-ink-600">
                    <span className="text-xs text-jazz-ink-500">问题标记</span>
                    <p className="text-sm text-jazz-burgundy-300 mt-1">
                      {measure.problemExplanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {node.children.length > 0 && (
              <div className="mt-3 ml-4 space-y-3">
                {node.children.map((child: any, index: number) =>
                  renderNode(child, level + 1, index === node.children.length - 1)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-jazz-ink-800 rounded-lg border border-jazz-ink-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-jazz-ink-700 flex items-center gap-2">
        <GitBranch size={18} className="text-jazz-burgundy-400" />
        <h3 className="font-display text-lg text-jazz-ink-100">追溯链路</h3>
        <span className="ml-auto text-xs text-jazz-ink-500">
          点击节点查看详情
        </span>
      </div>

      <div className="p-4 max-h-[400px] overflow-y-auto scrollbar-thin">
        <div className="text-xs text-jazz-ink-500 mb-4 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-jazz-burgundy-700"></span>
            录音
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-jazz-blue-700"></span>
            转写
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-jazz-gold-700"></span>
            动机
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-700"></span>
            外音
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-700"></span>
            结论
          </span>
        </div>

        <div className="space-y-3">
          {traceNodes.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
};

export default TraceView;
