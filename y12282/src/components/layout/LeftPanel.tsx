import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  File,
  Database,
  FileText,
  Layers,
  FolderOpen,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { FileInfo, CrackPoint, Sensor, InspectionNote } from '../../types';

export function LeftPanel() {
  const { leftPanelCollapsed, setLeftPanelCollapsed, rawFiles, crackPoints, sensors, inspectionNotes } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<string[]>(['raw', 'cracks', 'sensors', 'notes']);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const getFileIcon = (type: FileInfo['type']) => {
    switch (type) {
      case 'model':
        return <Layers className="w-4 h-4 text-blue-400" />;
      case 'data':
        return <Database className="w-4 h-4 text-green-400" />;
      case 'note':
        return <FileText className="w-4 h-4 text-yellow-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (leftPanelCollapsed) {
    return (
      <div className="h-full bg-slate-800 border-r border-slate-700 flex flex-col">
        <button
          onClick={() => setLeftPanelCollapsed(false)}
          className="p-3 hover:bg-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-800 border-r border-slate-700 flex flex-col w-72">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-white font-bold text-sm">数据管理</h2>
        <button
          onClick={() => setLeftPanelCollapsed(true)}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="p-3 border-b border-slate-700">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Upload className="w-4 h-4" />
          导入文件
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="mb-4">
            <button
              onClick={() => toggleSection('raw')}
              className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-medium">原始材料</span>
              </div>
              <span className="text-xs text-gray-400 bg-slate-700 px-2 py-0.5 rounded">
                {rawFiles.length}
              </span>
            </button>
            {expandedSections.includes('raw') && (
              <div className="mt-1 ml-4 space-y-1">
                {rawFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-2 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs truncate">{file.name}</div>
                        <div className="text-gray-400 text-[10px]">
                          {formatFileSize(file.size)} · {file.uploadTime.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-gray-500">MD5:</span>
                      <code className="text-[10px] text-gray-400 font-mono truncate">
                        {file.hash}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mb-4">
            <button
              onClick={() => toggleSection('cracks')}
              className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span className="text-white text-sm font-medium">裂缝数据</span>
              </div>
              <span className="text-xs text-gray-400 bg-slate-700 px-2 py-0.5 rounded">
                {crackPoints.length}
              </span>
            </button>
            {expandedSections.includes('cracks') && (
              <div className="mt-1 ml-4 space-y-1 max-h-48 overflow-y-auto">
                {crackPoints.map((crack) => (
                  <CrackItem key={crack.id} crack={crack} />
                ))}
              </div>
            )}
          </div>
          <div className="mb-4">
            <button
              onClick={() => toggleSection('sensors')}
              className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-white text-sm font-medium">传感器</span>
              </div>
              <span className="text-xs text-gray-400 bg-slate-700 px-2 py-0.5 rounded">
                {sensors.length}
              </span>
            </button>
            {expandedSections.includes('sensors') && (
              <div className="mt-1 ml-4 space-y-1">
                {sensors.map((sensor) => (
                  <SensorItem key={sensor.id} sensor={sensor} />
                ))}
              </div>
            )}
          </div>
          <div className="mb-4">
            <button
              onClick={() => toggleSection('notes')}
              className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-400" />
                <span className="text-white text-sm font-medium">巡检备注</span>
              </div>
              <span className="text-xs text-gray-400 bg-slate-700 px-2 py-0.5 rounded">
                {inspectionNotes.length}
              </span>
            </button>
            {expandedSections.includes('notes') && (
              <div className="mt-1 ml-4 space-y-1 max-h-32 overflow-y-auto">
                {inspectionNotes.map((note) => (
                  <NoteItem key={note.id} note={note} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CrackItem({ crack }: { crack: CrackPoint }) {
  const { selectedCrackId, setSelectedCrackId } = useAppStore();
  const isSelected = selectedCrackId === crack.id;

  return (
    <div
      onClick={() => setSelectedCrackId(isSelected ? null : crack.id)}
      className={`p-2 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-orange-600/30 border border-orange-500' : 'bg-slate-700/50 hover:bg-slate-700'
      } ${crack.isDuplicate ? 'border-l-2 border-red-500' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-white text-xs font-medium">{crack.id}</span>
        {crack.isDuplicate && (
          <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">重复</span>
        )}
      </div>
      <div className="text-gray-400 text-[10px] mt-1 line-clamp-2">{crack.description}</div>
      <div className="text-gray-500 text-[10px] mt-1">
        位置: ({crack.position.x.toFixed(1)}, {crack.position.y.toFixed(1)}, {crack.position.z.toFixed(1)})
      </div>
    </div>
  );
}

function SensorItem({ sensor }: { sensor: Sensor }) {
  const statusColors = {
    online: 'bg-green-500',
    warning: 'bg-yellow-500',
    offline: 'bg-red-500',
  };

  const statusTexts = {
    online: '在线',
    warning: '警告',
    offline: '离线',
  };

  return (
    <div className="p-2 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <span className="text-white text-xs font-medium">{sensor.name}</span>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${statusColors[sensor.status]} animate-pulse`} />
          <span className="text-[10px] text-gray-400">{statusTexts[sensor.status]}</span>
        </div>
      </div>
      <div className="text-gray-500 text-[10px] mt-1">
        {sensor.type === 'pressure' ? '渗压计' : sensor.type === 'water_level' ? '水位计' : '流量计'}
      </div>
    </div>
  );
}

function NoteItem({ note }: { note: InspectionNote }) {
  return (
    <div className="p-2 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <span className="text-white text-xs font-medium">{note.author}</span>
        <span className="text-[10px] text-gray-400">
          {note.timestamp.toLocaleDateString()}
        </span>
      </div>
      <div className="text-gray-400 text-[10px] mt-1 line-clamp-2">{note.content}</div>
    </div>
  );
}
