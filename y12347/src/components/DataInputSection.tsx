import { Plus, Trash2, Upload, Download, RotateCcw, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { UnitSelector } from './UnitSelector';
import { formatNumber } from '../utils/unitConversion';
import { getUnitShortLabel } from '../utils/unitConversion';

export function DataInputSection() {
  const {
    material,
    setMaterial,
    dataPoints,
    addDataPoint,
    updateDataPoint,
    removeDataPoint,
    background,
    setBackground,
    currentTimeUnit,
    clearData,
    loadSampleData,
    focusedRow,
    setFocusedRow
  } = useAppStore();

  const handleTimeChange = (id: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      updateDataPoint(id, { time: num });
    } else if (value === '') {
      updateDataPoint(id, { time: 0 });
    }
  };

  const handleCountChange = (id: string, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      updateDataPoint(id, { count: num });
    } else if (value === '') {
      updateDataPoint(id, { count: 0 });
    }
  };

  const handleExportData = () => {
    const csvContent = [
      ['时间 (' + getUnitShortLabel(currentTimeUnit) + ')', '计数', '校正后计数'].join(','),
      ...dataPoints.map(p => [
        formatNumber(p.time, 2),
        p.count,
        p.correctedCount !== undefined ? formatNumber(p.correctedCount, 2) : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${material.name}_decay_data.csv`;
    link.click();
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const lines = content.split('\n').filter(l => l.trim());
        const dataStart = lines[0].includes('时间') || lines[0].includes('time') ? 1 : 0;

        clearData();

        for (let i = dataStart; i < lines.length; i++) {
          const parts = lines[i].split(/[,;\t\s]+/);
          if (parts.length >= 2) {
            const time = parseFloat(parts[0]);
            const count = parseInt(parts[1]);
            if (!isNaN(time) && !isNaN(count)) {
              addDataPoint(time, count);
            }
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const getRowClassName = (point: typeof dataPoints[0], index: number) => {
    let className = '';
    if (point.isAbnormal) {
      if (point.abnormalType === 'boundary_error') {
        className = 'data-row-error';
      } else {
        className = 'data-row-warning';
      }
    }
    if (focusedRow === index) {
      className += ' ring-2 ring-lab-info';
    }
    return className;
  };

  return (
    <div className="lab-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">⚛️</span>
          数据输入
        </h2>
        <UnitSelector />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-lab-muted text-sm mb-1">材料名称</label>
          <input
            type="text"
            value={material.name}
            onChange={(e) => setMaterial({ name: e.target.value })}
            className="lab-input w-full"
            placeholder="例如：钡-137m"
          />
        </div>
        <div>
          <label className="block text-lab-muted text-sm mb-1">已知半衰期（可选）</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={material.halfLifeKnown ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setMaterial({ 
                  halfLifeKnown: val === '' ? undefined : parseFloat(val) 
                });
              }}
              className="lab-input flex-1"
              placeholder="已知值"
              min="0"
              step="any"
            />
            <span className="text-lab-muted flex items-center text-sm">
              {getUnitShortLabel(currentTimeUnit)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-4 items-end">
        <div className="flex-1">
          <label className="block text-lab-muted text-sm mb-1">背景噪声（计数）</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={background.value}
              onChange={(e) => setBackground({ value: parseInt(e.target.value) || 0 })}
              className="lab-input w-32"
              min="0"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={background.isDeducted}
                onChange={(e) => setBackground({ isDeducted: e.target.checked })}
                className="w-4 h-4 accent-lab-info"
              />
              <span className="text-sm text-lab-muted">扣除背景</span>
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImportData}
            className="lab-btn bg-transparent border-lab-border text-lab-muted hover:border-lab-info hover:text-lab-info flex items-center gap-1"
            title="导入CSV数据"
          >
            <Upload size={16} />
            导入
          </button>
          <button
            onClick={handleExportData}
            disabled={dataPoints.length === 0}
            className="lab-btn bg-transparent border-lab-border text-lab-muted hover:border-lab-info hover:text-lab-info disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="导出CSV数据"
          >
            <Download size={16} />
            导出
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-lab-muted">
            共 {dataPoints.length} 个数据点
          </span>
          <div className="flex gap-2">
            <button
              onClick={loadSampleData}
              className="lab-btn bg-transparent border-lab-border text-lab-muted hover:border-lab-success hover:text-lab-success flex items-center gap-1 text-sm"
            >
              <Database size={14} />
              加载示例
            </button>
            <button
              onClick={clearData}
              disabled={dataPoints.length === 0}
              className="lab-btn bg-transparent border-lab-border text-lab-muted hover:border-lab-danger hover:text-lab-danger disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              <RotateCcw size={14} />
              清空
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin border border-lab-border rounded">
          <table className="lab-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-12">#</th>
                <th>时间 ({getUnitShortLabel(currentTimeUnit)})</th>
                <th>原始计数</th>
                {background.isDeducted && (
                  <th>校正后</th>
                )}
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {dataPoints.map((point, index) => (
                <tr 
                  key={point.id} 
                  className={getRowClassName(point, index)}
                  onMouseEnter={() => setFocusedRow(index)}
                  onMouseLeave={() => setFocusedRow(null)}
                >
                  <td className="text-lab-muted">{index + 1}</td>
                  <td>
                    <input
                      type="number"
                      value={point.time}
                      onChange={(e) => handleTimeChange(point.id, e.target.value)}
                      className="lab-input w-full bg-transparent border-none p-0 focus:shadow-none"
                      min="0"
                      step="any"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={point.count}
                      onChange={(e) => handleCountChange(point.id, e.target.value)}
                      className="lab-input w-full bg-transparent border-none p-0 focus:shadow-none"
                      min="0"
                    />
                  </td>
                  {background.isDeducted && (
                    <td className="text-lab-success">
                      {point.correctedCount !== undefined 
                        ? formatNumber(point.correctedCount, 2) 
                        : formatNumber(Math.max(0, point.count - background.value), 2)}
                    </td>
                  )}
                  <td>
                    <button
                      onClick={() => removeDataPoint(point.id)}
                      className="text-lab-muted hover:text-lab-danger transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {dataPoints.length === 0 && (
                <tr>
                  <td colSpan={background.isDeducted ? 4 : 3} className="text-center py-8 text-lab-muted">
                    暂无数据，点击下方按钮添加数据点
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => addDataPoint()}
          className="mt-3 w-full lab-btn bg-transparent border-dashed border-lab-border text-lab-muted hover:border-lab-info hover:text-lab-info flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          添加数据点
        </button>
      </div>
    </div>
  );
}
