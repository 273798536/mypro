import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageContainer from "./PageContainer";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-parchment-100/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { PageContainer };
