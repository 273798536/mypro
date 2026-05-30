import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { formatDate, formatNumber } from '@/utils/dataProcessor';
import { Database, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function DataTable() {
  const { analysisResult, analysisParams, selectedWarning } = useAppStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedRows, setHighlightedRows] = useState<Set<number>>(new Set());

  const filteredData = useMemo(() => {
    if (!analysisResult) return [];
    
    let data = analysisResult.alignedData;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(term)
        )
      );
    }
    
    return data;
  }, [analysisResult, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const allFields = useMemo(() => {
    if (!analysisResult || analysisResult.alignedData.length === 0) return [];
    
    const fields = new Set<string>();
    analysisResult.alignedData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!key.startsWith('__')) fields.add(key);
      });
    });
    
    return ['__sourceFile', '__rowIndex', ...Array.from(fields)];
  }, [analysisResult]);

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Database className="h-12 w-12 mb-3 opacity-50" />
        <p>请先完成数据上传和参数配置，然后点击开始分析</p>
      </div>
    );
  }

  const fieldLabels: Record<string, string> = {
    '__sourceFile': '来源文件',
    '__rowIndex': '原始行号'
  };

  const toggleHighlight = (rowIndex: number) => {
    setHighlightedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-slate-400" />
          <h3 className="font-medium text-slate-200">数据明细</h3>
          <span className="text-xs text-slate-500">
            共 {filteredData.length} 行数据
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜索数据..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-48"
            />
          </div>
        </div>
      </div>

      {selectedWarning && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
          <p className="text-sm text-amber-300">
            当前筛选：<span className="font-medium">{selectedWarning.title}</span>
            <span className="text-amber-400/70 ml-2">
              （来源：{selectedWarning.sourceFile}，行号：{selectedWarning.sourceRows.join(', ')}）
            </span>
          </p>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50 sticky top-0">
                {allFields.map(field => (
                  <th
                    key={field}
                    className="text-left p-3 text-slate-300 font-medium whitespace-nowrap"
                  >
                    {fieldLabels[field] || field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const globalIdx = (currentPage - 1) * PAGE_SIZE + idx;
                const isHighlighted = highlightedRows.has(globalIdx);
                const isInWarning = selectedWarning?.sourceRows.includes(row.__rowIndex) &&
                  selectedWarning?.sourceFile === row.__sourceFile;
                
                return (
                  <tr
                    key={idx}
                    onClick={() => toggleHighlight(globalIdx)}
                    className={cn(
                      "border-t border-slate-700 hover:bg-slate-700/30 transition-colors cursor-pointer",
                      isHighlighted && "bg-cyan-900/20",
                      isInWarning && "bg-amber-900/20"
                    )}
                  >
                    {allFields.map((field, fieldIdx) => {
                      let value = row[field];
                      let displayValue: string;
                      
                      if (field === analysisParams.timeField && value instanceof Date) {
                        displayValue = formatDate(value);
                      } else if (typeof value === 'number' && fieldIdx > 1) {
                        displayValue = formatNumber(value, 2);
                      } else {
                        displayValue = value !== null && value !== undefined ? String(value) : '-';
                      }
                      
                      return (
                        <td
                          key={field}
                          className={cn(
                            "p-3 whitespace-nowrap",
                            field === '__sourceFile' ? 'text-cyan-400 font-mono text-xs' :
                            field === '__rowIndex' ? 'text-slate-500 font-mono text-xs' :
                            'text-slate-200 font-mono'
                          )}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginatedData.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            没有找到匹配的数据
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-700">
            <span className="text-xs text-slate-500">
              第 {currentPage} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-400" />
              </button>
              <span className="text-sm text-slate-300 px-2 font-mono">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-900/50 border border-amber-700/50" />
            警告相关行
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-900/50 border border-cyan-700/50" />
            已选中行
          </span>
          <span>点击行可标记/取消标记</span>
        </div>
      </div>
    </div>
  );
}
