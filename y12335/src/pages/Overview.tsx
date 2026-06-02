import { useState } from 'react';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { FilterBar } from '@/components/FilterBar';
import { VolunteerPanel } from '@/components/VolunteerPanel';
import { PositionPanel } from '@/components/PositionPanel';
import { SkillMatrix } from '@/components/SkillMatrix';
import { LeaveTimeline } from '@/components/LeaveTimeline';
import { StatsCharts } from '@/components/StatsCharts';
import { DataImport } from '@/components/DataImport';

export default function Overview() {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <FilterBar />

      <div className="rounded-xl border border-surface-700 bg-surface-800 overflow-hidden">
        <button
          onClick={() => setImportOpen(!importOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database size={16} className="text-brand-400" />
            <span className="text-sm font-medium text-gray-200">数据导入</span>
            <span className="text-xs text-gray-500">志愿者名单、技能标签、请假记录</span>
          </div>
          {importOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {importOpen && (
          <div className="p-4 pt-0 border-t border-surface-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <DataImport
                type="volunteers"
                title="志愿者名单"
                description="CSV 格式：姓名, 技能1、技能2, 请假时段"
                sample="姓名,技能,请假"
              />
              <DataImport
                type="skills"
                title="技能标签"
                description="CSV 格式：技能名称, 分类"
                sample="技能名称,分类"
              />
              <DataImport
                type="leave"
                title="请假记录"
                description="CSV 格式：姓名, 时段, 原因"
                sample="姓名,时段,原因"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-surface-700 bg-surface-800 p-4">
            <VolunteerPanel />
          </div>
          <div className="rounded-xl border border-surface-700 bg-surface-800 p-4">
            <SkillMatrix />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-surface-700 bg-surface-800 p-4">
            <PositionPanel />
          </div>
          <div className="rounded-xl border border-surface-700 bg-surface-800 p-4">
            <LeaveTimeline />
          </div>
          <div className="rounded-xl border border-surface-700 bg-surface-800 p-4">
            <StatsCharts />
          </div>
        </div>
      </div>
    </div>
  );
}
