import { ArrowRight } from 'lucide-react';
import ClusterChart from '@/components/review/ClusterChart';
import type { Sample } from '@/types';

interface BeforeAfterCompareProps {
  oldConclusion: string;
  newConclusion: string;
  oldSamples: Sample[];
  newSamples: Sample[];
  changedSampleIds: string[];
}

interface DiffField {
  label: string;
  old: string;
  new: string;
  changed: boolean;
}

function getDiffFields(oldSample: Sample, newSample: Sample): DiffField[] {
  return [
    { label: '时间点', old: oldSample.timepoint, new: newSample.timepoint, changed: oldSample.timepoint !== newSample.timepoint },
    { label: '采样地点', old: oldSample.samplingLocation, new: newSample.samplingLocation, changed: oldSample.samplingLocation !== newSample.samplingLocation },
    { label: '数据来源', old: oldSample.dataSourcing, new: newSample.dataSourcing, changed: oldSample.dataSourcing !== newSample.dataSourcing },
    { label: '聚类', old: oldSample.clusterId, new: newSample.clusterId, changed: oldSample.clusterId !== newSample.clusterId },
    { label: '异常标记', old: oldSample.isAnomaly ? '是' : '否', new: newSample.isAnomaly ? '是' : '否', changed: oldSample.isAnomaly !== newSample.isAnomaly },
  ];
}

export default function BeforeAfterCompare({
  oldConclusion,
  newConclusion,
  oldSamples,
  newSamples,
  changedSampleIds,
}: BeforeAfterCompareProps) {
  const oldById = new Map(oldSamples.map(s => [s.id, s]));
  const newById = new Map(newSamples.map(s => [s.id, s]));

  return (
    <div className="grid grid-cols-2 gap-0 border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div>
        <div className="bg-red-50 border-b border-red-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-red-800">修正前</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <ClusterChart samples={oldSamples} mini highlightIds={changedSampleIds} showLegend={false} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">样本</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">时间点</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">地点</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">聚类</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">异常</th>
                </tr>
              </thead>
              <tbody>
                {oldSamples.filter(s => changedSampleIds.includes(s.id)).map(sample => (
                  <tr key={sample.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{sample.sampleName}</td>
                    <td className="px-3 py-2 diff-old bg-red-50 text-red-600 line-through">{sample.timepoint}</td>
                    <td className="px-3 py-2">{sample.samplingLocation}</td>
                    <td className="px-3 py-2 diff-old bg-red-50 text-red-600 line-through">{sample.clusterId}</td>
                    <td className="px-3 py-2 diff-old bg-red-50 text-red-600 line-through">{sample.isAnomaly ? '是' : '否'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-red-50/50 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-red-700 mb-1">原结论</p>
            <p className="text-sm text-slate-700">{oldConclusion}</p>
          </div>
        </div>
      </div>

      <div className="border-l border-slate-200">
        <div className="bg-teal-50 border-b border-teal-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-teal-800">修正后</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <ClusterChart samples={newSamples} mini highlightIds={changedSampleIds} showLegend={false} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">样本</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">时间点</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">地点</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">聚类</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">异常</th>
                </tr>
              </thead>
              <tbody>
                {newSamples.filter(s => changedSampleIds.includes(s.id)).map(sample => {
                  const oldSample = oldById.get(sample.id);
                  const fields = oldSample ? getDiffFields(oldSample, sample) : [];
                  return (
                    <tr key={sample.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{sample.sampleName}</td>
                      <td className="px-3 py-2 diff-new bg-teal-50 text-teal-700 underline">{sample.timepoint}</td>
                      <td className="px-3 py-2">{sample.samplingLocation}</td>
                      <td className="px-3 py-2 diff-new bg-teal-50 text-teal-700 underline">{sample.clusterId}</td>
                      <td className="px-3 py-2 diff-new bg-teal-50 text-teal-700 underline">{sample.isAnomaly ? '是' : '否'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-teal-50/50 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-teal-700 mb-1">修正结论</p>
            <p className="text-sm text-slate-700">{newConclusion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
