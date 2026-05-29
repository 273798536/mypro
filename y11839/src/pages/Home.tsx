import { useNavigate } from 'react-router-dom';
import { Construction, FlaskConical, GraduationCap, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

export default function Home() {
  const navigate = useNavigate();
  const initGame = useGameStore((s) => s.initGame);
  const teacherMode = useGameStore((s) => s.teacherMode);
  const setTeacherMode = useGameStore((s) => s.setTeacherMode);

  const handleStart = () => {
    initGame();
    navigate('/build');
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F4A6E" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 text-center max-w-2xl px-6">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1B3A5C] to-[#2A5A8C] border border-[#3A7ABD]/30 flex items-center justify-center shadow-lg shadow-[#1B3A5C]/30">
            <Construction className="w-10 h-10 text-[#7EB8DA]" />
          </div>
        </div>

        <h1
          className="text-5xl font-bold text-[#E0ECF8] tracking-tight mb-3"
          style={{ fontFamily: "'Chakra Petch', sans-serif" }}
        >
          物理桥梁搭建赛
        </h1>

        <p className="text-[#7EB8DA] text-lg mb-2">
          搭建桁架桥梁，验证结构强度
        </p>
        <p className="text-[#4A7A9A] text-sm mb-10">
          放置节点、连接杆件，让车辆安全通过——每一步选择都将真实改变结构受力
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleStart}
            className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-[#1B3A5C] to-[#2A5A8C] border border-[#3A7ABD]/40 text-[#E0ECF8] text-lg font-semibold shadow-lg shadow-[#1B3A5C]/30 hover:shadow-[#2A5A8C]/50 hover:border-[#5A9ACD]/60 transition-all duration-300"
            style={{ fontFamily: "'Chakra Petch', sans-serif" }}
          >
            <Construction size={22} />
            开始搭建
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setTeacherMode(!teacherMode)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm transition-all ${
              teacherMode
                ? 'border-[#2ECC71]/50 bg-[#2ECC71]/10 text-[#2ECC71]'
                : 'border-[#1F4A6E] bg-[#0D1F3C] text-[#4A7A9A] hover:text-[#7EB8DA] hover:border-[#3A7ABD]/40'
            }`}
          >
            <GraduationCap size={16} />
            {teacherMode ? '教师模式已开启' : '教师模式'}
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#1B3A5C]/50 flex items-center justify-center">
              <Construction size={18} className="text-[#E87722]" />
            </div>
            <div className="text-[#C8D8E8] text-sm font-medium mb-1">实时受力</div>
            <div className="text-[#4A7A9A] text-xs">杆件应力、预算消耗、支点反力一目了然</div>
          </div>
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#1B3A5C]/50 flex items-center justify-center">
              <FlaskConical size={18} className="text-[#E74C3C]" />
            </div>
            <div className="text-[#C8D8E8] text-sm font-medium mb-1">过载解释</div>
            <div className="text-[#4A7A9A] text-xs">杆件过载不是红点，而是拉/压/屈曲原因</div>
          </div>
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#1B3A5C]/50 flex items-center justify-center">
              <GraduationCap size={18} className="text-[#2ECC71]" />
            </div>
            <div className="text-[#C8D8E8] text-sm font-medium mb-1">导出报告</div>
            <div className="text-[#4A7A9A] text-xs">回答核心问题：杆件过载有没有被拦住</div>
          </div>
        </div>
      </div>
    </div>
  );
}
