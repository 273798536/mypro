import { useAppStore } from '../store';
import { downloadDataURL } from '../utils/helpers';

export default function Toolbar() {
  const { saveView, addAlert, setActiveTab } = useAppStore();

  const captureScreenshot = () => {
    const canvas = document.querySelector('.viewport canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      addAlert('danger', '未找到渲染画布');
      return;
    }
    try {
      const url = canvas.toDataURL('image/png');
      const ts = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const filename = `海底管线避障-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.png`;
      downloadDataURL(url, filename);
      addAlert('info', `截图已导出：${filename}`);
    } catch {
      addAlert('danger', '截图导出失败');
    }
  };

  const quickSaveView = () => {
    const name = prompt('请输入视角名称：', `快速保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
    if (!name) return;
    const note = prompt('备注说明（可选，关联图片名或行号）：', '') || '';
    saveView(name, note);
  };

  const resetView = () => {
    addAlert('info', '鼠标拖拽旋转，滚轮缩放，右键平移');
  };

  return (
    <div className="toolbar">
      <button className="btn btn-sm" onClick={quickSaveView}>
        📷 保存视角
      </button>
      <button className="btn btn-sm btn-secondary" onClick={captureScreenshot}>
        🖼 导出截图
      </button>
      <button
        className="btn btn-sm btn-secondary"
        onClick={() => setActiveTab('views')}
      >
        📑 视角列表
      </button>
      <button
        className="btn btn-sm btn-secondary"
        onClick={() => setActiveTab('records')}
      >
        ✅ 评审记录
      </button>
      <button className="btn btn-sm btn-secondary" onClick={resetView}>
        ⌨ 操作提示
      </button>
    </div>
  );
}
