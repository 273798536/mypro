import { useRef } from 'react';
import { ResultSummary } from '@/components/report/ResultSummary';
import { Explanation } from '@/components/report/Explanation';
import { ExportButton } from '@/components/report/ExportButton';
import { useSelectionStore } from '@/store/useSelectionStore';
import { mockSamples } from '@/data/mockSamples';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Report() {
  const { selections } = useSelectionStore();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const currentSample = mockSamples[0];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#2D5A27] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回圈选页面
          </Link>
        </div>

        <div ref={reportRef}>
          <div className="space-y-6">
            <ResultSummary
              selections={selections}
              sampleName={currentSample.name}
            />

            <Explanation
              selections={selections}
              sampleName={currentSample.name}
            />

            <ExportButton
              selections={selections}
              sampleName={currentSample.name}
              reportRef={reportRef}
            />
          </div>
        </div>

        {selections.length === 0 && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-semibold text-yellow-800 mb-2">提示</h3>
            <p className="text-sm text-yellow-700">
              您还没有完成任何病斑圈选。请先返回圈选页面，完成病斑标注后再来生成报告。
              报告中的所有数据（包括图表、明细和下载结果）都将来自同一批圈选数据，确保一致性。
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#2D5A27] text-white rounded-lg hover:bg-[#3d7336] transition-colors text-sm"
            >
              前往圈选页面
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
