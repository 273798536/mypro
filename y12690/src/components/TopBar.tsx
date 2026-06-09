import { useApp } from '../context/AppContext';

export default function TopBar() {
  const { activeRecord, loadDuplicateTestScenario, runCollisionDetection, exportRecord } = useApp();

  const handleExport = () => {
    if (!activeRecord) return;
    const result = exportRecord(activeRecord.id);
    if (result.success) {
      alert('导出成功：记录完整可用');
    } else {
      alert(`导出校验失败：\n${result.issues.join('\n')}`);
    }
  };

  return (
    <header className="h-14 bg-tech-gray border-b border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-industrial-blue flex items-center justify-center font-bold text-lg">管</div>
        <h1 className="text-lg font-semibold tracking-wide">工厂管架碰撞预审</h1>
      </div>
      <div className="h-6 w-px bg-gray-600 mx-2" />
      <span className="text-sm text-gray-400">
        当前：{activeRecord ? activeRecord.name : '未选择记录'}
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <button className="btn-secondary text-sm" onClick={loadDuplicateTestScenario}>
          加载重复导入测试
        </button>
        <button className="btn-secondary text-sm" onClick={runCollisionDetection}>
          重新检测碰撞
        </button>
        <button className="btn-primary text-sm" onClick={handleExport}>
          导出记录
        </button>
      </div>
    </header>
  );
}
