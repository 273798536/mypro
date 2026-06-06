import CanvasToolbar from '../components/canvas/CanvasToolbar';
import CanvasArea from '../components/canvas/CanvasArea';
import AnnotationPanel from '../components/canvas/AnnotationPanel';
import ColorLegend from '../components/canvas/ColorLegend';

export default function CanvasPage() {
  return (
    <div className="h-full flex flex-col">
      <CanvasToolbar />
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          <ColorLegend />
          <CanvasArea />
        </div>
        <AnnotationPanel />
      </div>
    </div>
  );
}
