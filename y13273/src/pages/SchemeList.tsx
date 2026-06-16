import { useMemo } from 'react';
import { FilterBar } from '../components/FilterBar';
import { SchemeCard } from '../components/SchemeCard';
import { useSchemeStore } from '../store/useSchemeStore';
import { AlertTriangle, FileText, BarChart3 } from 'lucide-react';

export function SchemeList() {
  const schemes = useSchemeStore((s) => s.schemes);
  const materials = useSchemeStore((s) => s.materials);
  const filters = useSchemeStore((s) => s.filters);

  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      if (filters.keyword && !s.name.toLowerCase().includes(filters.keyword.toLowerCase())) {
        return false;
      }
      if (filters.onlyOverload && !s.hasCapacityOverload) return false;
      if (filters.status !== 'all' && s.status !== filters.status) return false;
      if (filters.onlyIncomplete) {
        const count = materials.filter((m) => m.schemeId === s.id).length;
        if (count >= 3) return false;
      }
      return true;
    });
  }, [schemes, materials, filters]);

  const overloadCount = useMemo(
    () => schemes.filter((s) => s.hasCapacityOverload).length,
    [schemes]
  );
  const lateCount = useMemo(
    () => materials.filter((m) => m.isLateArrival).length,
    [materials]
  );
  const dirtyCount = useMemo(
    () => materials.filter((m) => m.isDirty).length,
    [materials]
  );

  return (
    <div className="min-h-screen bg-slateX-50">
      <header className="bg-white border-b border-slateX-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-engineering-800 rounded-sm flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg text-slateX-900 leading-tight">公交港湾方案比选</h1>
              <p className="text-xs text-slateX-500">巡检材料留痕 · 决策依据可追溯</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs text-slateX-500">
            <span className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-alert-600" />
              超限方案 {overloadCount}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={12} className="text-amberX-600" />
              晚到附件 {lateCount}
            </span>
            <span>总方案 {schemes.length}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        <aside className="w-64 flex-shrink-0">
          <FilterBar />

          <div className="mt-4 p-3 bg-amberX-50 border border-amberX-200 rounded-sm">
            <div className="text-xs font-medium text-amberX-800 mb-1">坏材料来了该看哪里</div>
            <ul className="text-[11px] text-amberX-700 space-y-1 list-disc list-inside leading-relaxed">
              <li>卡片右上角 <span className="font-mono">容量超限</span> 红标</li>
              <li>详情页材料 <span className="font-mono">红色虚线边框</span></li>
              <li>原因链中 <span className="font-mono">晚到附件影响</span> 标记</li>
              <li>导出 ZIP 中的 <span className="font-mono">flags.json</span></li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-white border border-slateX-200 rounded-sm">
            <div className="text-xs font-medium text-slateX-700 mb-1">快速操作</div>
            <ul className="text-[11px] text-slateX-600 space-y-1.5 leading-relaxed">
              <li>1. 点卡片进入方案详情</li>
              <li>2. 「补录照片」新增巡检材料</li>
              <li>3. 「重跑比选」重新计算结论</li>
              <li>4. 下方时间线查看所有变更</li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {filteredSchemes.length === 0 ? (
            <div className="bg-white border border-slateX-200 rounded-sm p-12 text-center">
              <FileText size={32} className="mx-auto text-slateX-300 mb-2" />
              <p className="text-sm text-slateX-500">没有匹配的方案，试试调整筛选条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSchemes.map((scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} />
              ))}
            </div>
          )}
        </main>
      </div>

      <footer className="max-w-7xl mx-auto px-6 py-6 text-xs text-slateX-400 font-mono">
        共 {schemes.length} 个方案 · {materials.length} 份材料 · 原始痕迹 {dirtyCount} 份未清洗
      </footer>
    </div>
  );
}
