import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Plus, Layers, AlertTriangle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store';
import SliceViewer3D from '@/components/SliceViewer3D';
import RecordList from '@/components/RecordList';
import RecordDetails from '@/components/RecordDetails';
import ColorLegend from '@/components/ColorLegend';
import ViewpointList from '@/components/ViewpointList';
import ImportDialog from '@/components/ImportDialog';
import { generateMockRecord } from '@/utils/mockData';
import { validateMeasurement, checkDuplicate, computeImportHash } from '@/utils/validation';
import { cn } from '@/lib/utils';

export default function Home() {
  const {
    records,
    selectedRecordId,
    selectedSliceId,
    viewpoints,
    selectedViewpointId,
    addRecord,
    addViewpoint,
    selectSlice,
    setStatusMessage,
    statusMessage,
    setImportDialogVisible,
  } = useAppStore();

  const selectedRecord = records.find((r) => r.id === selectedRecordId);
  const selectedViewpoint = viewpoints.find((v) => v.id === selectedViewpointId);

  const [currentView, setCurrentView] = useState<{
    position: [number, number, number];
    target: [number, number, number];
  }>({
    position: [5, 5, 8],
    target: [0, 0, 0],
  });

  const handleViewChange = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      setCurrentView({ position, target });
    },
    []
  );

  const handleSaveViewpoint = useCallback(() => {
    if (!selectedRecord) {
      setStatusMessage('请先选择一条记录再保存视角');
      setTimeout(() => setStatusMessage(null), 2500);
      return;
    }
    const existingForRecord = viewpoints.filter((v) => v.recordId === selectedRecord.id);
    const name = `${selectedRecord.name.slice(0, 8)} - 视角 ${existingForRecord.length + 1}`;
    addViewpoint({
      id: `viewpoint-${Date.now()}`,
      name,
      camera: currentView,
      recordId: selectedRecord.id,
      sliceId: selectedSliceId || undefined,
      created: new Date().toISOString(),
    });
    setStatusMessage(`视角 "${name}" 已保存，已绑定到当前记录`);
    setTimeout(() => setStatusMessage(null), 3000);
  }, [viewpoints, currentView, addViewpoint, setStatusMessage, selectedRecord, selectedSliceId]);

  const handleAddSampleRecord = useCallback(() => {
    const id = `record-${Date.now()}`;
    const name = `新记录 ${records.length + 1}`;
    const hasErrors = Math.random() > 0.6;
    const newRecord = generateMockRecord(id, name, hasErrors);
    newRecord.importHash = computeImportHash(newRecord);

    const validation = validateMeasurement(newRecord);
    if (!validation.valid) {
      newRecord.errors = [...newRecord.errors, ...validation.errors.filter((e) => e.severity === 'error')];
      newRecord.status = 'invalid';
    } else if (validation.errors.length > 0) {
      newRecord.errors = [...newRecord.errors, ...validation.errors];
      newRecord.status = newRecord.status === 'invalid' ? 'invalid' : 'review';
    }

    const dup = checkDuplicate(newRecord, records);
    if (dup.isDuplicate) {
      setStatusMessage(`跳过：${dup.reason}`);
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    addRecord(newRecord);
    setStatusMessage(`记录 "${name}" 已添加（${newRecord.status === 'valid' ? '可直接使用' : newRecord.status === 'review' ? '需复核' : '不可用'}）`);
    setTimeout(() => setStatusMessage(null), 3500);
  }, [records, addRecord, setStatusMessage]);

  const handleAddDuplicateTest = useCallback(() => {
    if (records.length === 0) {
      setStatusMessage('请先添加至少一条记录，再测试重复导入防护');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    const original = records[0];
    const dupRecord = generateMockRecord(`dup-${Date.now()}`, original.name, false);
    dupRecord.timestamp = original.timestamp;
    dupRecord.importHash = computeImportHash(original);

    const dup = checkDuplicate(dupRecord, records);
    if (dup.isDuplicate) {
      setStatusMessage(`重复导入防护生效：${dup.reason}，数据已阻止`);
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      addRecord(dupRecord);
      setStatusMessage('未检测到重复，已添加（测试场景）');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, [records, addRecord, setStatusMessage]);

  const handleSliceClick = useCallback(
    (sliceId: string) => {
      selectSlice(sliceId === selectedSliceId ? null : sliceId);
    },
    [selectSlice, selectedSliceId]
  );

  useEffect(() => {
    if (selectedViewpoint) {
      setCurrentView(selectedViewpoint.camera);
    }
  }, [selectedViewpoint]);

  const stats = {
    all: records.length,
    valid: records.filter((r) => r.status === 'valid').length,
    review: records.filter((r) => r.status === 'review').length,
    invalid: records.filter((r) => r.status === 'invalid').length,
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">核磁共振切片堆叠系统</h1>
            <p className="text-[11px] text-slate-400">水利工程检测数据可视化 · 实用版</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 mr-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>可用 {stats.valid}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
            <span>复核 {stats.review}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span>不可用 {stats.invalid}</span>
          </div>
          {stats.invalid > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              月底转交前请处理 {stats.invalid + stats.review} 条异常
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddDuplicateTest}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-slate-700"
            title="测试重复导入防护"
          >
            重复导入测试
          </button>
          <button
            onClick={handleAddSampleRecord}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">添加示例</span>
          </button>
          <button
            onClick={() => setImportDialogVisible(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            <Upload className="w-4 h-4" />
            导入数据
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <RecordList className="w-72 flex-shrink-0 border-r border-slate-700" />

        <div className="flex-1 relative bg-slate-950 min-w-0">
          {selectedRecord ? (
            <>
              <SliceViewer3D
                slices={selectedRecord.slices}
                selectedSliceId={selectedSliceId}
                expectedRange={selectedRecord.expectedValueRange || { min: 0, max: 1 }}
                onViewChange={handleViewChange}
                onSliceClick={handleSliceClick}
                initialView={selectedViewpoint?.camera}
              />

              <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3.5 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      selectedRecord.status === 'valid' && 'bg-green-500 animate-pulse',
                      selectedRecord.status === 'review' && 'bg-yellow-500 animate-pulse',
                      selectedRecord.status === 'invalid' && 'bg-red-500 animate-pulse'
                    )}
                  />
                  <span className="text-sm font-medium text-white">{selectedRecord.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                  <span>{selectedRecord.slices.length} 个切片</span>
                  <span>单位: {selectedRecord.unit}</span>
                  {selectedSliceId && (
                    <span className="text-blue-400">
                      已选中第 {selectedRecord.slices.findIndex((s) => s.id === selectedSliceId) + 1} 片
                    </span>
                  )}
                </div>
              </div>

              <ColorLegend />
              <ViewpointList onSaveViewpoint={handleSaveViewpoint} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Layers className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  欢迎使用核磁共振切片堆叠系统
                </h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  从左侧选择一条记录开始查看 3D 可视化。
                  <br />
                  支持批量导入 JSON 数据，自动检测单位错误、数值越界和重复记录。
                </p>
                <div className="flex items-center justify-center gap-2.5">
                  <button
                    onClick={handleAddSampleRecord}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors border border-slate-700"
                  >
                    添加示例数据
                  </button>
                  <button
                    onClick={() => setImportDialogVisible(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                  >
                    导入测量记录
                  </button>
                </div>

                {stats.invalid > 0 && (
                  <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-left">
                        当前有 <b>{stats.invalid}</b> 条记录不可用，
                        {stats.review > 0 && <><b> {stats.review}</b> 条需复核，</>}
                        月底转交甲方前请处理完毕。
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <RecordDetails className="w-80 flex-shrink-0 border-l border-slate-700" />
      </div>

      {statusMessage && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-600 text-sm z-50 animate-pulse">
          {statusMessage}
        </div>
      )}

      <ImportDialog />
    </div>
  );
}
