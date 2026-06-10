import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator as CalcIcon, Save } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { useBatchStore } from '@/store/batchStore';
import { WeighingTable } from '@/components/WeighingTable';
import { ExperimentTable } from '@/components/ExperimentTable';
import { TimeTable } from '@/components/TimeTable';

export function DataEntry() {
  const navigate = useNavigate();
  const {
    batch, updateBatch,
    weighingRows, addWeighingRow, updateWeighingRow, removeWeighingRow,
    experimentRecords, addExperimentRecord, updateExperimentRecord, removeExperimentRecord,
    reactionTimes, addReactionTime, updateReactionTime, removeReactionTime,
  } = useExperimentStore();
  const { addTimelineEvent } = useBatchStore();

  const handleAddWeighing = () => {
    addWeighingRow({
      originalRowNumber: weighingRows.length + 1,
      sampleName: '',
      sampleMass: null,
      benzoicAcidMass: null,
      imageName: '',
      remark: '',
    });
  };

  const handleAddExperiment = () => {
    addExperimentRecord({
      originalRowNumber: experimentRecords.length + 1,
      initialTemp: null,
      finalTemp: null,
      tempChange: null,
      blankControl: '有',
      imageName: '',
      remark: '',
    });
  };

  const handleAddReactionTime = () => {
    addReactionTime({
      originalRowNumber: reactionTimes.length + 1,
      ignitionTime: null,
      totalDuration: null,
      isMissing: false,
      remark: '',
    });
  };

  const handleSaveAndProceed = () => {
    addTimelineEvent({
      batchId: batch.id,
      type: '录入',
      description: `数据录入完成：称量单${weighingRows.length}行、实验记录${experimentRecords.length}组、反应时间${reactionTimes.length}组`,
      operator: batch.operator || '当前用户',
      timestamp: new Date().toLocaleString('zh-CN'),
      sourceRef: weighingRows.map((r) => `行${r.originalRowNumber}`).join(', '),
    });
    navigate('/calculator');
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b border-lab-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-serif text-xl font-semibold text-lab-navy">数据录入</h1>
              <p className="text-xs text-gray-500">称量单 · 实验记录 · 反应时间（保留原始行号）</p>
            </div>
          </div>
          <button
            onClick={handleSaveAndProceed}
            className="lab-btn bg-lab-green text-white hover:bg-lab-greenLight flex items-center gap-2"
          >
            <Save size={16} /> 保存并进入计算
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="lab-card p-5">
          <h2 className="font-serif text-lg font-semibold text-lab-navy mb-4">批次信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">批次名称</label>
              <input
                type="text"
                value={batch.name}
                onChange={(e) => updateBatch({ name: e.target.value })}
                className="lab-input w-full"
                placeholder="如：YH20260610-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
              <input
                type="text"
                value={batch.operator}
                onChange={(e) => updateBatch({ operator: e.target.value })}
                className="lab-input w-full"
                placeholder="姓名或学号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
              <input
                type="text"
                value={batch.createdAt}
                readOnly
                className="lab-input w-full bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">来源备注</label>
              <input
                type="text"
                value={batch.sourceNote}
                onChange={(e) => updateBatch({ sourceNote: e.target.value })}
                className="lab-input w-full"
                placeholder="如：第3组实验-物理化学实验课"
              />
            </div>
          </div>
        </div>

        <WeighingTable
          rows={weighingRows}
          onAdd={handleAddWeighing}
          onUpdate={updateWeighingRow}
          onRemove={removeWeighingRow}
        />

        <ExperimentTable
          records={experimentRecords}
          onAdd={handleAddExperiment}
          onUpdate={updateExperimentRecord}
          onRemove={removeExperimentRecord}
        />

        <TimeTable
          times={reactionTimes}
          onAdd={handleAddReactionTime}
          onUpdate={updateReactionTime}
          onRemove={removeReactionTime}
        />

        <div className="flex justify-between">
          <button
            onClick={() => navigate('/')}
            className="lab-btn bg-white border border-lab-line text-lab-ink hover:bg-gray-50"
          >
            返回首页
          </button>
          <button
            onClick={handleSaveAndProceed}
            className="lab-btn bg-lab-navy text-white hover:bg-lab-navyLight flex items-center gap-2"
          >
            <CalcIcon size={16} /> 下一步：进入计算工具
          </button>
        </div>
      </div>
    </div>
  );
}
