import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  X,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { useStore } from '@/store';
import { parseFile, TARGET_FIELDS } from '@/utils/fileParser';
import { generateId } from '@/utils/helpers';
import type { ImportPreview, FieldMapping, Song } from '@/types';

const FIELD_OPTIONS: { value: FieldMapping['targetField']; label: string }[] = [
  { value: null, label: '忽略' },
  ...TARGET_FIELDS,
];

function isProblemCell(
  value: string,
  mapping: FieldMapping
): boolean {
  if (mapping.targetField === null) return false;
  if (!value.trim()) return true;
  if (mapping.targetField === 'year' && isNaN(Number(value))) return true;
  return false;
}

const STEP_LABELS = ['上传文件', '字段映射', '数据预览'];

export default function ImportPage() {
  const navigate = useNavigate();
  const createPlaylist = useStore((s) => s.createPlaylist);

  const [step, setStep] = useState(1);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [previews, setPreviews] = useState<ImportPreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const validFiles = fileArr.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['csv', 'xlsx', 'xls'].includes(ext || '');
    });

    if (validFiles.length === 0) {
      setError('请选择 CSV 或 Excel 文件');
      return;
    }

    setError('');

    try {
      const results = await Promise.all(validFiles.map((f) => parseFile(f)));
      setPreviews(results);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件解析失败');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const updateMapping = (
    fileIndex: number,
    sourceField: string,
    targetField: FieldMapping['targetField']
  ) => {
    setPreviews((prev) =>
      prev.map((p, i) => {
        if (i !== fileIndex) return p;
        return {
          ...p,
          mappings: p.mappings.map((m) =>
            m.sourceField === sourceField ? { ...m, targetField } : m
          ),
        };
      })
    );
  };

  const removeFile = (fileIndex: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== fileIndex));
  };

  const handleImport = () => {
    if (!playlistName.trim()) return;
    setImporting(true);

    const batchId = generateId();
    const allSongs: Song[] = [];

    previews.forEach((preview) => {
      preview.rows.forEach((row, idx) => {
        const getValue = (target: FieldMapping['targetField']) => {
          const m = preview.mappings.find((fm) => fm.targetField === target);
          return m ? (row[m.sourceField] || '').trim() : '';
        };

        allSongs.push({
          id: generateId(),
          title: getValue('title') || '未知歌曲',
          artist: getValue('artist') || '未知歌手',
          year: parseInt(getValue('year')) || 0,
          genre: getValue('genre') || '',
          language: getValue('language') || '',
          region: getValue('region') || '',
          tags: getValue('tags')
            ? getValue('tags')
                .split(/[,，、;；]/)
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          source: {
            filename: preview.filename,
            rowNumber: idx + 2,
            importBatchId: batchId,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    });

    const playlist = createPlaylist(
      playlistName.trim(),
      playlistDesc.trim(),
      allSongs
    );
    navigate(`/playlist/${playlist.id}`);
  };

  return (
    <PageContainer title="导入歌单">
      <div className="mb-6 flex items-center gap-4">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={num} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${isDone ? 'bg-forest' : 'bg-pale'}`}
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isActive
                    ? 'bg-navy text-cream'
                    : isDone
                      ? 'bg-forest text-cream'
                      : 'bg-pale text-muted'
                }`}
              >
                {isDone ? <CheckCircle className="h-4 w-4" /> : num}
              </div>
              <span
                className={`text-sm ${isActive ? 'font-medium text-charcoal' : 'text-muted'}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">
            歌单名称
          </label>
          <input
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="输入歌单名称"
            className="w-full rounded border border-pale bg-white px-3 py-2 text-charcoal placeholder:text-muted"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">
            歌单描述
          </label>
          <input
            value={playlistDesc}
            onChange={(e) => setPlaylistDesc(e.target.value)}
            placeholder="输入歌单描述（可选）"
            className="w-full rounded border border-pale bg-white px-3 py-2 text-charcoal placeholder:text-muted"
          />
        </div>
      </div>

      {step === 1 && (
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragActive
                ? 'border-navy bg-navy/5'
                : 'border-pale bg-white hover:border-navy/50'
            }`}
          >
            <Upload
              className={`mb-3 h-10 w-10 ${dragActive ? 'text-navy' : 'text-muted'}`}
            />
            <p className="mb-1 text-sm font-medium text-charcoal">
              拖拽文件到此处，或点击选择文件
            </p>
            <p className="text-xs text-muted">支持 CSV、Excel（.xlsx / .xls）文件</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {error && (
            <p className="mt-2 text-sm text-alert">{error}</p>
          )}

          {previews.length > 0 && (
            <div className="mt-4 space-y-2">
              {previews.map((preview, idx) => (
                <div
                  key={preview.filename}
                  className="flex items-center justify-between rounded border border-pale bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-forest" />
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        {preview.filename}
                      </p>
                      <p className="text-xs text-muted">
                        {preview.rows.length} 行数据
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(idx)}>
                    <X className="h-4 w-4 text-muted hover:text-alert" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {previews.map((preview, fileIdx) => (
            <div
              key={preview.filename}
              className="rounded-lg border border-pale bg-white p-5"
            >
              <h3 className="mb-4 text-sm font-semibold text-charcoal">
                {preview.filename}
              </h3>
              <div className="space-y-3">
                {preview.mappings.map((mapping) => (
                  <div
                    key={mapping.sourceField}
                    className="grid grid-cols-2 items-center gap-4"
                  >
                    <div className="rounded bg-pale/50 px-3 py-2 text-sm text-charcoal">
                      {mapping.sourceField}
                    </div>
                    <select
                      value={mapping.targetField ?? ''}
                      onChange={(e) =>
                        updateMapping(
                          fileIdx,
                          mapping.sourceField,
                          (e.target.value || null) as FieldMapping['targetField']
                        )
                      }
                      className="rounded border border-pale bg-white px-3 py-2 text-sm text-charcoal"
                    >
                      {FIELD_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value ?? ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          {previews.map((preview) => {
            const previewRows = preview.rows.slice(0, 10);
            return (
              <div
                key={preview.filename}
                className="rounded-lg border border-pale bg-white p-5"
              >
                <h3 className="mb-4 text-sm font-semibold text-charcoal">
                  {preview.filename}（前 {previewRows.length} 行）
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-pale">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted">
                          #
                        </th>
                        {preview.headers.map((header) => (
                          <th
                            key={header}
                            className="px-3 py-2 text-left text-xs font-medium text-muted"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b border-pale/50"
                        >
                          <td className="px-3 py-2 text-muted">
                            {rowIdx + 1}
                          </td>
                          {preview.headers.map((header) => {
                            const mapping = preview.mappings.find(
                              (m) => m.sourceField === header
                            );
                            const value = row[header] || '';
                            const problematic =
                              mapping && isProblemCell(value, mapping);
                            return (
                              <td
                                key={header}
                                className={`px-3 py-2 ${problematic ? 'bg-amber/20' : ''}`}
                              >
                                {value || (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-pale pt-4">
        <div>
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 rounded px-4 py-2 text-sm text-muted hover:text-charcoal"
            >
              <ArrowLeft className="h-4 w-4" />
              上一步
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step < 3 && previews.length > 0 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-cream hover:bg-navy/90"
            >
              下一步
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleImport}
              disabled={!playlistName.trim() || importing}
              className="inline-flex items-center gap-1 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest/90 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {importing ? '导入中...' : '确认导入'}
            </button>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
