import { useState, useEffect } from 'react';
import { RoleProvider, useRole } from './context/RoleContext';
import { useGameState } from './hooks/useGameState';
import { ControlBar } from './components/ControlBar';
import { Canvas } from './components/Canvas';
import { InfoPanel } from './components/InfoPanel';
import { StatsPanel } from './components/StatsPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { RoleSwitch } from './components/RoleSwitch';
import type { AnnotationResult } from './types';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 550;

function GameContent() {
  const {
    state,
    start,
    pause,
    resume,
    restart,
    finish,
    annotate,
    getCurrentRecord,
    getStats,
    isCurrentRecordAnnotated,
    getHitRate,
  } = useGameState();

  const { isTeacher } = useRole();
  const [showReview, setShowReview] = useState(false);

  const currentRecord = getCurrentRecord();
  const stats = getStats();
  const hitRate = getHitRate();
  const annotated = isCurrentRecordAnnotated();

  useEffect(() => {
    if (state.phase === 'finished') {
      setShowReview(true);
    } else {
      setShowReview(false);
    }
  }, [state.phase]);

  const handleAnnotate = (result: AnnotationResult) => {
    annotate(result);
  };

  const handleRestart = () => {
    setShowReview(false);
    restart();
  };

  const handleFinish = () => {
    finish();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ControlBar
        phase={state.phase}
        elapsedTime={state.elapsedTime}
        currentIndex={state.currentRecordIndex}
        totalRecords={state.records.length}
        onStart={start}
        onPause={pause}
        onResume={resume}
        onRestart={handleRestart}
        onFinish={handleFinish}
      />

      <div className="flex-1 p-6 flex items-start justify-center gap-6 overflow-auto">
        <div className="flex flex-col gap-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <RoleSwitch />
          <InfoPanel record={currentRecord} phase={state.phase} />
        </div>

        <div
          className="flex-shrink-0 animate-fadeIn"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            animationDelay: '0.2s',
          }}
        >
          <Canvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            record={currentRecord}
            phase={state.phase}
            showActualCoords={isTeacher}
            onAnnotate={handleAnnotate}
            isAnnotated={annotated}
          />
        </div>

        <div
          className="animate-fadeIn"
          style={{ animationDelay: '0.3s' }}
        >
          <StatsPanel stats={stats} hitRate={hitRate} />
        </div>
      </div>

      {showReview && (
        <ReviewPanel
          records={state.records}
          results={state.results}
          stats={stats}
          hitRate={hitRate}
          elapsedTime={state.elapsedTime}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <GameContent />
    </RoleProvider>
  );
}
