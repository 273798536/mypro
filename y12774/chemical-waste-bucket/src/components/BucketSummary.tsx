import type { ExperimentRecord } from '../types';
import { generateBucketSummary, generatePlainTextReport, downloadTextFile } from '../utils/exportReport';
import { isExperimentRecordUsable } from '../utils/validation';
import { AlertTriangle, CheckCircle, XCircle, Download, Beaker, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
  records: ExperimentRecord[];
  onViewRecord: (record: ExperimentRecord) => void;
}

export default function BucketSummary({ records, onViewRecord }: Props) {
  const buckets = generateBucketSummary(records);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());

  const toggleBucket = (bucketNumber: string) => {
    const newSet = new Set(expandedBuckets);
    if (newSet.has(bucketNumber)) {
      newSet.delete(bucketNumber);
    } else {
      newSet.add(bucketNumber);
    }
    setExpandedBuckets(newSet);
  };

  const handleExport = () => {
    const report = generatePlainTextReport(records);
    const date = new Date().toISOString().split('T')[0];
    downloadTextFile(report, `化学实验废液分桶报告_${date}.txt`);
  };

  const totalRecords = records.length;
  const abnormalCount = records.filter(r => r.hasAbnormalities).length;
  const unusableCount = records.filter(r => !isExperimentRecordUsable(r)).length;
  const usableCount = totalRecords - unusableCount;

  const categoryColor: Record<string, string> = {
    '有机废液': 'bg-green-100 text-green-800 border-green-200',
    '无机酸废液': 'bg-red-100 text-red-800 border-red-200',
    '无机碱废液': 'bg-blue-100 text-blue-800 border-blue-200',
    '重金属废液': 'bg-purple-100 text-purple-800 border-purple-200',
    '氧化性废液': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    '还原性废液': 'bg-gray-100 text-gray-800 border-gray-200',
    '含氰废液': 'bg-red-200 text-red-900 border-red-300',
    '其他': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Beaker className="text-blue-600" />
            废液分桶汇总
          </h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download size={18} />
            导出月度报告
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">总记录数</div>
            <div className="text-3xl font-bold text-gray-800 mt-1">{totalRecords}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-700">可正常分桶</div>
            <div className="text-3xl font-bold text-green-800 mt-1 flex items-center gap-2">
              {usableCount}
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-sm text-yellow-700">存在异常</div>
            <div className="text-3xl font-bold text-yellow-800 mt-1 flex items-center gap-2">
              {abnormalCount}
              <AlertTriangle size={24} className="text-yellow-600" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-red-700">不可用（待修正）</div>
            <div className="text-3xl font-bold text-red-800 mt-1 flex items-center gap-2">
              {unusableCount}
              <XCircle size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        {unusableCount > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FileText size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-amber-800 mb-1">给同事的普通话说明（可直接复制）：</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  本月共有 {totalRecords} 条废液记录，其中 {usableCount} 条可以正常分桶处理，
                  {unusableCount} 条存在问题暂时不能用。
                  主要问题集中在试剂浓度填写错误（比如把浓盐酸12mol/L写成20，或者干脆忘了填）。
                  学生们在填写浓度时容易写错数字或漏填，这些有问题的记录已经单独列出来了，
                  请相关同学核对后重新提交。没有问题的记录可以按桶号正常分类处理。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {buckets.map(bucket => {
          const isExpanded = expandedBuckets.has(bucket.bucketNumber);
          const hasUnusable = bucket.unusableRecords.length > 0;
          return (
            <div key={bucket.bucketNumber} className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${hasUnusable ? 'border-red-300' : 'border-transparent'}`}>
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => toggleBucket(bucket.bucketNumber)}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-lg text-gray-800 bg-gray-100 px-3 py-1 rounded">
                    {bucket.bucketNumber}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${categoryColor[bucket.wasteCategory]}`}>
                    {bucket.wasteCategory}
                  </span>
                  <span className="text-gray-600">
                    {bucket.recordCount} 条记录 · {(bucket.totalVolume / 1000).toFixed(2)} L
                  </span>
                  {bucket.abnormalRecords.length > 0 && (
                    <span className="text-sm text-orange-600 flex items-center gap-1">
                      <AlertTriangle size={16} />
                      {bucket.abnormalRecords.length} 条异常
                    </span>
                  )}
                  {bucket.unusableRecords.length > 0 && (
                    <span className="text-sm text-red-600 flex items-center gap-1">
                      <XCircle size={16} />
                      {bucket.unusableRecords.length} 条不可用
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200">
                  {bucket.unusableRecords.length > 0 && (
                    <div className="p-4 bg-red-50 border-b border-red-100">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle size={18} className="text-red-600" />
                        <span className="font-semibold text-red-800">以下记录不可用于分桶，学生需修正后重新提交：</span>
                      </div>
                      <div className="space-y-2">
                        {bucket.unusableRecords.map(record => (
                          <div
                            key={record.id}
                            className="border border-red-200 bg-white rounded-lg p-3 hover:bg-red-50 cursor-pointer"
                            onClick={() => onViewRecord(record)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800">{record.experimentName}</div>
                                <div className="text-sm text-gray-600">{record.experimenter} · {record.experimentDate}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-red-600">
                                  {record.abnormalitySummary.length} 个问题
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">点击查看详情</div>
                              </div>
                            </div>
                            {record.abnormalitySummary.length > 0 && (
                              <ul className="mt-2 ml-4 list-disc space-y-0.5">
                                {record.abnormalitySummary.slice(0, 2).map((s, i) => (
                                  <li key={i} className="text-xs text-red-700">{s}</li>
                                ))}
                                {record.abnormalitySummary.length > 2 && (
                                  <li className="text-xs text-red-500">...还有 {record.abnormalitySummary.length - 2} 个问题</li>
                                )}
                              </ul>
                            )}
                            {record.manualNotes.trim() && (
                              <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                                <span className="text-gray-500">学生备注（原话）：</span>{record.manualNotes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bucket.experiments.filter(r => isExperimentRecordUsable(r)).length > 0 && (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={18} className="text-green-600" />
                        <span className="font-semibold text-green-800">以下记录可正常用于分桶：</span>
                      </div>
                      <div className="space-y-2">
                        {bucket.experiments.filter(r => isExperimentRecordUsable(r)).map(record => (
                          <div
                            key={record.id}
                            className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => onViewRecord(record)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800">{record.experimentName}</div>
                                <div className="text-sm text-gray-600">{record.experimenter} · {record.experimentDate}</div>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${record.status === '复核通过' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {record.status}
                                </span>
                                {record.manualNotes.trim() && (
                                  <div className="text-xs text-gray-500 mt-0.5">含备注</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
