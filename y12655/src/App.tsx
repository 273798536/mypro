import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './SceneManager';
import { GameState, SectionPlane, ScreenshotRecord, Conclusion, CollisionEvent } from './types';
import {
  createInitialState,
  checkSectionBounds,
  checkDuplicateImport,
  findMissingMeasurements,
  formatTime,
  generateScreenshotName,
  needsReview,
  CORAL_BOUNDS,
} from './gameLogic';

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const timerRef = useRef<number | null>(null);
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [collisionFlash, setCollisionFlash] = useState(false);

  useEffect(() => {
    if (canvasRef.current && !sceneRef.current) {
      sceneRef.current = new SceneManager(canvasRef.current);
      sceneRef.current.setSectionPlanes(state.sectionPlanes);
      sceneRef.current.setMeasurementMarkers(state.measurements);
      sceneRef.current.setBleachingProgress(state.bleachingProgress);
    }
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setSectionPlanes(state.sectionPlanes);
    }
  }, [state.sectionPlanes]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setMeasurementMarkers(state.measurements);
    }
  }, [state.measurements]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setBleachingProgress(state.bleachingProgress);
    }
  }, [state.bleachingProgress]);

  useEffect(() => {
    if (sceneRef.current) {
      const targetMeasurement = state.conclusions.find((c) => c.id === state.activeConclusionId)?.sourceMeasurementId;
      const m = state.measurements.find((mm) => mm.id === targetMeasurement);
      if (m) {
        sceneRef.current.highlightPosition(m.position);
      } else {
        sceneRef.current.highlightPosition(null);
      }
    }
  }, [state.activeConclusionId, state.conclusions, state.measurements]);

  useEffect(() => {
    if (state.status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedMs: prev.elapsedMs + 100,
          bleachingProgress: Math.min(1, prev.bleachingProgress + 0.0008),
        }));
      }, 100);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.status]);

  const addCollision = useCallback((event: CollisionEvent) => {
    setState((prev) => {
      if (prev.collisions.find((c) => c.message === event.message && Date.now() - c.timestamp < 3000)) {
        return prev;
      }
      return { ...prev, collisions: [event, ...prev.collisions] };
    });
    setCollisionFlash(true);
    setTimeout(() => setCollisionFlash(false), 150);
  }, []);

  const handleStart = () => {
    setState((prev) => ({ ...prev, status: 'playing' }));
  };

  const handlePause = () => {
    setState((prev) => ({ ...prev, status: 'paused' }));
  };

  const handleResume = () => {
    setState((prev) => ({ ...prev, status: 'playing' }));
  };

  const handleRestart = () => {
    const fresh = createInitialState();
    setState(fresh);
    if (sceneRef.current) {
      sceneRef.current.setSectionPlanes(fresh.sectionPlanes);
      sceneRef.current.setMeasurementMarkers(fresh.measurements);
      sceneRef.current.setBleachingProgress(0);
      sceneRef.current.highlightPosition(null);
    }
  };

  const handleFinish = () => {
    setState((prev) => ({ ...prev, status: 'finished' }));
    setShowFinishModal(true);
  };

  const handleReview = () => {
    setState((prev) => ({ ...prev, status: 'reviewing' }));
    setShowReviewModal(true);
    setShowFinishModal(false);
  };

  const handleSectionChange = (id: string, patch: Partial<SectionPlane>) => {
    setState((prev) => {
      const updated = prev.sectionPlanes.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      );

      if (patch.position !== undefined) {
        const plane = updated.find((p) => p.id === id)!;
        const check = checkSectionBounds(plane);
        if (!check.valid && check.collision) {
          addCollision(check.collision);
        }
      }

      const missing = findMissingMeasurements(prev.conclusions, prev.measurements);
      missing.forEach((m) => addCollision(m));

      return { ...prev, sectionPlanes: updated, activeSectionId: id };
    });
  };

  const handleTakeScreenshot = () => {
    if (!sceneRef.current) return;
    const dataUrl = sceneRef.current.takeScreenshot();
    const activeEnabled = state.sectionPlanes.find((p) => p.enabled && p.id === state.activeSectionId);
    const firstEnabled = state.sectionPlanes.find((p) => p.enabled);
    const refPlane = activeEnabled || firstEnabled || null;

    const record: ScreenshotRecord = {
      id: `shot-${Date.now()}`,
      name: generateScreenshotName(state.screenshots.length, refPlane),
      dataUrl,
      timestamp: Date.now(),
      sectionPlanes: state.sectionPlanes.filter((p) => p.enabled),
      cameraPosition: sceneRef.current.getCameraPosition(),
      needsReview: needsReview(refPlane),
      linkedConclusionIds: refPlane
        ? state.conclusions.filter((c) => c.sourceSectionId === refPlane.id).map((c) => c.id)
        : [],
    };

    setState((prev) => ({
      ...prev,
      screenshots: [record, ...prev.screenshots],
    }));
  };

  const handleImportData = (isDuplicate: boolean = false) => {
    setState((prev) => {
      const newCount = prev.importCount + (isDuplicate ? 2 : 1);
      const dupEvent = checkDuplicateImport(newCount);
      if (dupEvent) {
        setTimeout(() => addCollision(dupEvent), 0);
      }
      return { ...prev, importCount: newCount };
    });
  };

  const handleResolveCollision = (id: string) => {
    setState((prev) => ({
      ...prev,
      collisions: prev.collisions.map((c) => (c.id === id ? { ...c, resolved: true } : c)),
    }));
  };

  const handleClickConclusion = (conclusion: Conclusion) => {
    setState((prev) => ({
      ...prev,
      activeConclusionId: prev.activeConclusionId === conclusion.id ? null : conclusion.id,
      activeSectionId: conclusion.sourceSectionId || null,
    }));

    if (conclusion.sourceSectionId) {
      const plane = state.sectionPlanes.find((p) => p.id === conclusion.sourceSectionId);
      if (plane) {
        setState((prev) => ({
          ...prev,
          sectionPlanes: prev.sectionPlanes.map((p) =>
            p.id === conclusion.sourceSectionId ? { ...p, enabled: true } : p,
          ),
        }));
      }
    }
  };

  const handleJumpFromScreenshot = (shot: ScreenshotRecord) => {
    setState((prev) => ({
      ...prev,
      sectionPlanes: prev.sectionPlanes.map((p) => ({
        ...p,
        enabled: !!shot.sectionPlanes.find((sp) => sp.id === p.id),
        position: shot.sectionPlanes.find((sp) => sp.id === p.id)?.position ?? p.position,
      })),
      activeSectionId: shot.sectionPlanes[0]?.id || null,
    }));
  };

  const directConclusions = state.conclusions.filter((c) => c.canUseDirectly);
  const reviewConclusions = state.conclusions.filter((c) => !c.canUseDirectly);
  const unresolvedCollisions = state.collisions.filter((c) => !c.resolved);

  const getStatusBadgeClass = () => {
    switch (state.status) {
      case 'ready': return 'status-ready';
      case 'playing': return 'status-playing';
      case 'paused': return 'status-paused';
      case 'finished': return 'status-finished';
      case 'reviewing': return 'status-reviewing';
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case 'ready': return '待开始';
      case 'playing': return '运行中';
      case 'paused': return '已暂停';
      case 'finished': return '已结算';
      case 'reviewing': return '复盘中';
    }
  };

  return (
    <div className="app">
      <div className="canvas-container" ref={canvasRef}>
        <div className={`collision-flash ${collisionFlash ? 'active' : ''}`} />
        <div className="hud">
          <div className="hud-row">
            <span>时长: <span className="hud-value">{formatTime(state.elapsedMs)}</span></span>
            <span>白化: <span className="hud-value">{(state.bleachingProgress * 100).toFixed(1)}%</span></span>
            <span>异常: <span className="hud-value" style={{ color: unresolvedCollisions.length ? '#f87171' : '#4ade80' }}>{unresolvedCollisions.length}</span></span>
          </div>
        </div>
        <div className="hud-bottom">
          🖱️ 拖拽旋转视角 · 滚轮缩放 · 调整右侧剖面参数查看内部结构 · 点击结论可跳转到对应剖面和测量点
        </div>
      </div>

      <div className="sidebar">
        <div className="panel">
          <div className="panel-title">状态控制</div>
          <div style={{ marginBottom: 12 }}>
            <span className={`status-badge ${getStatusBadgeClass()}`}>● {getStatusText()}</span>
          </div>
          <div className="btn-row">
            {state.status === 'ready' && (
              <button className="btn btn-primary" onClick={handleStart}>▶ 开始</button>
            )}
            {state.status === 'playing' && (
              <>
                <button className="btn btn-warn" onClick={handlePause}>⏸ 暂停</button>
                <button className="btn btn-danger" onClick={handleFinish}>■ 结算</button>
              </>
            )}
            {state.status === 'paused' && (
              <>
                <button className="btn btn-primary" onClick={handleResume}>▶ 继续</button>
                <button className="btn btn-success" onClick={handleReview}>📋 复盘</button>
              </>
            )}
            {(state.status === 'finished' || state.status === 'reviewing') && (
              <>
                <button className="btn btn-success" onClick={handleReview} disabled={state.status === 'reviewing'}>📋 复盘</button>
                <button className="btn btn-primary" onClick={handleRestart}>↻ 重开</button>
              </>
            )}
            {state.status !== 'ready' && (
              <button className="btn" onClick={handleRestart}>↻ 重开</button>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">剖切面控制</div>

          {state.sectionPlanes.map((plane) => {
            const boundCheck = checkSectionBounds(plane);
            return (
              <div key={plane.id} style={{ marginBottom: 12, padding: 10, background: state.activeSectionId === plane.id ? '#1a2740' : 'transparent', borderRadius: 6 }}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={plane.enabled}
                    onChange={(e) => handleSectionChange(plane.id, { enabled: e.target.checked })}
                  />
                  <span style={{ color: plane.color }}>■ {plane.name}</span>
                </label>
                {plane.enabled && (
                  <div style={{ marginTop: 8, paddingLeft: 22 }}>
                    <div className="slider-row">
                      <span className="slider-label">
                        {plane.axis.toUpperCase()}轴
                      </span>
                      <input
                        type="range"
                        min={plane.axis === 'x' ? CORAL_BOUNDS.minX : plane.axis === 'y' ? CORAL_BOUNDS.minY : CORAL_BOUNDS.minZ}
                        max={plane.axis === 'x' ? CORAL_BOUNDS.maxX : plane.axis === 'y' ? CORAL_BOUNDS.maxY : CORAL_BOUNDS.maxZ}
                        step={0.5}
                        value={plane.position}
                        onChange={(e) => handleSectionChange(plane.id, { position: parseFloat(e.target.value) })}
                      />
                      <span
                        className="slider-value"
                        style={{ color: boundCheck.valid ? '#60a5fa' : '#f87171' }}
                      >
                        {plane.position.toFixed(1)}
                      </span>
                    </div>
                    {!boundCheck.valid && boundCheck.collision && (
                      <div className="error-box">
                        <div className="error-box-title">⚠️ 剖切面越界</div>
                        <div>{boundCheck.collision.actionableHint}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="panel">
          <div className="panel-title">截图导出 ({state.screenshots.length})</div>
          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={handleTakeScreenshot}>📸 截图导出</button>
            <button className="btn" onClick={() => handleImportData(false)}>📥 导入数据</button>
            <button className="btn btn-warn" onClick={() => handleImportData(true)}>⚠️ 重复导入测试</button>
          </div>
          {state.screenshots.length > 0 && (
            <div className="screenshot-list scroll-area">
              {state.screenshots.map((shot) => (
                <div key={shot.id} className="screenshot-item" onClick={() => handleJumpFromScreenshot(shot)}>
                  <img src={shot.dataUrl} className="screenshot-thumb" alt={shot.name} />
                  <div className="screenshot-info">
                    <div className="screenshot-name">{shot.name}</div>
                    <div className="screenshot-meta">
                      {shot.needsReview ? (
                        <span style={{ color: '#fbbf24' }}>⚠️ 需物理老师复核</span>
                      ) : (
                        <span style={{ color: '#4ade80' }}>✓ 可直接使用</span>
                      )}
                      {' · '}
                      {shot.sectionPlanes.map((p) => `${p.axis.toUpperCase()}=${p.position.toFixed(0)}`).join(',')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-title">结论清单（点击跳转到来源）</div>
          <div className="scroll-area" style={{ flex: 1 }}>
            {unresolvedCollisions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {unresolvedCollisions.map((c) => (
                  <div key={c.id} className="error-box">
                    <div className="error-box-title">
                      {c.type === 'section_out_of_bounds' && '⚠️ 剖切面越界'}
                      {c.type === 'duplicate_import' && '⚠️ 重复导入'}
                      {c.type === 'missing_measurement' && '⚠️ 缺失测量记录'}
                      {c.type === 'data_inconsistency' && '⚠️ 数据不一致'}
                    </div>
                    <div style={{ marginBottom: 6 }}>{c.message}</div>
                    <div>
                      <span className="error-action" onClick={() => handleResolveCollision(c.id)}>
                        ✕ 标记已处理
                      </span>
                      {' · '}
                      <span style={{ color: '#a8b8d8' }}>{c.actionableHint}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, marginBottom: 6 }}>
              ✓ 可直接使用 ({directConclusions.length})
            </div>
            {directConclusions.map((c) => (
              <div
                key={c.id}
                className={`conclusion-card conclusion-direct ${state.activeConclusionId === c.id ? 'ring-2' : ''}`}
                onClick={() => handleClickConclusion(c)}
                style={{ boxShadow: state.activeConclusionId === c.id ? '0 0 0 2px #4ade80' : undefined }}
              >
                <div className="conclusion-label">✓ 直接可用</div>
                <div className="conclusion-text">{c.text}</div>
                {c.sourceSectionId && (
                  <div className="conclusion-source">
                    → 跳转到 {state.sectionPlanes.find((p) => p.id === c.sourceSectionId)?.name}
                    {c.sourceMeasurementId && ` · 测量点: ${c.sourceMeasurementId}`}
                  </div>
                )}
              </div>
            ))}

            <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, margin: '12px 0 6px' }}>
              ⚠️ 需物理老师复核 ({reviewConclusions.length})
            </div>
            {reviewConclusions.map((c) => (
              <div
                key={c.id}
                className="conclusion-card conclusion-review"
                onClick={() => handleClickConclusion(c)}
                style={{ boxShadow: state.activeConclusionId === c.id ? '0 0 0 2px #fbbf24' : undefined }}
              >
                <div className="conclusion-label">⚠️ 需复核</div>
                <div className="conclusion-text">{c.text}</div>
                {c.reviewReason && (
                  <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>原因: {c.reviewReason}</div>
                )}
                {c.sourceSectionId && (
                  <div className="conclusion-source">
                    → 跳转到 {state.sectionPlanes.find((p) => p.id === c.sourceSectionId)?.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showFinishModal && (
        <div className="modal-overlay" onClick={() => setShowFinishModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">🏁 结算报告</div>
            <div className="modal-section">
              <div className="modal-section-title">运行统计</div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">总时长</div>
                  <div className="stat-value">{formatTime(state.elapsedMs)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">最终白化率</div>
                  <div className="stat-value">{(state.bleachingProgress * 100).toFixed(1)}%</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">截图数量</div>
                  <div className="stat-value">{state.screenshots.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">异常事件</div>
                  <div className="stat-value" style={{ color: state.collisions.length ? '#f87171' : '#4ade80' }}>
                    {state.collisions.length}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-section">
              <div className="modal-section-title">结论可用性</div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">可直接使用</div>
                  <div className="stat-value" style={{ color: '#4ade80' }}>{directConclusions.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">需复核</div>
                  <div className="stat-value" style={{ color: '#fbbf24' }}>{reviewConclusions.length}</div>
                </div>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={handleReview}>📋 进入复盘</button>
              <button className="btn" onClick={() => setShowFinishModal(false)}>关闭</button>
              <button className="btn" onClick={handleRestart}>↻ 重新开始</button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">📋 复盘模式</div>
            <div className="modal-section">
              <div className="modal-section-title">截图时间线（点击恢复视角）</div>
              <div className="section-list scroll-area">
                {state.screenshots.length === 0 ? (
                  <div style={{ color: '#6b7faa', fontSize: 12, padding: 10 }}>暂无截图记录</div>
                ) : (
                  state.screenshots.map((shot, idx) => (
                    <div key={shot.id} className="section-item" onClick={() => { handleJumpFromScreenshot(shot); setShowReviewModal(false); }}>
                      <span>#{state.screenshots.length - idx} · {shot.name}</span>
                      <span className={shot.needsReview ? 'section-item-bad' : 'section-item-ok'}>
                        {shot.needsReview ? '⚠️ 需复核' : '✓ 可用'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-section">
              <div className="modal-section-title">异常事件记录</div>
              <div className="section-list scroll-area">
                {state.collisions.length === 0 ? (
                  <div style={{ color: '#6b7faa', fontSize: 12, padding: 10 }}>无异常</div>
                ) : (
                  state.collisions.map((c) => (
                    <div key={c.id} className="section-item">
                      <span style={{ fontSize: 11 }}>
                        [{new Date(c.timestamp).toLocaleTimeString()}] {c.message}
                      </span>
                      <span className={c.resolved ? 'section-item-ok' : 'section-item-bad'}>
                        {c.resolved ? '✓ 已处理' : '⚠️ 未处理'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => setShowReviewModal(false)}>关闭</button>
              <button className="btn btn-primary" onClick={handleRestart}>↻ 重新开始</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
