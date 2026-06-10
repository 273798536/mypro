import { Activity, Beaker, CheckCircle2, FileText } from 'lucide-react';
import SampleList from '@/components/SampleList';
import CalculationCard from '@/components/CalculationCard';
import FormulaPanel from '@/components/FormulaPanel';
import BadDataWarning from '@/components/BadDataWarning';
import { useReportStore } from '@/store/useReportStore';

export default function Workbench() {
  const { samples, qcSteps } = useReportStore();
  const passed = qcSteps.filter((s) => s.status === 'passed').length;
  const posCount = samples.filter((s) => s.conclusion === '阳性').length;
  const unkCount = samples.filter((s) => s.conclusion === '不确定').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-warm-900">报告工作台</h2>
          <p className="text-warm-500 text-sm mt-1">
            整合共享盘复核意见、旧样本表、显微照片备注，统一计算和质控
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-neutral">
            <FileText size={12} className="mr-1" />
            {samples.length} 个样本
          </span>
          <span className="badge badge-danger">
            <Activity size={12} className="mr-1" />
            {posCount} 阳性
          </span>
          <span className="badge badge-warning">
            <Beaker size={12} className="mr-1" />
            {unkCount} 不确定
          </span>
          <span className="badge badge-success">
            <CheckCircle2 size={12} className="mr-1" />
            质控 {passed}/3
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-5 space-y-5">
          <SampleList />
        </div>

        <div className="col-span-7 space-y-5">
          <CalculationCard />
          <FormulaPanel />
          <BadDataWarning />
        </div>
      </div>
    </div>
  );
}
