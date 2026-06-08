import { Upload, Download, Trash2, FlaskConical, Eye, EyeOff, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { generateMockRecords } from '@/utils/mockData';

export function Toolbar() {
  const {
    records,
    selectedIds,
    clearAllRecords,
    deleteSelected,
    addRecords,
    isDetailPanelOpen,
    setDetailPanelOpen,
  } = useAppStore();

  const handleLoadDemo = () => {
    const demo = generateMockRecords();
    const result = addRecords(demo);
    if (result.added === 0 && demo.length > 0) {
      alert('演示数据已存在，已跳过重复记录。如需重新加载，请先清空数据。');
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-pocket-border bg-pocket-card px-6 py-3">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pocket-accent/15 text-pocket-accent">
            <Database size={16} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-pocket-text">药物结合口袋浏览器</h1>
            <p className="text-[10px] text-pocket-muted">Pocket Browser for Review</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-pocket-muted hover:bg-pocket-border hover:text-pocket-text"
        >
          <Eye size={13} />
          数据浏览
        </Link>

        <Link
          to="/import"
          className="flex h-8 items-center gap-1.5 rounded-md border border-pocket-border bg-pocket-bg px-2.5 text-xs text-pocket-text hover:border-pocket-accent/50 hover:text-pocket-accent"
        >
          <Upload size={13} />
          导入数据
        </Link>

        <Link
          to="/test"
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-pocket-muted hover:bg-pocket-border hover:text-pocket-text"
        >
          <FlaskConical size={13} />
          测试场景
        </Link>

        <div className="mx-1 h-5 w-px bg-pocket-border" />

        <button
          onClick={handleLoadDemo}
          className="flex h-8 items-center gap-1.5 rounded-md border border-pocket-border bg-pocket-bg px-2.5 text-xs text-pocket-text hover:border-pocket-accent/50 hover:text-pocket-accent"
        >
          <Download size={13} />
          加载演示数据
        </button>

        <button
          onClick={() => setDetailPanelOpen(!isDetailPanelOpen)}
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-pocket-muted hover:bg-pocket-border hover:text-pocket-text"
          disabled={records.length === 0}
        >
          {isDetailPanelOpen ? <EyeOff size={13} /> : <Eye size={13} />}
          {isDetailPanelOpen ? '隐藏详情' : '显示详情'}
        </button>

        <div className="mx-1 h-5 w-px bg-pocket-border" />

        {selectedIds.length > 0 && (
          <button
            onClick={deleteSelected}
            className="flex h-8 items-center gap-1.5 rounded-md border border-pocket-red/30 bg-pocket-red/10 px-2.5 text-xs text-pocket-red hover:bg-pocket-red/20"
          >
            <Trash2 size={13} />
            删除选中 ({selectedIds.length})
          </button>
        )}

        {records.length > 0 && (
          <button
            onClick={() => {
              if (confirm('确定清空所有记录？此操作不可撤销。')) {
                clearAllRecords();
              }
            }}
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-pocket-muted hover:bg-pocket-red/15 hover:text-pocket-red"
          >
            <Trash2 size={13} />
            清空全部
          </button>
        )}
      </div>
    </div>
  );
}
