import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '@/store';
import { ArrowLeft, History, Download } from 'lucide-react';
import RopeCanvas from '@/components/RopeCanvas';
import AngleChart from '@/components/AngleChart';
import DetailExplanation from '@/components/DetailExplanation';
import TimePlayback from '@/components/TimePlayback';
import SectionViewer from '@/components/SectionViewer';
import CorrectionPanel from '@/components/CorrectionPanel';
import { anomalyTypeInfo, formatDateTime } from '@/components/constants';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentRecord, fetchRecord, updateRecord, addSection } = useStore();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames] = useState(12);

  useEffect(() => {
    if (id) fetchRecord(id);
  }, [id]);

  if (!currentRecord) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>加载中...</p>
      </div>
    );
  }

  const anomaly = currentRecord.anomalyType
    ? anomalyTypeInfo[currentRecord.anomalyType as Exclude<typeof currentRecord.anomalyType, null>]
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-4">
        <Link to="/" className="p-1.5 rounded hover:bg-slate-700 text-slate-300">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white font-mono">{currentRecord.code}</h2>
            {anomaly && (
              <span className="text-xs px-2 py-0.5 rounded bg-safety-orange/15 text-safety-orange border border-safety-orange/30">
                {anomaly.label}
              </span>
            )}
            {currentRecord.occlusionRejected && (
              <span className="text-xs px-2 py-0.5 rounded bg-safety-red/15 text-safety-red border border-safety-red/30">
                透明遮挡已拦截
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            创建于 {formatDateTime(currentRecord.createdAt)} · 更新于 {formatDateTime(currentRecord.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/records/${currentRecord.id}/history`}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            历史版本
          </Link>
          <Link
            to={`/records/${currentRecord.id}/export`}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            导出报告
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 p-4">
        <div className="col-span-5 flex flex-col gap-4 min-h-0">
          <div className="card flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-safety-orange animate-pulse-slow" />
              <h3 className="font-mono text-sm font-semibold text-white">绳索轨迹视图</h3>
              <span className="text-xs text-slate-400 ml-2">
                锚点 A → B · 共 {currentRecord.ropePoints.length} 个采样点
              </span>
            </div>
            <div className="flex-1 p-3 min-h-0">
              <RopeCanvas points={currentRecord.ropePoints} currentFrameIndex={currentFrame} />
            </div>
          </div>

          <div className="card flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-safety-blue" />
              <h3 className="font-mono text-sm font-semibold text-white">绳索角度趋势</h3>
              <span className="text-xs text-slate-400 ml-2">共 {currentRecord.angleData.length} 帧</span>
            </div>
            <div className="flex-1 p-2 min-h-0">
              <AngleChart data={currentRecord.angleData} currentFrameIndex={currentFrame} />
            </div>
          </div>
        </div>

        <div className="col-span-3 min-h-0">
          <div className="card h-full flex flex-col min-h-0">
            <DetailExplanation
              angleData={currentRecord.angleData}
              sections={currentRecord.sections}
              riskLevel={currentRecord.riskLevel}
              currentFrame={currentFrame}
            />
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <div className="card flex-1 flex flex-col min-h-0 relative">
            <SectionViewer
              sections={currentRecord.sections}
              currentFrame={currentFrame}
              onFrameClick={setCurrentFrame}
              onAddSection={async (sec) => {
                if (!id) return false;
                return addSection(id, sec);
              }}
            />
          </div>
          <div className="card flex-1 flex flex-col min-h-0">
            <CorrectionPanel
              record={currentRecord}
              onSave={async (payload) => {
                if (!id) return false;
                return updateRecord(id, payload);
              }}
            />
          </div>
        </div>
      </div>

      <TimePlayback
        totalFrames={totalFrames}
        sections={currentRecord.sections}
        currentFrame={currentFrame}
        onChange={setCurrentFrame}
      />
    </div>
  );
}
