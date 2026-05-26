import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePointCloud } from '../hooks/usePointCloud';
import { useAnnotation } from '../hooks/useAnnotation';
import { useVersionControl } from '../hooks/useVersionControl';
import { useAnomalyDetection } from '../hooks/useAnomalyDetection';
import PointCloudViewer from '../components/viewer/PointCloudViewer';
import ToolbarPanel from '../components/panels/ToolbarPanel';
import InfoPanel from '../components/panels/InfoPanel';
import StatusBar from '../components/panels/StatusBar';
import VersionPanel from '../components/panels/VersionPanel';
import ImportDialog from '../components/dialogs/ImportDialog';
import ExportDialog from '../components/dialogs/ExportDialog';
import WarningDialog from '../components/dialogs/WarningDialog';
import { takeScreenshot, generateReportPDF, downloadBlob, exportAnnotationsAsJSON } from '../utils/exportUtils';
import { DamageLevel } from '../types';
const AnnotationPage: React.FC = () => {
 const viewerContainerRef = useRef<HTMLDivElement>(null);
 const { pointclouds, activePointcloudId, loadSampleData, loadFromFiles } = usePointCloud();
 const { annotations, selectedAnnotation, selectedAnnotationId, updateAnnotation, deleteAnnotation, createBoxAnnotation, } = useAnnotation();
 const { versions, createVersion, revertToVersion } = useVersionControl();
 const { warnings, checkAll } = useAnomalyDetection();
 const [isImportOpen, setIsImportOpen] = useState(false);
 const [isExportOpen, setIsExportOpen] = useState(false);
 const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const [exportStatus, setExportStatus] = useState('');
 const [warningDialog, setWarningDialog] = useState<{
 isOpen: boolean;
 title: string;
 message: string;
 details?: string;
 type: 'warning' | 'error' | 'info';
 onConfirm: () => void;
 } | null>(null);
 const { selectionMode, setSelectionMode, setSelectedAnnotation, cameraPosition, setCameraPosition, coordinateOffsetWarning, levelOverlapWarning, unsavedChanges, } = useAppStore();
 const handleBoxSelect = useCallback((box: {
 min: {
 x: number;
 y: number;
 z: number;
 };
 max: {
 x: number;
 y: number;
 z: number;
 };
 }) => {
 const treeRowId = `树行-${Date.now().toString(36).substr(-4).toUpperCase()}`;
 createBoxAnnotation(box, treeRowId, 'moderate');
 setSelectionMode('view');
 }, [createBoxAnnotation, setSelectionMode]);
 const handleSelectAnnotation = useCallback((id: string | null) => {
 setSelectedAnnotation(id);
 }, [setSelectedAnnotation]);
 const handleImportFiles = useCallback(async (files: FileList) => {
 await loadFromFiles(files);
 }, [loadFromFiles]);
 const handleSaveVersion = useCallback(() => {
    const description = `版本更新 ${new Date().toLocaleString()}`;
    createVersion(description);
  }, [createVersion]);
 const handleExportScreenshot = useCallback(async () => {
 if (!viewerContainerRef.current)
 return;
 setIsExporting(true);
 setExportStatus('正在生成截图...');
 try {
 const canvas = viewerContainerRef.current.querySelector('canvas');
 if (canvas) {
 canvas.toBlob((blob) => {
 if (blob) {
 downloadBlob(blob, `灾损标注截图-${Date.now()}.png`);
 }
 });
 }
 setExportStatus('截图导出完成！');
 }
 catch (error) {
 setExportStatus('导出失败，请重试');
 }
 finally {
 setTimeout(() => {
 setIsExporting(false);
 setExportStatus('');
 }, 1500);
 }
 }, []);
 const handleExportReport = useCallback(async () => {
 setIsExporting(true);
 setExportStatus('正在生成报告...');
 try {
 const pdfBlob = generateReportPDF({
 annotations,
 pointclouds,
 versions,
 projectName: activePointcloudId ? pointclouds.find((p) => p.id === activePointcloudId)?.name || '未命名项目' : '未命名项目',
 inspector: useAppStore.getState().currentUser,
 });
 downloadBlob(pdfBlob, `灾损理赔报告-${Date.now()}.pdf`);
 setExportStatus('报告导出完成！');
 }
 catch (error) {
 setExportStatus('报告生成失败，请重试');
 }
 finally {
 setTimeout(() => {
 setIsExporting(false);
 setExportStatus('');
 }, 1500);
 }
 }, [annotations, pointclouds, versions, activePointcloudId]);
 const handleExportJSON = useCallback(() => {
 setIsExporting(true);
 setExportStatus('正在导出JSON...');
 try {
 const json = exportAnnotationsAsJSON(annotations);
 const blob = new Blob([json], { type: 'application/json' });
 downloadBlob(blob, `标注数据-${Date.now()}.json`);
 setExportStatus('JSON导出完成！');
 }
 catch (error) {
 setExportStatus('导出失败，请重试');
 }
 finally {
 setTimeout(() => {
 setIsExporting(false);
 setExportStatus('');
 }, 1500);
 }
 }, [annotations]);
 useEffect(() => {
 if (pointclouds.length > 0) {
 checkAll();
 }
 }, [pointclouds, annotations]);
 return (<div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
 <div className="flex-1 flex overflow-hidden">
 <ToolbarPanel onImport={() => setIsImportOpen(true)} onExportScreenshot={() => setIsExportOpen(true)} onExportReport={handleExportReport} onSaveVersion={handleSaveVersion} onShowHistory={() => setIsVersionPanelOpen(true)} hasUnsavedChanges={unsavedChanges} hasWarnings={coordinateOffsetWarning || levelOverlapWarning}/>

 <div ref={viewerContainerRef} className="flex-1 relative">
 <PointCloudViewer pointclouds={pointclouds} activePointcloudId={activePointcloudId} annotations={annotations} selectedAnnotationId={selectedAnnotationId} selectionMode={selectionMode} onSelectAnnotation={handleSelectAnnotation} onBoxSelect={handleBoxSelect} cameraPosition={cameraPosition}/>

 {pointclouds.length === 0 && (<div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
 <div className="text-center">
 <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
 <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
 </svg>
 </div>
 <h2 className="text-lg font-medium text-white mb-2">保险灾损三维标注</h2>
 <p className="text-sm text-slate-400 mb-4">导入点云数据或加载示例数据开始标注</p>
 <button onClick={() => setIsImportOpen(true)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
 导入数据
 </button>
 </div>
 </div>)}

 {selectionMode === 'box-select' && (<div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-900/80 border border-blue-700 rounded-lg text-sm text-blue-200">
 框选模式：按住鼠标左键拖拽选择区域
 </div>)}

 <VersionPanel isOpen={isVersionPanelOpen} onClose={() => setIsVersionPanelOpen(false)} onRevert={revertToVersion}/>
 </div>

 <InfoPanel annotation={selectedAnnotation} onClose={() => setSelectedAnnotation(null)} onUpdate={updateAnnotation} onDelete={deleteAnnotation}/>
 </div>

 <StatusBar warnings={warnings} cameraPosition={cameraPosition} selectionMode={selectionMode}/>

 <ImportDialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImportFiles={handleImportFiles} onImportSample={loadSampleData}/>

 <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} onExportScreenshot={handleExportScreenshot} onExportReport={handleExportReport} onExportJSON={handleExportJSON} isExporting={isExporting} exportStatus={exportStatus}/>

 {warningDialog && (<WarningDialog isOpen={warningDialog.isOpen} onClose={() => setWarningDialog(null)} onConfirm={warningDialog.onConfirm} title={warningDialog.title} message={warningDialog.message} details={warningDialog.details} type={warningDialog.type}/>)}
 </div>);
};
export default AnnotationPage;

