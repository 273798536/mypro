import { useApp } from '../context/AppContext';
import type { FilterCriteria } from '../types';
import {
  VoicePart,
  VoicePartLabels,
  AlertLevel,
  AlertLevelLabels,
  RecordStatus,
  RecordStatusLabels,
  VersionSource,
  VersionSourceLabels,
} from '../types';

export default function FilterPanel() {
  const { filterCriteria, setFilterCriteria, resetFilterCriteria, filteredRecords, records } = useApp();

  const update = (patch: Partial<FilterCriteria>) => {
    setFilterCriteria({ ...filterCriteria, ...patch });
  };

  const hasAnyFilter = Object.values(filterCriteria).some((v) => v !== undefined && v !== '');

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>筛选条件</h3>
        <div className="filter-header-right">
          <span className="filter-count">
            当前显示 {filteredRecords.length} / {records.length} 条
          </span>
          {hasAnyFilter && (
            <button className="btn btn-ghost" onClick={resetFilterCriteria}>
              重置筛选
            </button>
          )}
        </div>
      </div>

      <div className="filter-grid">
        <div className="filter-item">
          <label>声部</label>
          <select
            value={filterCriteria.voicePart ?? ''}
            onChange={(e) => update({ voicePart: (e.target.value as VoicePart) || undefined })}
          >
            <option value="">全部</option>
            {Object.values(VoicePart).map((v) => (
              <option key={v} value={v}>
                {VoicePartLabels[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>异常等级</label>
          <select
            value={filterCriteria.alertLevel ?? ''}
            onChange={(e) => update({ alertLevel: (e.target.value as AlertLevel) || undefined })}
          >
            <option value="">全部</option>
            {Object.values(AlertLevel).map((v) => (
              <option key={v} value={v}>
                {AlertLevelLabels[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>处理状态</label>
          <select
            value={filterCriteria.status ?? ''}
            onChange={(e) => update({ status: (e.target.value as RecordStatus) || undefined })}
          >
            <option value="">全部</option>
            {Object.values(RecordStatus).map((v) => (
              <option key={v} value={v}>
                {RecordStatusLabels[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>版本来源</label>
          <select
            value={filterCriteria.versionSource ?? ''}
            onChange={(e) =>
              update({ versionSource: (e.target.value as VersionSource) || undefined })
            }
          >
            <option value="">全部</option>
            {Object.values(VersionSource).map((v) => (
              <option key={v} value={v}>
                {VersionSourceLabels[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>学生姓名</label>
          <input
            type="text"
            placeholder="输入姓名关键字"
            value={filterCriteria.studentName ?? ''}
            onChange={(e) => update({ studentName: e.target.value || undefined })}
          />
        </div>

        <div className="filter-item">
          <label>排练日期起</label>
          <input
            type="date"
            value={filterCriteria.dateFrom ?? ''}
            onChange={(e) => update({ dateFrom: e.target.value || undefined })}
          />
        </div>

        <div className="filter-item">
          <label>排练日期止</label>
          <input
            type="date"
            value={filterCriteria.dateTo ?? ''}
            onChange={(e) => update({ dateTo: e.target.value || undefined })}
          />
        </div>

        <div className="filter-item filter-checkbox">
          <label>
            <input
              type="checkbox"
              checked={!!filterCriteria.hasLateAttachment}
              onChange={(e) => update({ hasLateAttachment: e.target.checked || undefined })}
            />
            仅显示含晚到附件
          </label>
        </div>

        <div className="filter-item filter-checkbox">
          <label>
            <input
              type="checkbox"
              checked={!!filterCriteria.hasOldMaster}
              onChange={(e) => update({ hasOldMaster: e.target.checked || undefined })}
            />
            仅显示含旧版母带混入
          </label>
        </div>
      </div>
    </div>
  );
}
