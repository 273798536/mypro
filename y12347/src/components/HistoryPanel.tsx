import { Trash2, Eye, GitCompare, Edit3, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatNumber, getUnitShortLabel } from '../utils/unitConversion';

export function HistoryPanel() {
  const {
    fitResults,
    activeResultId,
    setActiveResult,
    deleteResult,
    clearAllResults,
    toggleCompareMode,
    compareMode,
    compareResultIds,
    setCompareResultIds,
    loadResultToEditor
  } = useAppStore();

  const [expanded, setExpanded] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleResultClick = (id: string) => {
    if (compareMode) {
      if (!compareResultIds) {
        setCompareResultIds([id, id]);
      } else if (compareResultIds[0] === id) {
        return;
      } else {
        setCompareResultIds([compareResultIds[0], id]);
      }
    } else {
      setActiveResult(id === activeResultId ? null : id);
    }
  };

  const handleLoadToEditor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    loadResultToEditor(id);
  };

  const isSelected = (id: string) => {
    if (compareMode && compareResultIds) {
      return compareResultIds.includes(id);
    }
    return id === activeResultId;
  };

  const isCompare1 = (id: string) => {
    return compareMode && compareResultIds && compareResultIds[0] === id;
  };

  const isCompare2 = (id: string) => {
    return compareMode && compareResultIds && compareResultIds[1] === id;
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除这条拟合记录吗？`)) {
      deleteResult(id);
    }
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearAllResults();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <div className="lab-card">
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">📜</span>
          历史记录
          <span className="text-sm font-normal text-lab-muted">
            ({fitResults.length} 条记录)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCompareMode();
            }}
            className={`lab-btn text-sm flex items-center gap-1 ${
              compareMode 
                ? 'bg-lab-accent/20 border-lab-accent text-lab-accent' 
                : 'bg-transparent border-lab-border text-lab-muted hover:border-lab-accent hover:text-lab-accent'
            }`}
          >
            <GitCompare size={14} />
            {compareMode ? '退出对比' : '对比模式'}
          </button>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {compareMode && (
        <div className="mb-3 p-2 bg-lab-accent/10 border border-lab-accent/30 rounded text-sm text-lab-accent">
          {!compareResultIds 
            ? '请选择第一条记录进行对比'
            : !compareResultIds || compareResultIds[0] === compareResultIds[1]
            ? '请选择第二条记录进行对比'
            : `正在对比 ${compareResultIds.length} 条记录`
          }
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCompareResultIds(null);
            }}
            className="ml-2 text-xs underline"
          >
            重置选择
          </button>
        </div>
      )}

      {expanded && (
        <>
          {fitResults.length === 0 ? (
            <div className="text-center py-8 text-lab-muted">
              <div className="text-4xl mb-2">📭</div>
              <p>暂无拟合记录</p>
              <p className="text-sm mt-1">运行拟合后记录将保存在这里</p>
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-2">
                {fitResults.map((result, index) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result.id)}
                    className={`p-3 rounded border cursor-pointer transition-all duration-200 ${
                      isSelected(result.id)
                        ? compareMode
                          ? isCompare1(result.id)
                            ? 'bg-lab-info/20 border-lab-info'
                            : 'bg-lab-accent/20 border-lab-accent'
                          : 'bg-lab-info/20 border-lab-info'
                        : 'bg-lab-bg border-lab-border hover:border-lab-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {compareMode && isCompare1(result.id) && (
                            <span className="text-xs bg-lab-info text-white px-2 py-0.5 rounded">1</span>
                          )}
                          {compareMode && isCompare2(result.id) && (
                            <span className="text-xs bg-lab-accent text-white px-2 py-0.5 rounded">2</span>
                          )}
                          <span className="font-medium truncate">{result.material.name}</span>
                          <span className="text-xs text-lab-muted flex-shrink-0">
                            #{fitResults.length - index}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                          <span className="text-lab-info">
                            t₁/₂ = {formatNumber(result.halfLife, 3)} {getUnitShortLabel(result.halfLifeUnit)}
                          </span>
                          <span className={result.rSquared >= 0.99 ? 'text-lab-success' : result.rSquared >= 0.95 ? 'text-lab-warning' : 'text-lab-danger'}>
                            R² = {formatNumber(result.rSquared, 4)}
                          </span>
                          <span className="text-lab-muted">
                            {result.dataPoints.length} 点
                          </span>
                          {result.anomalies.length > 0 && (
                            <span className="text-lab-warning">
                              ⚠️ {result.anomalies.length}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-lab-muted mt-1">
                          {new Date(result.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => handleLoadToEditor(result.id, e)}
                          className="p-1.5 rounded hover:bg-lab-surface text-lab-muted hover:text-lab-info transition-colors"
                          title="加载到编辑器"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveResult(result.id === activeResultId ? null : result.id);
                          }}
                          className="p-1.5 rounded hover:bg-lab-surface text-lab-muted hover:text-lab-info transition-colors"
                          title={result.id === activeResultId ? '隐藏详情' : '查看详情'}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(result.id, e)}
                          className="p-1.5 rounded hover:bg-lab-surface text-lab-muted hover:text-lab-danger transition-colors"
                          title="删除记录"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-lab-border flex justify-end">
                <button
                  onClick={handleClearAll}
                  className={`lab-btn text-sm flex items-center gap-1 ${
                    confirmClear
                      ? 'bg-lab-danger border-lab-danger text-white'
                      : 'bg-transparent border-lab-border text-lab-muted hover:border-lab-danger hover:text-lab-danger'
                  }`}
                >
                  {confirmClear ? (
                    <>
                      <Check size={14} />
                      确认清空
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      清空记录
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
