import { useMemo } from 'react';
import { Download, FileText, AlertTriangle, MessageSquare, Layers } from 'lucide-react';
import FilterBar from '@/components/FilterBar/FilterBar';
import MaterialCard from '@/components/MaterialCard/MaterialCard';
import { useMaterialStore } from '@/store/useMaterialStore';
import { generateCSV, downloadCSV } from '@/utils/csvExport';
import { formatCurrency } from '@/utils/dateFormat';
import { cn } from '@/lib/utils';

export default function MaterialList() {
  const {
    getFilteredMaterials,
    lessons,
    filters,
    materials,
  } = useMaterialStore();

  const filteredMaterials = useMemo(() => getFilteredMaterials(), [getFilteredMaterials]);

  const filteredLessons = useMemo(() => {
    const materialIds = new Set(filteredMaterials.map((m) => m.id));
    return lessons.filter((l) => materialIds.has(l.materialId));
  }, [filteredMaterials, lessons]);

  const stats = useMemo(() => {
    const totalAmount = filteredMaterials.reduce((sum, m) => sum + m.totalAmount, 0);
    const mismatchCount = filteredMaterials.filter((m) => m.hasNameMismatch).length;
    const annotatedCount = filteredMaterials.filter((m) => m.hasManualAnnotation).length;
    const multiVersionCount = filteredMaterials.filter((m) => {
      const versions = useMaterialStore.getState().versions.filter((v) => v.materialId === m.id);
      return versions.length > 1;
    }).length;

    return {
      totalAmount,
      materialCount: filteredMaterials.length,
      lessonCount: filteredLessons.length,
      mismatchCount,
      annotatedCount,
      multiVersionCount,
    };
  }, [filteredMaterials, filteredLessons]);

  const handleExport = () => {
    const csvContent = generateCSV({
      materials: filteredMaterials,
      lessons: filteredLessons,
      filters,
      exportTime: new Date().toLocaleString('zh-CN'),
    });

    const filename = `琴房课时分账对齐_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);

    useMaterialStore.getState().addOperationLog(
      'system',
      'export',
      '演出统筹-阿蓝',
      `导出CSV - 共${filteredMaterials.length}条材料`,
    );
  };

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-[#0F2B4D] mb-1">
          琴房课时分账对齐
        </h1>
        <p className="text-sm text-gray-500">
          管理合同扫描件、课时记录，完成分账核对与对齐
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F2B4D]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#0F2B4D]" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif text-[#0F2B4D]">
                {stats.materialCount}
              </p>
              <p className="text-xs text-gray-500">材料总数</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4A853]/10 flex items-center justify-center">
              <span className="text-[#D4A853] font-bold text-lg">¥</span>
            </div>
            <div>
              <p className="text-xl font-bold font-serif text-[#0F2B4D]">
                {formatCurrency(stats.totalAmount)}
              </p>
              <p className="text-xs text-gray-500">总金额</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif text-purple-700">
                {stats.mismatchCount}
              </p>
              <p className="text-xs text-gray-500">名称不一致</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif text-amber-700">
                {stats.annotatedCount}
              </p>
              <p className="text-xs text-gray-500">人工批注</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar />

      {/* List Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            共 <span className="font-semibold text-[#0F2B4D]">{stats.materialCount}</span> 条材料
          </span>
          {stats.multiVersionCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              <Layers className="w-3 h-3" />
              {stats.multiVersionCount} 条有多版本
            </span>
          )}
        </div>

        <button
          onClick={handleExport}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-[#0F2B4D] text-white hover:bg-[#0F2B4D]/90 transition-colors',
            'shadow-sm hover:shadow-md'
          )}
        >
          <Download className="w-4 h-4" />
          导出CSV明细
        </button>
      </div>

      {/* Material Grid */}
      {filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMaterials.map((material, index) => (
            <div
              key={material.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-slideUp"
            >
              <MaterialCard material={material} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">没有找到匹配的材料</p>
          <p className="text-sm text-gray-400">试试调整筛选条件</p>
        </div>
      )}

      {/* Info note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">
          💡 提示：导出的CSV文件包含筛选口径说明
        </p>
        <p className="text-xs text-blue-600">
          筛选条件会作为备注写在CSV文件开头，方便后续核对数据来源和范围。
        </p>
      </div>
    </div>
  );
}
