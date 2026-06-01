import { useState } from 'react';
import { Lock, Unlock, Edit3, Table2, AlertTriangle, CheckCircle2, XCircle, Play } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';

export default function DataTable() {
  const { experiments, dispatch, calculateAll, isCalculating } = useAppStore();
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: 'materialId' | 'thickness' | 'boundaryTemp';
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCellClick = (
    expId: string,
    field: 'materialId' | 'thickness' | 'boundaryTemp',
    currentValue: string | number | null,
    isLocked: boolean
  ) => {
    if (isLocked) return;
    setEditingCell({ id: expId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleCellBlur = (expId: string, field: 'materialId' | 'thickness' | 'boundaryTemp') => {
    if (editingCell?.id === expId && editingCell?.field === field) {
      let value: string | number | null = editValue.trim();
      if (value === '') value = null;

      if (field !== 'materialId' && value !== null) {
        const numValue = parseFloat(String(value));
        if (isNaN(numValue)) {
          setEditingCell(null);
          return;
        }
        value = numValue;
      }

      dispatch({
        type: 'UPDATE_EXPERIMENT',
        payload: { id: expId, updates: { [field]: value } },
      });
      setEditingCell(null);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    expId: string,
    field: 'materialId' | 'thickness' | 'boundaryTemp'
  ) => {
    if (e.key === 'Enter') {
      handleCellBlur(expId, field);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const toggleLock = (expId: string, currentLocked: boolean) => {
    if (currentLocked) {
      dispatch({ type: 'UNLOCK_EXPERIMENT', payload: expId });
    } else {
      dispatch({ type: 'LOCK_EXPERIMENT', payload: expId });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'anomaly':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const unlockedCount = experiments.filter((e) => !e.isLocked).length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            实验数据
          </h3>
          <span className="text-sm text-slate-500">
            共 {experiments.length} 组
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={calculateAll}
            disabled={isCalculating || unlockedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {isCalculating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isCalculating ? '计算中...' : `批量计算 (${unlockedCount})`}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {experiments.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <Table2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无实验数据</p>
              <p className="text-sm">请从左侧导入CSV文件</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-slate-600 font-medium border-b border-slate-200 w-10">
                  #
                </th>
                <th className="px-3 py-2 text-left text-slate-600 font-medium border-b border-slate-200">
                  材料编号
                </th>
                <th className="px-3 py-2 text-left text-slate-600 font-medium border-b border-slate-200">
                  厚度 (m)
                </th>
                <th className="px-3 py-2 text-left text-slate-600 font-medium border-b border-slate-200">
                  边界温度 (°C)
                </th>
                <th className="px-3 py-2 text-left text-slate-600 font-medium border-b border-slate-200">
                  数据点
                </th>
                <th className="px-3 py-2 text-left text-slate-600 font-medium border-b border-slate-200">
                  状态
                </th>
                <th className="px-3 py-2 text-center text-slate-600 font-medium border-b border-slate-200 w-20">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp, idx) => (
                <tr
                  key={exp.id}
                  className={`border-b border-slate-100 transition-colors ${
                    exp.isLocked
                      ? 'bg-slate-50 text-slate-500'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <td className="px-3 py-2 text-slate-500 font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    {editingCell?.id === exp.id && editingCell?.field === 'materialId' ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellBlur(exp.id, 'materialId')}
                        onKeyDown={(e) => handleKeyDown(e, exp.id, 'materialId')}
                        className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() =>
                          handleCellClick(exp.id, 'materialId', exp.materialId, exp.isLocked)
                        }
                        className={`flex items-center gap-1 ${
                          !exp.isLocked ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''
                        }`}
                      >
                        {exp.materialId || (
                          <span className="text-slate-400 italic flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            点击填写
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingCell?.id === exp.id && editingCell?.field === 'thickness' ? (
                      <input
                        type="number"
                        step="0.001"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellBlur(exp.id, 'thickness')}
                        onKeyDown={(e) => handleKeyDown(e, exp.id, 'thickness')}
                        className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() =>
                          handleCellClick(exp.id, 'thickness', exp.thickness, exp.isLocked)
                        }
                        className={`flex items-center gap-1 ${
                          !exp.isLocked ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''
                        } ${exp.thickness == null ? 'text-red-500' : ''}`}
                      >
                        {exp.thickness != null ? (
                          exp.thickness.toExponential(3)
                        ) : (
                          <span className="italic flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            缺失
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingCell?.id === exp.id && editingCell?.field === 'boundaryTemp' ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellBlur(exp.id, 'boundaryTemp')}
                        onKeyDown={(e) => handleKeyDown(e, exp.id, 'boundaryTemp')}
                        className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() =>
                          handleCellClick(exp.id, 'boundaryTemp', exp.boundaryTemp, exp.isLocked)
                        }
                        className={`flex items-center gap-1 ${
                          !exp.isLocked ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''
                        } ${exp.boundaryTemp == null ? 'text-red-500' : ''}`}
                      >
                        {exp.boundaryTemp != null ? (
                          `${exp.boundaryTemp.toFixed(1)}`
                        ) : (
                          <span className="italic flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            缺失
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {exp.temperaturePoints.length}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[exp.status]}`}
                    >
                      {getStatusIcon(exp.status)}
                      {STATUS_LABELS[exp.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleLock(exp.id, exp.isLocked)}
                      title={exp.isLocked ? '解锁（会清除计算结果）' : '锁定，防止被覆盖'}
                      className={`p-1.5 rounded transition-colors ${
                        exp.isLocked
                          ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {exp.isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
