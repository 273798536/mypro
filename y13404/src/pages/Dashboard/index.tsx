import React from 'react';
import DraftImport from './DraftImport';
import SampleCards from './SampleCards';
import BoundaryEngine from './BoundaryEngine';
import ReviewWorkspace from './ReviewWorkspace';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          拓扑路径报告讲解
        </h1>
        <p className="text-slate-500 max-w-2xl">
          按照老叶的真实工作流：导入历史答案草稿 → 补充现场说明 → 系统自动识别边界问题 → 三种样例分支判断 → 统一计算结果驱动复核看板
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DraftImport />
        <BoundaryEngine />
      </div>

      <SampleCards />

      <div className="pt-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
          <h2 className="text-lg font-semibold text-slate-800">复核工作台</h2>
          <span className="text-xs text-slate-400 ml-2">
            所有数据来自同一计算批次，确保筛选、统计、明细、导出的一致性
          </span>
        </div>
        <ReviewWorkspace />
      </div>
    </div>
  );
};

export default Dashboard;
