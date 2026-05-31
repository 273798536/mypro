import Scene from "@/components/Scene";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060d1f]">
      <div className="flex-[7] relative">
        <Scene />
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-[#0a0e27]/80 backdrop-blur-sm border border-white/10 text-[10px] text-white/40">
          拖动电荷 · 滚轮缩放 · 右键旋转
        </div>
      </div>
      <div className="flex-[3] min-w-[300px] max-w-[400px]">
        <Sidebar />
      </div>
    </div>
  );
}
