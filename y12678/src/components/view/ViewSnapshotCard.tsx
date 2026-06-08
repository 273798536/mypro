import { Camera, User, Clock, Layers, AlertCircle, FileSpreadsheet } from "lucide-react";
import type { ViewSnapshot } from "@/types";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";
import ColorLegend from "./ColorLegend";

interface Props {
  snapshot: ViewSnapshot;
  index: number;
}

export default function ViewSnapshotCard({ snapshot, index }: Props) {
  const navigate = useNavigate();
  const { setActiveSnapshotId } = useAppStore();
  const [showLegend, setShowLegend] = useState(false);

  const handleClick = () => {
    setActiveSnapshotId(snapshot.id);
    navigate("/records");
  };

  const borderClass = snapshot.hasSupplement
    ? "ring-2 ring-lavender-400 ring-offset-1"
    : "";

  return (
    <div
      className={`group eng-card relative overflow-hidden cursor-pointer opacity-0 animate-fade-in-up ${borderClass}`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={handleClick}
      onMouseEnter={() => setShowLegend(true)}
      onMouseLeave={() => setShowLegend(false)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ocean-100">
        <img
          src={snapshot.thumbnailUrl}
          alt={snapshot.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/70 via-ocean-900/10 to-transparent" />

        {snapshot.outOfBoundsCount > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-coral-500 px-2 py-0.5 text-xs font-medium text-white shadow">
            <AlertCircle className="h-3 w-3" />
            <span className="font-mono-num">{snapshot.outOfBoundsCount}</span>
          </div>
        )}

        {snapshot.hasSupplement && (
          <div className="absolute left-2 top-2 rounded-full bg-lavender-500 px-2 py-0.5 text-xs font-medium text-white shadow">
            已补录
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-song text-base font-semibold text-white drop-shadow">
            {snapshot.name}
          </h3>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center gap-1 text-xs text-ocean-600">
          <Layers className="h-3.5 w-3.5" />
          <span className="truncate">{snapshot.projectName}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{snapshot.operator}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono-num">{snapshot.savedAt.slice(5)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded bg-ocean-50 px-2 py-1 text-xs text-ocean-700">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span className="font-mono-num">Excel {snapshot.rowRange}</span>
        </div>
      </div>

      {showLegend && (
        <div className="absolute right-3 top-10 z-10">
          <ColorLegend onClose={() => setShowLegend(false)} />
        </div>
      )}

      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-seaweed-500 transition-all duration-300 group-hover:w-full" />
    </div>
  );
}
