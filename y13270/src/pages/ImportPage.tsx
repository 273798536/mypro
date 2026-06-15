import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { usePointStore } from '../store';
import { EmptyState } from '../components/EmptyState';
import { calculateDistance } from '../utils/geo';

interface ImportPreviewItem {
  rawName: string;
  rawLat: number;
  rawLng: number;
  source: string;
  sourceLine: number;
  rawData: Record<string, any>;
  influenceRadius: number;
  isOffset: boolean;
  offsetDistance: number;
}

export function ImportPage() {
  const { mergedPoints, importRawPoints } = usePointStore();
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [importSource, setImportSource] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasData = mergedPoints.length > 0;

  const parseCSV = (text: string): ImportPreviewItem[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const items: ImportPreviewItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length < 3) continue;

      const rawData: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rawData[h] = values[idx] || '';
      });

      const name = values[headers.indexOf('name')] || values[0] || '';
      const lat = parseFloat(values[headers.indexOf('latitude')] || values[headers.indexOf('lat')] || values[1]) || 0;
      const lng = parseFloat(values[headers.indexOf('longitude')] || values[headers.indexOf('lng')] || values[2]) || 0;

      const canonicalLat = lat;
      const canonicalLng = lng;
      const offsetDistance = calculateDistance(lat, lng, canonicalLat, canonicalLng);
      const influenceRadius = 50;

      items.push({
        rawName: name,
        rawLat: lat,
        rawLng: lng,
        source: '手动导入.csv',
        sourceLine: i + 1,
        rawData,
        influenceRadius,
        isOffset: offsetDistance > influenceRadius * 0.5,
        offsetDistance,
      });
    }

    return items;
  };

  const parseJSON = (text: string): ImportPreviewItem[] => {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : data.features || data.points || [];

      return arr.map((item: any, index: number) => {
        const name = item.name || item.properties?.name || item.rawName || '';
        const lat = item.latitude || item.lat || item.geometry?.coordinates?.[1] || 0;
        const lng = item.longitude || item.lng || item.geometry?.coordinates?.[0] || 0;

        const canonicalLat = lat;
        const canonicalLng = lng;
        const offsetDistance = calculateDistance(lat, lng, canonicalLat, canonicalLng);
        const influenceRadius = 50;

        return {
          rawName: name,
          rawLat: lat,
          rawLng: lng,
          source: '手动导入.json',
          sourceLine: index + 1,
          rawData: item,
          influenceRadius,
          isOffset: offsetDistance > influenceRadius * 0.5,
          offsetDistance,
        };
      });
    } catch {
      return [];
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let items: ImportPreviewItem[] = [];

      if (file.name.endsWith('.csv')) {
        items = parseCSV(text);
        setImportSource(file.name);
      } else if (file.name.endsWith('.json')) {
        items = parseJSON(text);
        setImportSource(file.name);
      }

      setPreviewData(items);
      setImportSuccess(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = () => {
    if (previewData.length === 0) return;

    const pointsToImport = previewData.map((item) => ({
      source: item.source,
      sourceLine: item.sourceLine,
      rawName: item.rawName,
      rawLat: item.rawLat,
      rawLng: item.rawLng,
      rawData: item.rawData,
      influenceRadius: item.influenceRadius,
      isOffset: item.isOffset,
      offsetDistance: item.offsetDistance,
    }));

    importRawPoints(pointsToImport, importSource);
    setImportSuccess(true);
    setPreviewData([]);
  };

  const handleReset = () => {
    setPreviewData([]);
    setImportSource('');
    setImportSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadSampleCSV = () => {
    const sampleCSV = `name,latitude,longitude,source
人民广场站,31.2304,121.4737,上海市测绘院
南京路站,31.2350,121.4800,上海市测绘院
外滩站,31.2390,121.4920,上海市测绘院
陆家嘴站,31.2400,121.5010,上海市测绘院`;

    const items = parseCSV(sampleCSV);
    setPreviewData(items);
    setImportSource('示例数据.csv');
    setImportSuccess(false);
  };

  if (!hasData && previewData.length === 0 && !importSuccess) {
    return (
      <div className="animate-fade-in-up">
        <div className="mb-6">
          <h2 className="text-2xl font-serif-cn font-bold text-gray-800 mb-2">
            数据导入
          </h2>
          <p className="text-gray-500 text-sm">
            导入GIS点位数据，系统将保留完整原始数据痕迹
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-2xl font-serif-cn font-bold text-gray-800 mb-2">
          数据导入
        </h2>
        <p className="text-gray-500 text-sm">
          导入GIS点位数据，系统将保留完整原始数据痕迹
        </p>
      </div>

      {importSuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-emerald-700 mb-2">
            导入成功
          </h3>
          <p className="text-emerald-600 mb-6">
            数据已成功导入，所有原始数据已完整保留。
          </p>
          <button onClick={handleReset} className="btn-primary">
            继续导入
          </button>
        </div>
      ) : previewData.length > 0 ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-city-blue-600" />
                <span className="font-medium text-gray-700">
                  数据预览 - {importSource}
                </span>
                <span className="text-sm text-gray-500">
                  ({previewData.length} 条数据)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="btn-secondary text-sm py-1.5 px-3">
                  重新选择
                </button>
                <button onClick={handleConfirmImport} className="btn-primary text-sm py-1.5 px-3">
                  确认导入
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">行号</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">原始名称</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">坐标</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">偏移检测</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.map((item, index) => (
                    <tr key={index} className={item.isOffset ? 'bg-orange-50' : ''}>
                      <td className="px-4 py-2 text-gray-500 font-mono-data">
                        {item.sourceLine}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {item.rawName}
                      </td>
                      <td className="px-4 py-2 font-mono-data text-gray-600">
                        ({item.rawLat.toFixed(4)}, {item.rawLng.toFixed(4)})
                      </td>
                      <td className="px-4 py-2">
                        {item.isOffset ? (
                          <span className="flex items-center gap-1 text-orange-600 text-xs">
                            <AlertCircle className="w-3 h-3" />
                            坐标偏移 {item.offsetDistance.toFixed(0)}米
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData.some(d => d.isOffset) && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-start gap-2 text-orange-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">检测到坐标偏移</p>
                    <p className="text-orange-600 text-xs mt-1">
                      部分点位坐标偏移超出影响范围，系统将保留原始坐标并标记偏移，不会自动修改。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-city-blue-50 rounded-lg border border-city-blue-200 p-4">
            <div className="flex items-start gap-2 text-sm text-city-blue-700">
              <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">原始数据保留说明</p>
                <p className="text-xs text-city-blue-600">
                  导入后，所有原始数据（包括不规范的名称、偏移的坐标）将完整保留在系统中。
                  归并操作仅作用于规范名称和坐标，原始数据始终可追溯，不会被修改或覆盖。
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragging
              ? 'border-city-blue-500 bg-city-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-city-blue-500' : 'text-gray-400'}`} />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            拖拽文件到此处，或点击选择文件
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            支持 CSV、JSON 格式的 GIS 点位数据
          </p>
          <div className="flex items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              选择文件
            </button>
            <button
              onClick={loadSampleCSV}
              className="btn-secondary"
            >
              加载示例数据
            </button>
          </div>
          <div className="mt-6 text-xs text-gray-400">
            <p>CSV 格式示例: name,latitude,longitude</p>
            <p>JSON 格式示例: {'[{\"name\": \"站点名\", \"lat\": 31.23, \"lng\": 121.47}]'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
