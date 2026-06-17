import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import TopNav from "@/components/layout/TopNav";
import PointInfoCard from "@/components/detail/PointInfoCard";
import VersionTimeline from "@/components/detail/VersionTimeline";
import RemarkPanel from "@/components/detail/RemarkPanel";
import EvidenceGallery from "@/components/detail/EvidenceGallery";
import ActionBar from "@/components/detail/ActionBar";
import { useReviewStore } from "@/store/reviewStore";
import { mockVersions, mockRemarks, mockEvidences } from "@/data/mockData";
import { AlertTriangle } from "lucide-react";

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const getPoint = useReviewStore((s) => s.getPointById);
  const point = id ? getPoint(id) : undefined;
  const conclusionRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState(false);

  const versions = mockVersions.filter((v) => v.pointId === id);
  const remarks = mockRemarks.filter((r) => r.pointId === id);
  const evidences = mockEvidences.filter((e) => e.pointId === id);

  const handleHighlight = () => {
    conclusionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(true);
    setTimeout(() => setHighlight(false), 1600);
  };

  if (!point) {
    return (
      <div className="min-h-screen bg-ink-50">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-clay-600 mx-auto mb-3" />
            <p className="text-ink-700 font-medium mb-1">未找到该点位</p>
            <p className="text-sm text-slate-500">点位 ID 不存在或已被删除</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <TopNav />
      <main className="max-w-5xl mx-auto p-6 pb-28">
        <div className="space-y-5">
          <PointInfoCard
            point={point}
            conclusionRef={conclusionRef}
            highlightConclusion={highlight}
          />
          <VersionTimeline versions={versions} />
          <RemarkPanel remarks={remarks} onHighlightConclusion={handleHighlight} />
          <EvidenceGallery evidences={evidences} />
        </div>
        <ActionBar pointId={point.id} currentStatus={point.status} />
      </main>
    </div>
  );
}
