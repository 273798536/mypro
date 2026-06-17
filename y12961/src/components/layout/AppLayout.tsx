import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MobileNav />
        <main className="flex-1 px-4 py-5 md:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-line px-6 py-3 text-center font-mono text-[10px] text-ink-600">
          分库分表路由检查看板 · 图表 / 明细 / 下载 同源 · 数据为演示 Mock
        </footer>
      </div>
    </div>
  );
}
