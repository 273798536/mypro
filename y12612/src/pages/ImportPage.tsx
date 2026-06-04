import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatchStore } from '@/stores/useBatchStore';
import { CoordinateFlipDetector } from '@/services/coordinateDetector';
import { FlipAlertCard } from '@/components/import/FlipAlertCard';
import type { Device } from '@/types';
import { generateId } from '@/utils/helpers';
import {
  Upload,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export function ImportPage() {
  const navigate = useNavigate();
  const { devices: existingDevices, importDevices, confirmCoordinateFlip } = useBatchStore();
  const [importedDevices, setImportedDevices] = useState<Device[]>([]);
  const [issues, setIssues] = useState<
    Array<{ deviceId: string; deviceName: string; result: any }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const devices = parseCSV(text);
        const { devices: processed, issues: detectedIssues } =
          CoordinateFlipDetector.processDevices(devices);

        const deduped = CoordinateFlipDetector.deduplicateDevices(
          processed,
          existingDevices
        );

        setImportedDevices(deduped);
        setIssues(detectedIssues);
        setImportComplete(true);
      } catch (error) {
        console.error('Failed to parse file:', error);
        alert('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string): Device[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const idIndex = headers.indexOf('id') || headers.indexOf('设备id');
    const nameIndex = headers.indexOf('name') || headers.indexOf('设备名称');
    const typeIndex = headers.indexOf('type') || headers.indexOf('类型');
    const xIndex = headers.indexOf('x') || headers.indexOf('经度') || headers.indexOf('lng');
    const yIndex = headers.indexOf('y') || headers.indexOf('纬度') || headers.indexOf('lat');
    const riskIndex = headers.indexOf('risklevel') || headers.indexOf('风险等级');

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return {
        id: values[idIndex] || generateId(),
        name: values[nameIndex] || `设备${index + 1}`,
        type: (values[typeIndex] as Device['type']) || 'electrical',
        x: parseFloat(values[xIndex]) || 0,
        y: parseFloat(values[yIndex]) || 0,
        layerId: 'layer-equipment',
        riskLevel: (values[riskIndex] as Device['riskLevel']) || 'warning',
        annotations: [],
      };
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleConfirmImport = () => {
    importDevices(importedDevices);
    navigate('/');
  };

  const loadSampleData = () => {
    const sampleData = `设备ID,设备名称,类型,经度,纬度,风险等级
DEV001,3号塔吊,crane,121.4745,31.2308,warning
DEV002,E区脚手架,scaffold,31.2312,121.4760,danger
DEV003,F区灭火器,fire_extinguisher,121.4733,31.2295,safe
DEV004,G区配电箱,electrical,200.1234,31.2300,warning`;
    const devices = parseCSV(sampleData);
    const { devices: processed, issues: detectedIssues } =
      CoordinateFlipDetector.processDevices(devices);
    const deduped = CoordinateFlipDetector.deduplicateDevices(
      processed,
      existingDevices
    );
    setImportedDevices(deduped);
    setIssues(detectedIssues);
    setImportComplete(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white/10 rounded transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>
          设备导入
        </h1>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {!importComplete ? (
          <div className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-[#1e3a5f] bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <FileSpreadsheet
                size={64}
                className="mx-auto text-gray-400 mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                拖拽 CSV 文件到此处
              </h3>
              <p className="text-gray-500 mb-4">
                或点击选择文件，支持 CSV 格式
              </p>
              <button
                className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a7a] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                选择文件
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Info size={18} className="text-[#1e3a5f]" />
                CSV 格式要求
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>CSV 文件应包含以下列（列名支持中英文）：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <code className="bg-gray-100 px-2 py-0.5 rounded">设备ID</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">id</code>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-2 py-0.5 rounded">设备名称</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">name</code>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-2 py-0.5 rounded">类型</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">type</code>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-2 py-0.5 rounded">经度</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">x</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">lng</code>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-2 py-0.5 rounded">纬度</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">y</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">lat</code>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-2 py-0.5 rounded">风险等级</code> /{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">riskLevel</code>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={loadSampleData}
                className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto"
              >
                <Upload size={16} />
                加载示例数据（包含坐标异常）
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500" />
                  导入预览
                </h3>
                <span className="text-sm text-gray-500">
                  共 {importedDevices.length} 个设备
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        设备名称
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        类型
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        坐标
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        风险等级
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedDevices.map((device) => (
                      <tr
                        key={device.id}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-medium">{device.name}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {device.type === 'crane'
                            ? '塔吊'
                            : device.type === 'scaffold'
                              ? '脚手架'
                              : device.type === 'fire_extinguisher'
                                ? '灭火器'
                                : '电气设备'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {device.x.toFixed(4)}, {device.y.toFixed(4)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              device.riskLevel === 'safe'
                                ? 'bg-green-100 text-green-700'
                                : device.riskLevel === 'warning'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {device.riskLevel === 'safe'
                              ? '安全'
                              : device.riskLevel === 'warning'
                                ? '警示'
                                : '危险'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {device.coordinateFlip ? (
                            <span className="text-amber-600 flex items-center gap-1 text-xs">
                              <AlertTriangle size={14} />
                              坐标异常
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1 text-xs">
                              <CheckCircle2 size={14} />
                              正常
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {issues.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-500" />
                  检测到 {issues.length} 个坐标异常
                </h3>
                {issues.map((issue) => (
                  <FlipAlertCard
                    key={issue.deviceId}
                    deviceName={issue.deviceName}
                    result={issue.result}
                    confirmed={
                      importedDevices.find((d) => d.id === issue.deviceId)
                        ?.coordinateFlip?.userConfirmed || false
                    }
                    onConfirm={() => confirmCoordinateFlip(issue.deviceId)}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setImportedDevices([]);
                  setIssues([]);
                  setImportComplete(false);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重新选择
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a7a] transition-colors flex items-center gap-2"
              >
                <Upload size={16} />
                确认导入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
