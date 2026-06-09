import { useSceneStore } from '../../store/sceneStore';
import { useDataStore } from '../../store/dataStore';
import { useReviewStore } from '../../store/reviewStore';
import { useThree } from '@react-three/fiber';

export default function StatusBarInner() {
  const selectedId = useSceneStore((s) => s.selectedRecordId);
  const records = useDataStore((s) => s.records);
  const activeCoord = useDataStore((s) => s.activeCoordinateSystem);
  const currentTime = useReviewStore((s) => s.currentTimeParam);
  const camera = useSceneStore((s) => s.camera);
  const { gl } = useThree();

  const selected = records.find((r) => r.id === selectedId);

  return null;
}

export function StatusBar() {
  const selectedId = useSceneStore((s) => s.selectedRecordId);
  const records = useDataStore((s) => s.records);
  const activeCoord = useDataStore((s) => s.activeCoordinateSystem);
  const currentTime = useReviewStore((s) => s.currentTimeParam);
  const camera = useSceneStore((s) => s.camera);
  const showSection = useSceneStore((s) => s.showSectionPlane);
  const sectionY = useSceneStore((s) => s.sectionPlaneY);
  const sectionToggle = useSceneStore((s) => s.toggleSectionPlane);
  const setSectionY = useSceneStore((s) => s.setSectionPlaneY);

  const selected = records.find((r) => r.id === selectedId);
  const totalRecords = records.length;
  const approved = records.filter((r) => r.reviewStatus === 'approved').length;
  const pending = records.filter((r) => r.reviewStatus === 'pending').length;
  const disputed = records.filter((r) => r.reviewStatus === 'disputed').length;

  return (
    <footer className="flex items-center gap-4 border-t border-slate-800 bg-slate-950/90 px-4 py-1.5 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-slate-500">坐标系:</span>
        <span className="font-mono text-[#00D4AA]">{activeCoord}</span>
      </div>
      <div className="h-3 w-px bg-slate-700" />
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-slate-500">当前时刻:</span>
        <span className="font-mono text-[#FFD93D]">{currentTime.slice(5, 16)}</span>
      </div>
      <div className="h-3 w-px bg-slate-700" />
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-slate-500">记录:</span>
        <span className="font-mono text-slate-400">{totalRecords} 总</span>
        <span className="font-mono text-emerald-400">● {approved} 通过</span>
        <span className="font-mono text-amber-400">● {pending} 待复核</span>
        <span className="font-mono text-rose-400">● {disputed} 有异议</span>
      </div>
      <div className="h-3 w-px bg-slate-700" />
      <button
        onClick={sectionToggle}
        className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] transition-all ${
          showSection
            ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        ◻ 剖面切割
        {showSection && (
          <>
            <span className="mx-1 h-2 w-px bg-slate-700" />
            <input
              type="range"
              min="-50"
              max="0"
              step="0.5"
              value={sectionY}
              onChange={(e) => setSectionY(Number(e.target.value))}
              className="w-20 accent-[#00D4AA]"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="font-mono">{sectionY.toFixed(1)}m</span>
          </>
        )}
      </button>
      <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-slate-500">
        <span>
          CAM ({camera.position.x.toFixed(1)}, {camera.position.y.toFixed(1)}, {camera.position.z.toFixed(1)})
        </span>
        {selected && (
          <>
            <span className="h-3 w-px bg-slate-700" />
            <span className="text-slate-400">
              选中: <span className="text-[#00D4AA]">{selected.sourceFile}#L{selected.sourceLine}</span>
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
