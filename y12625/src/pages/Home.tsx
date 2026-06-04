import React from 'react';
import { FunctionSquare, BookOpen, Users, Award } from 'lucide-react';
import { LevelCard } from '@/components/LevelCard';
import { useExperimentStore } from '@/store/experimentStore';

const Home: React.FC = () => {
  const { levels, results } = useExperimentStore();

  const completedCount = levels.filter(l => l.status === 'completed').length;
  const totalCount = levels.length;

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="bg-[#0F3B5F] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4 animate-fade-in">
            <FunctionSquare size={48} className="text-[#2DD4BF]" />
            <h1
              className="text-4xl font-bold"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              数学函数涂色实验
            </h1>
          </div>
          <p className="text-lg text-slate-300 max-w-2xl animate-fade-in" style={{ animationDelay: '100ms' }}>
            在网格坐标系中绘制数学函数曲线，对指定区域进行涂色标注。
            通过精确的网格吸附和完整的撤销重做，确保每一次操作都可追溯。
          </p>

          <div className="grid grid-cols-3 gap-6 mt-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={20} className="text-[#2DD4BF]" />
                <span className="text-sm font-medium">2 个关卡</span>
              </div>
              <div className="text-2xl font-bold">
                {completedCount} / {totalCount}
              </div>
              <div className="text-xs text-slate-400 mt-1">已完成</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-[#F59E0B]" />
                <span className="text-sm font-medium">评审结果</span>
              </div>
              <div className="text-2xl font-bold">
                {results.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">份实验报告</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Award size={20} className="text-[#EC4899]" />
                <span className="text-sm font-medium">通过率</span>
              </div>
              <div className="text-2xl font-bold">
                {results.length > 0
                  ? Math.round((results.filter(r => r.passed).length / results.length) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-slate-400 mt-1">标注完整通过</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <section className="mb-12">
          <h2
            className="text-2xl font-bold text-[#0F3B5F] mb-6"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            选择关卡
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {levels.map((level, index) => (
              <LevelCard key={level.id} level={level} index={index} />
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-md p-8">
          <h2
            className="text-2xl font-bold text-[#0F3B5F] mb-6"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            使用说明
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#2DD4BF] bg-opacity-20 flex items-center justify-center text-[#2DD4BF] font-bold">
                1
              </div>
              <h3 className="font-semibold text-[#0F3B5F]">绘制函数曲线</h3>
              <p className="text-sm text-slate-600">
                选择绘制工具，在网格上点击并拖动绘制函数曲线。
                系统会自动吸附到网格交点，确保坐标精确。
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B] bg-opacity-20 flex items-center justify-center text-[#F59E0B] font-bold">
                2
              </div>
              <h3 className="font-semibold text-[#0F3B5F]">填充指定区域</h3>
              <p className="text-sm text-slate-600">
                切换到填充工具，绘制封闭区域进行涂色。
                点击标注卡片可编辑备注和来源材料信息。
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EC4899] bg-opacity-20 flex items-center justify-center text-[#EC4899] font-bold">
                3
              </div>
              <h3 className="font-semibold text-[#0F3B5F]">导出与评审</h3>
              <p className="text-sm text-slate-600">
                系统自动检测空值、重复、备注混写等异常。
                可直接使用和待复核项一目了然，导出JSON确保数据一致性。
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-100 py-6 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-slate-500">
          <p>数学函数涂色实验 · 支持精确的函数图像标注与评审</p>
          <p className="mt-1 font-mono text-xs">
            撤销重做 · 网格吸附 · 异常检测 · 数据导出
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
