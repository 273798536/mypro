import React from 'react';
import { FilterCondition, ProcessingStatus } from '../types';

interface FilterPanelProps {
  filter: FilterCondition;
  materialOptions: { materialId: string; materialName: string }[];
  pulleyOptions: { pulleyGroupId: string }[];
  onFilterChange: (filter: FilterCondition) => void;
}

const STATUS_LABELS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.NORMAL]: '正常',
  [ProcessingStatus.NOISE]: '疑似噪声',
  [ProcessingStatus.EXTREME]: '极端值',
  [ProcessingStatus.SUSPICIOUS]: '待确认',
  [ProcessingStatus.MANUAL_OVERRIDE]: '人工修改',
  [ProcessingStatus.PENDING]: '待分析',
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filter,
  materialOptions,
  pulleyOptions,
  onFilterChange,
}) => {
  const handleStatusToggle = (status: ProcessingStatus) => {
    const newStatuses = filter.statuses.includes(status)
      ? filter.statuses.filter(s => s !== status)
      : [...filter.statuses, status];
    onFilterChange({ ...filter, statuses: newStatuses });
  };

  return (
    <div className="filter-panel">
      <h3>筛选条件</h3>
      
      <div className="filter-row">
        <label>材料ID：</label>
        <select
          value={filter.materialId || ''}
          onChange={e => onFilterChange({ ...filter, materialId: e.target.value || undefined })}
        >
          <option value="">全部</option>
          {materialOptions.map(m => (
            <option key={m.materialId} value={m.materialId}>
              {m.materialId} - {m.materialName}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label>滑轮组：</label>
        <select
          value={filter.pulleyGroupId || ''}
          onChange={e => onFilterChange({ ...filter, pulleyGroupId: e.target.value || undefined })}
        >
          <option value="">全部</option>
          {pulleyOptions.map(p => (
            <option key={p.pulleyGroupId} value={p.pulleyGroupId}>
              {p.pulleyGroupId}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label>处理状态：</label>
        <div className="status-checkboxes">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <label key={key} className="status-checkbox">
              <input
                type="checkbox"
                checked={filter.statuses.includes(key as ProcessingStatus)}
                onChange={() => handleStatusToggle(key as ProcessingStatus)}
              />
              <span className={`status-tag status-${key}`}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-row">
        <label>
          <input
            type="checkbox"
            checked={filter.showJumpOnly}
            onChange={e => onFilterChange({ ...filter, showJumpOnly: e.target.checked })}
          />
          仅显示跳变点
        </label>
      </div>

      <div className="filter-row tension-range">
        <label>张力范围：</label>
        <input
          type="number"
          placeholder="最小值"
          value={filter.tensionRange?.min ?? ''}
          onChange={e => {
            const min = e.target.value ? Number(e.target.value) : 0;
            onFilterChange({
              ...filter,
              tensionRange: { min, max: filter.tensionRange?.max ?? 100 },
            });
          }}
        />
        <span> ~ </span>
        <input
          type="number"
          placeholder="最大值"
          value={filter.tensionRange?.max ?? ''}
          onChange={e => {
            const max = e.target.value ? Number(e.target.value) : 100;
            onFilterChange({
              ...filter,
              tensionRange: { min: filter.tensionRange?.min ?? 0, max },
            });
          }}
        />
      </div>
    </div>
  );
};
