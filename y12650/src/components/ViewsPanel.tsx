import { useState } from 'react';
import { useAppStore } from '../store';
import { formatDateTime } from '../utils/helpers';

export default function ViewsPanel() {
  const { savedViews, saveView, restoreView, deleteView } = useAppStore();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [sourceImage, setSourceImage] = useState('');
  const [sourceRow, setSourceRow] = useState<number | ''>('');

  const handleSave = () => {
    const viewName = name.trim() || `视角 ${savedViews.length + 1}`;
    saveView(viewName, note.trim(), sourceImage.trim() || undefined, sourceRow === '' ? undefined : sourceRow);
    setName('');
    setNote('');
    setSourceImage('');
    setSourceRow('');
  };

  const handleRestore = (id: string) => {
    restoreView(id);
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-section-title">保存当前视角</div>
        <div className="form-row">
          <label>视角名称</label>
          <input
            type="text"
            placeholder="例如：A-01 碰撞点近景"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>备注说明</label>
          <input
            type="text"
            placeholder="评审结论、问题描述…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>来源图片</label>
          <input
            type="text"
            placeholder="例如：图册-002.png"
            value={sourceImage}
            onChange={(e) => setSourceImage(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>来源行号</label>
          <input
            type="number"
            placeholder="原始表格行号"
            value={sourceRow}
            onChange={(e) => {
              const v = e.target.value;
              setSourceRow(v === '' ? '' : parseInt(v, 10));
            }}
          />
        </div>
        <div className="btn-group">
          <button className="btn" onClick={handleSave}>
            保存视角
          </button>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">已保存视角</div>
        {savedViews.length === 0 && (
          <div className="empty-state">暂无保存的视角，调整视角后点击上方"保存视角"</div>
        )}
        {savedViews.map((v) => (
          <div key={v.id} className="view-snapshot" onClick={() => handleRestore(v.id)}>
            <div className="view-snapshot-header">
              <span className="view-snapshot-name">{v.name}</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteView(v.id);
                }}
              >
                删除
              </button>
            </div>
            <div className="view-snapshot-meta">
              {formatDateTime(v.createdAt)}
              {v.sourceImage && ` · 图片：${v.sourceImage}`}
              {v.sourceRow && ` · 行 ${v.sourceRow}`}
            </div>
            {v.note && <div className="view-snapshot-note">{v.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
