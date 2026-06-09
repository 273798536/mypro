import { useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Scene3D, { type Scene3DHandle } from "@/components/three/Scene3D";
import GameControls from "@/components/ui/GameControls";
import JudgmentPanel from "@/components/ui/JudgmentPanel";
import SourceTracePanel from "@/components/ui/SourceTracePanel";
import JudgmentTimeline from "@/components/ui/JudgmentTimeline";
import { getSceneById } from "@/data/mock/scenes";
import { useGameStore } from "@/stores/gameStore";
import { useReviewStore } from "@/stores/reviewStore";
import { buildTraceInfo, createScreenshot, downloadDataUrl } from "@/utils/export";
import { dedupeMeasurements } from "@/utils/collision";

export default function GameScene() {
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const sceneRef = useRef<Scene3DHandle>(null);

  const scene = sceneId ? getSceneById(sceneId) : undefined;

  const session = useGameStore((s) => s.session);
  const cutPlane = useGameStore((s) => s.cutPlane);
  const elapsedSeconds = useGameStore((s) => s.elapsedSeconds);
  const isPaused = useGameStore((s) => s.isPaused);
  const startSession = useGameStore((s) => s.startSession);
  const pauseSession = useGameStore((s) => s.pauseSession);
  const resumeSession = useGameStore((s) => s.resumeSession);
  const resetSession = useGameStore((s) => s.resetSession);
  const completeSession = useGameStore((s) => s.completeSession);
  const setCutValue = useGameStore((s) => s.setCutValue);
  const setActiveAxis = useGameStore((s) => s.setActiveAxis);
  const tick = useGameStore((s) => s.tick);

  const lastCollision = useReviewStore((s) => s.lastCollision);
  const allJudgments = useReviewStore((s) => s.judgments);
  const addJudgment = useReviewStore((s) => s.addJudgment);
  const addScreenshot = useReviewStore((s) => s.addScreenshot);
  const highlightedRecordId = useReviewStore((s) => s.highlightedRecordId);
  const setHighlightedRecordId = useReviewStore((s) => s.setHighlightedRecordId);
  const selectedOutlierId = useReviewStore((s) => s.selectedOutlierId);
  const setSelectedOutlierId = useReviewStore((s) => s.setSelectedOutlierId);
  const calculateScore = useReviewStore((s) => s.calculateScore);

  const judgments = useMemo(
    () => (session ? allJudgments[session.id] || [] : []),
    [allJudgments, session],
  );

  useEffect(() => {
    if (scene && (!session || session.sceneId !== scene.id)) {
      startSession(scene.id);
    }
  }, [scene, session, startSession]);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  if (!scene || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mine-300">场景不存在...</div>
      </div>
    );
  }

  const activeMin =
    cutPlane.activeAxis === "x"
      ? scene.boundary.minX
      : cutPlane.activeAxis === "y"
        ? scene.boundary.minY
        : scene.boundary.minZ;
  const activeMax =
    cutPlane.activeAxis === "x"
      ? scene.boundary.maxX
      : cutPlane.activeAxis === "y"
        ? scene.boundary.maxY
        : scene.boundary.maxZ;

  const dedupedMeasurements = scene.isDuplicateTest
    ? dedupeMeasurements(scene.measurements)
    : scene.measurements;

  const handleSubmit = (
    type: "safe" | "review" | "error",
    recordId: string | null,
    comment: string,
  ) => {
    addJudgment(session.id, {
      type,
      cutAxis: cutPlane.activeAxis,
      cutValue: cutPlane[cutPlane.activeAxis],
      isBoundaryCrossed: lastCollision?.isCrossed || false,
      crossDistance: lastCollision?.distance || 0,
      measurementRecordId: recordId,
      comment,
    });
  };

  const handleScreenshot = () => {
    const canvas = sceneRef.current?.getCanvas();
    if (!canvas) return;
    const record = scene.measurements.find((m) => m.id === highlightedRecordId) || null;
    const trace = buildTraceInfo(
      scene.name,
      cutPlane.activeAxis,
      cutPlane[cutPlane.activeAxis],
      record,
    );
    const shot = createScreenshot(session.id, canvas, trace);
    addScreenshot(session.id, shot);
    downloadDataUrl(shot.dataUrl, `pore-${session.id.slice(-6)}-${Date.now()}.png`);
  };

  const handleFinish = () => {
    const { score, accuracy } = calculateScore(session.id, scene.targetJudgments);
    completeSession(score, accuracy);
    navigate(`/result/${session.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="grain-overlay" />
      <div className="relative z-10 p-4 lg:p-5 flex flex-col gap-4 flex-1 h-screen overflow-hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="btn-secondary flex items-center gap-1.5 !px-3 !py-2"
          >
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <div className="flex-1">
            <GameControls
              scene={scene}
              elapsedSeconds={elapsedSeconds}
              isPaused={isPaused}
              judgmentCount={judgments.length}
              onStart={() => {}}
              onPause={pauseSession}
              onResume={resumeSession}
              onReset={resetSession}
              onScreenshot={handleScreenshot}
              onFinish={handleFinish}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px_320px] gap-4 flex-1 min-h-0">
          <div className="card-glass overflow-hidden relative min-h-[400px]">
            <Scene3D
              ref={sceneRef}
              scene={scene}
              cutX={cutPlane.x}
              cutY={cutPlane.y}
              cutZ={cutPlane.z}
              activeAxis={cutPlane.activeAxis}
            />
            {isPaused && (
              <div className="absolute inset-0 bg-mine-900/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="font-serif text-3xl font-bold text-amber-glow">已暂停</div>
                  <button onClick={resumeSession} className="btn-primary">
                    继续训练
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto">
            <JudgmentPanel
              axis={cutPlane.activeAxis}
              value={cutPlane[cutPlane.activeAxis]}
              boundary={{ min: activeMin, max: activeMax }}
              collision={lastCollision}
              measurements={dedupedMeasurements}
              onAxisChange={setActiveAxis}
              onValueChange={(v) => setCutValue(cutPlane.activeAxis, v)}
              onSubmit={handleSubmit}
            />
            <JudgmentTimeline judgments={judgments} measurements={scene.measurements} />
          </div>

          <div className="min-h-0">
            <SourceTracePanel
              measurements={dedupedMeasurements}
              outliers={scene.outliers}
              selectedOutlierId={selectedOutlierId}
              highlightedId={highlightedRecordId}
              onHighlight={setHighlightedRecordId}
              onSelectOutlier={setSelectedOutlierId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
