import { AppHeader } from "./components/layout/AppHeader";
import { AppSidebar } from "./components/layout/AppSidebar";
import { AppMain } from "./components/layout/AppMain";
import { AppDetail } from "./components/layout/AppDetail";

export default function App() {
  return (
    <div className="bg-[#0a1628] text-white flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <AppMain />
        <AppDetail />
      </div>
    </div>
  );
}