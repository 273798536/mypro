import { useMemo, useState } from "react";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileSearch,
} from "lucide-react";
import { useAppStore } from "@/store";
import PageHeader from "@/components/PageHeader";
import { MERGE_DISTANCE_THRESHOLD, MERGE_SIMILARITY_THRESHOLD } from "@/utils/helpers";
import type { LocationPair } from "@/types";

export default function LocationMerge() {
  const pairs = useAppStore((s) => s.locationPairs);
  const locations = useAppStore((s) => s.locations);
  const mergeEvidences = useAppStore((s) => s.mergeEvidences);
  const mergeLocations = useAppStore((s) => s.mergeLocations);
  const rejectMerge = useAppStore((s) => s.rejectMerge);
  const detectLocationPairs = useAppStore((s) => s.detectLocationPairs);

  const [activePair, setActivePair] = useState<LocationPair | null>(null);
  const [evidence, setEvidence] = useState("");

  const pendingPairs = useMemo(() => pairs.filter((p) => !p.reviewed), [pairs]);
  const reviewedPairs = useMemo(() => pairs.filter((p) => p.reviewed), [pairs]);

  function handleConfirm() {
    if (!activePair) return;
    if (!evidence.trim()) {
      alert("请填写归并证据说明");
      return;
    }
    mergeLocations(activePair.id, evidence.trim());
    setActivePair(null);
    setEvidence("");
  }

  function handleReject() {
    if (!activePair) return;
    rejectMerge(activePair.id);
    setActivePair(null);
    setEvidence("");
  }

  return (
    <div>
      <PageHeader
        title="地点名称归并"
        subtitle={`同一地点多种写法需人工确认，归并结果留证据，相邻点位（>${MERGE_DISTANCE_THRESHOLD}m且相似度<${(MERGE_SIMILARITY_THRESHOLD * 100).toFixed(0)}%）禁止误合`}
        actions={
          <button className="btn-secondary" onClick={() => detectLocationPairs()}>
            <RefreshCw size={15} /> 重新检测疑似重复
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-xs text-municipal-500 mb-1">待确认归并</div>
          <div className="font-serif text-3xl font-semibold text-warning-600">{pendingPairs.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-municipal-500 mb-1">已确认归并</div>
          <div className="font-serif text-3xl font-semibold text-success-600">
            {mergeEvidences.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-municipal-500 mb-1">已确认地点总数</div>
          <div className="font-serif text-3xl font-semibold text-municipal-700">{locations.length}</div>
        </div>
      </div>

      {pendingPairs.length === 0 && reviewedPairs.length === 0 && (
        <div className="card p-16 text-center text-municipal-400">
          <FileSearch size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">暂无疑似重复地点</p>
          <p className="text-xs mt-1">导入或新增反馈后系统会自动检测；也可点击右上角「重新检测」</p>
        </div>
      )}

      {pendingPairs.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-municipal-700 mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-warning-500" /> 待人工确认（{pendingPairs.length}）
          </h3>
          <div className="space-y-3 mb-8">
            {pendingPairs.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
                  <LocationCard title="写法 A" alias={p.aliasA} highlight={p.nameSimilarity >= 0.8} />
                  <div className="flex flex-col items-center justify-center pt-6">
                    <div className="text-xs text-municipal-500 mb-2 text-center">
                      名称相似 {(p.nameSimilarity * 100).toFixed(1)}%
                      <br />
                      距离 {p.coordinateDistance.toFixed(0)}m
                    </div>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      p.nameSimilarity >= MERGE_SIMILARITY_THRESHOLD || p.coordinateDistance <= MERGE_DISTANCE_THRESHOLD
                        ? "bg-success-100 text-success-600"
                        : "bg-danger-100 text-danger-600"
                    }`}>
                      <ArrowRight size={18} />
                    </div>
                    <div className="text-[11px] mt-2 text-center" style={{ color:
                      p.nameSimilarity >= MERGE_SIMILARITY_THRESHOLD || p.coordinateDistance <= MERGE_DISTANCE_THRESHOLD
                        ? "#059669"
                        : "#dc2626"
                    }}>
                      {
                        p.nameSimilarity >= MERGE_SIMILARITY_THRESHOLD || p.coordinateDistance <= MERGE_DISTANCE_THRESHOLD
                          ? "疑似同地点"
                          : "相似度/距离不达标"
                      }
                    </div>
                  </div>
                  <LocationCard title="写法 B" alias={p.aliasB} highlight={p.nameSimilarity >= 0.8} />
                </div>
                <div className="mt-4 pt-3 border-t border-municipal-100 flex items-center justify-between">
                  <div className="text-xs text-municipal-500">
                    {p.coordinateDistance > MERGE_DISTANCE_THRESHOLD && p.nameSimilarity < MERGE_SIMILARITY_THRESHOLD ? (
                      <span className="text-danger-600">⚠ 距离过远且名称相似度不足，系统判定为相邻点位，禁止合并</span>
                    ) : (
                      <span>请人工确认是否为同一地点后操作</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => setActivePair(p)}
                      disabled={p.coordinateDistance > MERGE_DISTANCE_THRESHOLD && p.nameSimilarity < MERGE_SIMILARITY_THRESHOLD}
                    >
                      <CheckCircle2 size={15} /> 确认归并
                    </button>
                    <button className="btn-ghost" onClick={() => rejectMerge(p.id)}>
                      <XCircle size={15} /> 不是同地点
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {reviewedPairs.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-municipal-700 mb-3 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-municipal-500" /> 已处理（{reviewedPairs.length}）
          </h3>
          <div className="space-y-2">
            {reviewedPairs.map((p) => {
              const evi = mergeEvidences.find(
                (e) => (e.aliasAId === p.aliasA.id && e.aliasBId === p.aliasB.id) ||
                        (e.aliasAId === p.aliasB.id && e.aliasBId === p.aliasA.id),
              );
              const isMerged = !!evi;
              return (
                <div key={p.id} className={`card p-3 ${isMerged ? "border-success-200 bg-success-50/30" : "border-municipal-100 opacity-70"}`}>
                  <div className="flex items-center gap-3 text-sm">
                    {isMerged ? (
                      <CheckCircle2 size={16} className="text-success-500" />
                    ) : (
                      <XCircle size={16} className="text-municipal-400" />
                    )}
                    <span className="font-medium text-municipal-700">「{p.aliasA.aliasName}」{isMerged ? "⇔" : "≠"}「{p.aliasB.aliasName}」</span>
                    {isMerged && evi && (
                      <>
                        <span className="text-xs text-municipal-500">证据：{evi.evidenceText}</span>
                        <span className="text-xs text-municipal-400">· {evi.confirmedBy} @ {new Date(evi.confirmedAt).toLocaleString()}</span>
                      </>
                    )}
                    {!isMerged && <span className="text-xs text-municipal-400">已判定为不同地点</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h3 className="text-sm font-semibold text-municipal-700 mt-8 mb-3">已确认地点及别名</h3>
      <div className="grid grid-cols-2 gap-3">
        {locations.map((loc) => (
          <div key={loc.id} className="card p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <MapPin size={14} className="text-municipal-500" />
              <span className="font-serif font-semibold text-municipal-800">{loc.canonicalName}</span>
              <span className="text-[11px] text-municipal-500">{loc.feedbackCount} 条反馈</span>
            </div>
            {loc.aliases.length > 1 && (
              <div className="text-xs text-municipal-500 ml-6">
                曾用名/别名：
                {loc.aliases
                  .filter((a) => a.aliasName !== loc.canonicalName)
                  .map((a) => `「${a.aliasName}」`)
                  .join("、")}
              </div>
            )}
            <div className="text-[11px] text-municipal-400 ml-6 mt-0.5 font-mono">
              {loc.lng.toFixed(5)}, {loc.lat.toFixed(5)}
            </div>
          </div>
        ))}
      </div>

      {activePair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-municipal-900/40 backdrop-blur-sm" onClick={() => setActivePair(null)}>
          <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-semibold text-municipal-800 mb-2">确认归并地点</h3>
            <p className="text-sm text-municipal-600 mb-4">
              将「<span className="font-medium">{activePair.aliasA.aliasName}</span>」与「<span className="font-medium">{activePair.aliasB.aliasName}</span>」归并为同一地点
            </p>
            <div className="bg-municipal-50 rounded p-3 text-xs space-y-1 mb-4">
              <div>名称相似度：<span className="font-mono font-medium text-municipal-700">{(activePair.nameSimilarity * 100).toFixed(1)}%</span></div>
              <div>坐标距离：<span className="font-mono font-medium text-municipal-700">{activePair.coordinateDistance.toFixed(0)} m</span></div>
            </div>
            <label className="label">归并证据说明 <span className="text-danger-500">*</span></label>
            <textarea
              className="input min-h-[80px] mb-4"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="请说明归并依据（例：网格员现场核实为同一雨水口，仅居民写法不同），此证据将永久留存不可删除"
            />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setActivePair(null)}>取消</button>
              <button className="btn-primary" onClick={handleConfirm}>确认归并并存证</button>
            </div>
            <p className="text-[11px] text-municipal-400 mt-3">
              归并后所有别名、原始反馈、归并证据均保留在库，可追溯。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationCard({ title, alias, highlight }: { title: string; alias: LocationPair["aliasA"]; highlight: boolean }) {
  const loc = useAppStore.getState().locations.find((l) => l.id === alias.locationId);
  return (
    <div className={`rounded border p-3 ${highlight ? "border-warning-300 bg-warning-50/30" : "border-municipal-100 bg-municipal-50/40"}`}>
      <div className="text-[11px] text-municipal-500 mb-1">{title}</div>
      <div className="font-medium text-municipal-800 text-sm leading-snug">{alias.aliasName}</div>
      <div className="text-[11px] text-municipal-500 mt-1.5">
        归属于：<span className="text-municipal-600">{loc?.canonicalName ?? "—"}</span>
      </div>
      {alias.lng != null && (
        <div className="text-[11px] font-mono text-municipal-400 mt-0.5">
          {alias.lng.toFixed(5)}, {alias.lat?.toFixed(5)}
        </div>
      )}
    </div>
  );
}
