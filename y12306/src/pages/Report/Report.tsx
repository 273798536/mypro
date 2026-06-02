import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useOptimizerStore } from '../../store/optimizerStore';
import { useDishStore } from '../../store/dishStore';
import { NutritionRadar } from '../../components/NutritionRadar';
import { ConflictBadge } from '../../components/ConflictBadge';
import { NUTRITION_LABELS, CATEGORY_COLORS } from '../../types';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export const Report: React.FC = () => {
  const { loadDishes, dishes } = useDishStore();
  const { history, currentResult } = useOptimizerStore();

  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const selectedResult = selectedResultId
    ? history.find((r) => r.id === selectedResultId)
    : currentResult;

  const getDishById = (id: string) => dishes.find((d) => d.id === id);

  const exportToExcel = () => {
    if (!selectedResult) return;

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['配餐方案报告'],
      ['方案名称', selectedResult.configName],
      ['生成时间', new Date(selectedResult.createdAt).toLocaleString('zh-CN')],
      ['状态', selectedResult.status === 'optimal' ? '最优解' : '次优解'],
      ['总成本', `¥${selectedResult.totalCost.toFixed(2)}`],
      ['综合评分', `${(selectedResult.score * 100).toFixed(0)}分`],
      ['选菜数量', `${selectedResult.selectedDishes.length}道`],
      [],
    ];

    const dishesData = [
      ['菜品名称', '分类', '单价', '数量', '小计', '热量', '蛋白质'],
      ...selectedResult.selectedDishes.map((sd) => {
        const dish = getDishById(sd.dishId);
        if (!dish) return [];
        return [
          dish.name,
          dish.category,
          dish.cost,
          sd.quantity,
          (dish.cost * sd.quantity).toFixed(2),
          dish.nutrition.calories * sd.quantity,
          dish.nutrition.protein * sd.quantity,
        ];
      }),
    ];

    const nutritionData = [
      ['营养成分', '实际值', '单位'],
      ...Object.entries(selectedResult.totalNutrition).map(([key, value]) => [
        NUTRITION_LABELS[key as keyof typeof NUTRITION_LABELS],
        typeof value === 'number' ? value.toFixed(1) : value,
        NUTRITION_LABELS[key as keyof typeof NUTRITION_LABELS].match(/\((.*?)\)/)?.[1] || '',
      ]),
    ];

    const conflictData =
      selectedResult.conflicts.length > 0
        ? [
            ['冲突类型', '严重程度', '描述', '优先级'],
            ...selectedResult.conflicts.map((c) => [
              c.type,
              c.severity,
              c.description,
              c.priority,
            ]),
          ]
        : [];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), '方案概览');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dishesData), '菜品明细');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nutritionData), '营养分析');
    if (conflictData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(conflictData), '冲突记录');
    }

    XLSX.writeFile(wb, `配餐方案_${selectedResult.configName}_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (!selectedResult) return;

    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.text('配餐方案报告', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(12);
    doc.text(`方案名称: ${selectedResult.configName}`, 20, y);
    y += 8;
    doc.text(`生成时间: ${new Date(selectedResult.createdAt).toLocaleString('zh-CN')}`, 20, y);
    y += 8;
    doc.text(`状态: ${selectedResult.status === 'optimal' ? '最优解' : '次优解'}`, 20, y);
    y += 8;
    doc.text(`总成本: ¥${selectedResult.totalCost.toFixed(2)}`, 20, y);
    y += 8;
    doc.text(`综合评分: ${(selectedResult.score * 100).toFixed(0)}分`, 20, y);
    y += 15;

    doc.setFontSize(14);
    doc.text('菜品明细', 20, y);
    y += 10;

    doc.setFontSize(10);
    selectedResult.selectedDishes.forEach((sd, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const dish = getDishById(sd.dishId);
      if (dish) {
        doc.text(
          `${index + 1}. ${dish.name} (${dish.category}) × ${sd.quantity}份 - ¥${(dish.cost * sd.quantity).toFixed(2)}`,
          25,
          y
        );
        y += 7;
      }
    });

    y += 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text('营养分析', 20, y);
    y += 10;

    doc.setFontSize(10);
    Object.entries(selectedResult.totalNutrition).forEach(([key, value]) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${NUTRITION_LABELS[key as keyof typeof NUTRITION_LABELS]}: ${typeof value === 'number' ? value.toFixed(1) : value}`,
        25,
        y
      );
      y += 7;
    });

    if (selectedResult.conflicts.length > 0) {
      y += 10;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text('冲突记录', 20, y);
      y += 10;

      doc.setFontSize(10);
      selectedResult.conflicts.forEach((c, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${index + 1}. [${c.severity}] ${c.description}`, 25, y);
        y += 7;
      });
    }

    doc.save(`配餐方案_${selectedResult.configName}_${Date.now()}.pdf`);
  };

  const exportTraceLog = () => {
    if (!selectedResult) return;

    const logContent = JSON.stringify(selectedResult.traceLogs, null, 2);
    const blob = new Blob([logContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `追溯日志_${selectedResult.configName}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报告导出</h1>
          <p className="text-slate-500 mt-1">预览和导出配餐方案报告</p>
        </div>
        {selectedResult && (
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              导出Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileIcon className="w-4 h-4" />
              导出PDF
            </button>
            <button
              onClick={exportTraceLog}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出追溯日志
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">历史方案</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {history.length > 0 ? (
              history.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedResultId(result.id)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-slate-50 transition-colors',
                    selectedResultId === result.id && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800">{result.configName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(result.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span>¥{result.totalCost.toFixed(2)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                暂无历史方案
              </div>
            )}
          </div>
        </div>

        <div className="col-span-3">
          {selectedResult ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedResult.configName}
                  </h2>
                  <p className="text-slate-500 mt-1">
                    生成时间：{new Date(selectedResult.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium',
                    selectedResult.status === 'optimal'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {selectedResult.status === 'optimal' ? '最优解' : '次优解'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-blue-600">总成本</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ¥{selectedResult.totalCost.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-green-600">选菜数量</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedResult.selectedDishes.length}道
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-sm text-purple-600">综合评分</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {(selectedResult.score * 100).toFixed(0)}分
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg text-center">
                  <p className="text-sm text-amber-600">冲突数</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedResult.conflicts.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-4">营养分析</h3>
                  <NutritionRadar
                    actual={selectedResult.totalNutrition}
                    height={280}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-4">营养详情</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedResult.totalNutrition).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-slate-600">
                            {NUTRITION_LABELS[key as keyof typeof NUTRITION_LABELS]}
                          </span>
                          <span className="font-mono font-medium text-slate-800">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4">菜品明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                        <th className="pb-3 font-medium">菜品名称</th>
                        <th className="pb-3 font-medium">分类</th>
                        <th className="pb-3 font-medium">单价</th>
                        <th className="pb-3 font-medium">数量</th>
                        <th className="pb-3 font-medium">小计</th>
                        <th className="pb-3 font-medium">热量</th>
                        <th className="pb-3 font-medium">蛋白质</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedResult.selectedDishes.map((sd) => {
                        const dish = getDishById(sd.dishId);
                        if (!dish) return null;
                        return (
                          <tr key={sd.dishId}>
                            <td className="py-3 font-medium text-slate-800">
                              {dish.name}
                            </td>
                            <td className="py-3">
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{
                                  backgroundColor: CATEGORY_COLORS[dish.category],
                                }}
                              >
                                {dish.category}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600">¥{dish.cost.toFixed(2)}</td>
                            <td className="py-3 text-slate-600">{sd.quantity}份</td>
                            <td className="py-3 font-medium text-slate-800">
                              ¥{(dish.cost * sd.quantity).toFixed(2)}
                            </td>
                            <td className="py-3 text-slate-600">
                              {(dish.nutrition.calories * sd.quantity).toFixed(0)}kcal
                            </td>
                            <td className="py-3 text-slate-600">
                              {(dish.nutrition.protein * sd.quantity).toFixed(1)}g
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedResult.conflicts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-800">约束冲突记录</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedResult.conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="p-4 bg-slate-50 rounded-lg flex items-start gap-3"
                      >
                        <ConflictBadge
                          type={conflict.type}
                          severity={conflict.severity}
                        />
                        <div className="flex-1">
                          <p className="text-slate-700">{conflict.description}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            优先级 {conflict.priority} · 涉及约束：
                            {conflict.involvedConstraints.join('、')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                选择方案预览
              </h3>
              <p className="text-slate-500">
                从左侧历史方案列表中选择一个方案查看报告
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
