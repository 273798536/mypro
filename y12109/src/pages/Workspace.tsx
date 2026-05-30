import PolicyImport from '@/components/PolicyImport';
import ParamConfig from '@/components/ParamConfig';
import SimulationRunner from '@/components/SimulationRunner';
import ResultCards from '@/components/ResultCards';
import LossDistribution from '@/components/LossDistribution';
import ExtremeClaimTable from '@/components/ExtremeClaimTable';

export default function Workspace() {
  return (
    <div className="grid grid-cols-[340px_1fr] gap-6 min-h-0">
      <div className="space-y-4">
        <div className="bg-surface rounded-xl border border-surface-200 p-4">
          <PolicyImport />
        </div>
        <div className="bg-surface rounded-xl border border-surface-200 p-4">
          <ParamConfig />
        </div>
        <div className="bg-surface rounded-xl border border-surface-200 p-4">
          <SimulationRunner />
        </div>
      </div>
      <div className="space-y-6">
        <ResultCards />
        <LossDistribution />
        <ExtremeClaimTable />
      </div>
    </div>
  );
}
