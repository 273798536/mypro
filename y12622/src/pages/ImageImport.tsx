import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Image, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { parseCoordinates } from '../utils/coordinateParser';
import { computeImageHash } from '../utils/imageHash';
import type { SourceImage } from '../types';

interface ImportPreview {
  id: string;
  file: File;
  file_data: string;
  coordinates: string;
  batch_no: string;
  equipment_id: string;
  status: 'pending' | 'exists' | 'error';
  existing_id?: string;
  error_message?: string;
}

export default function ImageImport() {
  const navigate = useNavigate();
  const equipment = useAppStore((state) => state.equipment);
  const sourceImages = useAppStore((state) => state.sourceImages);
  const importImages = useAppStore((state) => state.importImages);
  const currentUser = useAppStore((state) => state.currentUser);

  const [previewItems, setPreviewItems] = useState<ImportPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [defaultEquipment, setDefaultEquipment] = useState('');
  const [defaultBatch, setDefaultBatch] = useState('BATCH-' + new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number } | null>(null);

  const existingKeys = new Map(
    sourceImages.map((img) => [`${img.image_hash}|${img.coordinates}`, img.id])
  );

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (!defaultEquipment) {
        alert('请先选择默认关联设备');
        return;
      }

      const newItems: ImportPreview[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        try {
          const file_data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const image_hash = await computeImageHash(file);
          const parsed = parseCoordinates(file.name);
          const coordinates = parsed.raw;
          const key = `${image_hash}|${coordinates}`;
          const existing_id = existingKeys.get(key);

          newItems.push({
            id: Math.random().toString(36).slice(2),
            file,
            file_data,
            coordinates,
            batch_no: defaultBatch,
            equipment_id: defaultEquipment,
            status: existing_id ? 'exists' : 'pending',
            existing_id,
          });
        } catch (e: any) {
          newItems.push({
            id: Math.random().toString(36).slice(2),
            file,
            file_data: '',
            coordinates: parseCoordinates(file.name).raw,
            batch_no: defaultBatch,
            equipment_id: defaultEquipment,
            status: 'error',
            error_message: e.message || '文件读取失败',
          });
        }
      }

      setPreviewItems((prev) => [...prev, ...newItems]);
    },
    [defaultEquipment, defaultBatch, existingKeys]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeItem = (id: string) => {
    setPreviewItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemEquipment = (id: string, equipment_id: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, equipment_id } : item))
    );
  };

  const updateItemCoordinates = (id: string, coordinates: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, coordinates } : item))
    );
  };

  const updateItemBatch = (id: string, batch_no: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, batch_no } : item))
    );
  };

  const handleImport = async () => {
    const toImport = previewItems.filter((item) => item.status === 'pending');
    if (toImport.length === 0) {
      alert('没有可导入的新图像');
      return;
    }

    setIsImporting(true);
    try {
      const images: Omit<SourceImage, 'id' | 'import_time'>[] =
        await Promise.all(
          toImport.map(async (item) => {
            const image_hash = await computeImageHash(item.file);
            return {
              file_data: item.file_data,
              file_name: item.file.name,
              file_size: item.file.size,
              image_hash,
              coordinates: item.coordinates,
              batch_no: item.batch_no,
              equipment_id: item.equipment_id,
              imported_by: currentUser,
            };
          })
        );

      const result = await importImages(images);
      setImportResult(result);
      setPreviewItems((prev) =>
        prev.map((item) =>
          item.status === 'pending' ? { ...item, status: 'exists' as const } : item
        )
      );
    } catch (e: any) {
      alert('导入失败: ' + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const pendingCount = previewItems.filter((i) => i.status === 'pending').length;
  const existsCount = previewItems.filter((i) => i.status === 'exists').length;
  const errorCount = previewItems.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-serif">导入图像</h2>
          <p className="text-sm text-gray-500">
            支持 JPG、PNG、TIFF 格式。系统自动检测重复，避免同一底图+坐标重复导入
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              默认关联设备 *
            </label>
            <select
              value={defaultEquipment}
              onChange={(e) => setDefaultEquipment(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择设备</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.model})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              默认批次号
            </label>
            <input
              type="text"
              value={defaultBatch}
              onChange={(e) => setDefaultBatch(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-700">拖拽图像到此处或点击选择</p>
          <p className="text-sm text-gray-500 mt-1">
            文件名中可包含坐标信息（如 image_123.45_678.90.jpg 会自动识别）
          </p>
        </div>
      </div>

      {previewItems.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                共 {previewItems.length} 个文件
              </span>
              <span className="text-sm text-blue-600">
                待导入: {pendingCount}
              </span>
              <span className="text-sm text-amber-600">
                已存在: {existsCount}
              </span>
              {errorCount > 0 && (
                <span className="text-sm text-red-600">错误: {errorCount}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewItems([])}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isImporting}
              >
                清空全部
              </button>
              <button
                onClick={handleImport}
                disabled={pendingCount === 0 || isImporting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                导入 ({pendingCount})
              </button>
            </div>
          </div>

          {importResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">导入完成</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                成功导入 {importResult.success} 张图像，跳过 {importResult.skipped} 张已存在的
              </p>
            </div>
          )}

          <div className="space-y-3">
            {previewItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${
                  item.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : item.status === 'exists'
                    ? 'border-amber-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="w-24 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
                  {item.file_data ? (
                    <img
                      src={item.file_data}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 truncate">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'pending' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          待导入
                        </span>
                      )}
                      {item.status === 'exists' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          已存在
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          错误
                        </span>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {item.error_message && (
                    <p className="text-sm text-red-600 mt-2">{item.error_message}</p>
                  )}

                  {item.status !== 'error' && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          坐标
                        </label>
                        <input
                          type="text"
                          value={item.coordinates}
                          onChange={(e) =>
                            updateItemCoordinates(item.id, e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          批次号
                        </label>
                        <input
                          type="text"
                          value={item.batch_no}
                          onChange={(e) => updateItemBatch(item.id, e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          设备
                        </label>
                        <select
                          value={item.equipment_id}
                          onChange={(e) =>
                            updateItemEquipment(item.id, e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        >
                          {equipment.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              {eq.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
