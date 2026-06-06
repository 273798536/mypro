import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toolbar from "@/components/Toolbar";
import AnnotationCanvas from "@/components/AnnotationCanvas";
import RightPanel from "@/components/RightPanel";
import DuplicateDialog from "@/components/DuplicateDialog";
import type { TrajectoryRecord } from "@/types";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { mergeRecords, saveToLocalStorage } from "@/utils/dataIO";

export default function Home() {
  const navigate = useNavigate();
  const { loadRecord, record } = useAnnotationStore();
  const [dupState, setDupState] = useState<{
    existing: TrajectoryRecord;
    incoming: TrajectoryRecord;
  } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const { cancelDrawing, isDrawing, setToolMode } = useAnnotationStore.getState();
        if (isDrawing) {
          cancelDrawing();
        } else {
          setToolMode("select");
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          useAnnotationStore.getState().redo();
        } else {
          useAnnotationStore.getState().undo();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleDuplicateFound = (existing: TrajectoryRecord, incoming: TrajectoryRecord) => {
    setDupState({ existing, incoming });
  };

  const handleMerge = () => {
    if (!dupState) return;
    const merged = mergeRecords(dupState.existing, dupState.incoming);
    loadRecord(merged);
    saveToLocalStorage(merged);
    setDupState(null);
  };

  const handleOverwrite = () => {
    if (!dupState) return;
    loadRecord(dupState.incoming);
    saveToLocalStorage(dupState.incoming);
    setDupState(null);
  };

  const handleRequestReport = () => {
    saveToLocalStorage(record);
    navigate("/report");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      <Toolbar
        onRequestReport={handleRequestReport}
        onDuplicateFound={handleDuplicateFound}
      />
      <AnnotationCanvas />
      <RightPanel />

      {dupState && (
        <DuplicateDialog
          existing={dupState.existing}
          incoming={dupState.incoming}
          onMerge={handleMerge}
          onOverwrite={handleOverwrite}
          onCancel={() => setDupState(null)}
        />
      )}
    </div>
  );
}
