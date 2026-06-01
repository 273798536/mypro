import { FilterBar } from '@/components/FilterBar';
import { VolunteerPanel } from '@/components/VolunteerPanel';
import { PositionPanel } from '@/components/PositionPanel';
import { SkillMatrix } from '@/components/SkillMatrix';
import { LeaveTimeline } from '@/components/LeaveTimeline';
import { StatsCharts } from '@/components/StatsCharts';

export default function Overview() {
  return (
    <div className="space-y-6">
      <FilterBar />

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
