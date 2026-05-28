import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-ink-50">
      <Sidebar />
      <TopBar />
      <main className="ml-60 pt-14">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      </div>
  );
}
