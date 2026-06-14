import { useStore } from './store';
import { ImportPanel } from './components/ImportPanel';
import { ItemList } from './components/ItemList';
import { DetailPanel } from './components/DetailPanel';
import { clearState } from './store/storage';

function Header() {
  const { dispatch } = useStore();
  return (
    <header className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">巡演耳返清单归档</h1>
          <p className="text-xs text-indigo-200 mt-0.5">
            厂牌运营工具 · 整理排练群截图中的授权记录与备注
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] bg-white/10 px-3 py-1 rounded-full">
            本地存储 · localStorage
          </div>
          <button
            onClick={() => {
              if (window.confirm('确认清空所有归档数据？此操作不可撤销。')) {
                clearState();
                dispatch({ type: 'RESET' });
              }
            }}
            className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/20"
          >
            清空数据
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <ImportPanel />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ItemList />
          </div>
          <div className="lg:col-span-2">
            <DetailPanel />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-xs text-gray-500 space-y-2">
          <h3 className="font-semibold text-gray-700 text-sm">说明</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><b>导入</b>：粘贴排练群截图的文字转写，每行一条，字段用 Tab 或 2 个以上空格分隔</li>
            <li><b>确认</b>：确认后记录进入已确认状态，可用于社区公示前核对</li>
            <li><b>撤回</b>：将记录标记为已撤回，不删除数据，保留版本历史</li>
            <li><b>批注</b>：可添加人工批注，支持标记"后补备注"（用于补录排练/授权信息）</li>
            <li><b>坏数据识别</b>：系统自动标记曲名别名重复、字段缺失、日期格式混乱、授权期限藏于备注、重复记录、后补备注等问题</li>
            <li><b>版本追踪</b>：每条记录的创建、编辑、确认、撤回、批注都会留下版本快照，可在详情中查看历史</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
