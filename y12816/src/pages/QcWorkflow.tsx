import QcSteps from '@/components/QcSteps';
import { useQcWorkflow } from '@/hooks/useQcWorkflow';

export default function QcWorkflow() {
  const { qcSteps, runRepeatability, runDataCompletion, runManualConfirmation, runAllQc, resetQcSteps } = useQcWorkflow();

  const handleRunStep = (stepId: string) => {
    if (stepId === 'qc-1') runRepeatability();
    else if (stepId === 'qc-2') runDataCompletion();
    else if (stepId === 'qc-3') runManualConfirmation();
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-warm-900">质控流程</h2>
        <p className="text-warm-500 text-sm mt-1">
          给质控组看之前，重复运行、补录、人工确认三件事都要试到，少一个都不行
        </p>
      </div>
      <QcSteps
        steps={qcSteps}
        onRunStep={handleRunStep}
        onRunAll={runAllQc}
        onReset={resetQcSteps}
      />
    </div>
  );
}
