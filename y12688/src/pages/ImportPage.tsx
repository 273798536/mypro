import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useData } from '../store/DataContext';
import { DataRecord, RecordType, RecordStatus } from '../types';
import { generateId, formatDateTime, recordSignature, parseFileName } from '../utils/helpers';
import { StatusBadge, TypeBadge } from '../components/Badges';

interface PreviewRow {
  lineNumber: number;
  data: Record<string, any>;
  predictedType: RecordType;
  predictedStatus: RecordStatus;
  conflictWith?: string;
  fileName: string;
  sourceRemark: string;
}

export default function ImportPage() {
  const navigate = useNavigate();
  const { records, batches, addBatch } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [imported, setImported] = useState(false);

  function detectType(data: Record<string, any>): RecordType {
    const keys = Object.keys(data).map(k => k.toLowerCase());
    if (keys.some(k => k.includes('buoy') || k.includes('浮标') || k.includes('wave') || k.includes('waveheight'))) return 'buoy';
    if (keys.some(k => k.includes('model') || k.includes('模型') || k.includes('vertex') || k.includes('camera'))) return 'model';
    if (keys.some(k => k.includes('device') || k.includes('设备') || k.includes('orientation') || k.includes('calibration'))) return 'coordinate';
    if (keys.some(k => k.includes('latitude') || k.includes('longitude') || k.includes('lat') || k.includes('lng'))) {
      if (keys.some(k => k.includes('device') || k.includes('altitude'))) return 'coordinate';
      return 'buoy';
    }
    return 'buoy';
  }

  function normalizeData(raw: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = k.trim();
      if (v == null || v === '') continue;
      if (typeof v === 'string') {
        const num = Number(v);
        if (!isNaN(num) && v.trim() !== '') out[key] = num;
        else out[key] = v.trim();
      } else {
        out[key] = v;
      }
    }
    return out;
  }

  async function parseFile(file: File): Promise<PreviewRow[]> {
    const { ext } = parseFileName(file.name);
    const rows: PreviewRow[] = [];

    if (ext === 'csv' || ext === 'txt') {
      return new Promise((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            (results.data as Record<string, any>[]).forEach((raw, idx) => {
              const data = normalizeData(raw);
              if (Object.keys(data).length === 0) return;
              rows.push({
                lineNumber: idx + 2,
                data,
                predictedType: detectType(data),
                predictedStatus: 'normal',
                fileName: file.name,
                sourceRemark: `CSV文件导入: ${file.name}`,
              });
            });
            resolve(rows);
          },
        });
      });
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const dataArr = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        dataArr.forEach((raw, idx) => {
          const data = normalizeData(raw);
          if (Object.keys(data).length === 0) return;
          rows.push({
            lineNumber: idx + 2,
            data,
            predictedType: detectType(data),
            predictedStatus: 'normal',
            fileName: `${file.name} > ${sheetName}`,
            sourceRemark: `Excel导入: ${file.name} / ${sheetName}`,
          });
        });
      }
      return rows;
    }

    if (['obj', 'fbx', 'gltf', 'glb', 'stl', '3ds'].includes(ext)) {
      return [{
        lineNumber: 1,
        data: {
          name: parseFileName(file.name).base,
          fileName: file.name,
          fileSize: file.size,
          modelId: `M-${Math.floor(Math.random() * 900) + 100}`,
          vertexCount: Math.floor(Math.random() * 50000) + 1000,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        predictedType: 'model',
        predictedStatus: 'normal',
        fileName: file.name,
        sourceRemark: `三维模型文件导入: ${file.name}`,
      }];
    }

    return [];
  }

  async function handleFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    setFiles(arr);
    if (!batchName) {
      const d = new Date();
      setBatchName(`导入批次_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
    }
    setParsing(true);
    const allRows: PreviewRow[] = [];
    for (const f of arr) {
      const parsed = await parseFile(f);
      allRows.push(...parsed);
    }

    const sigMap = new Map<string, DataRecord[]>();
    for (const r of records) {
      const sig = recordSignature(r);
      if (!sigMap.has(sig)) sigMap.set(sig, []);
      sigMap.get(sig)!.push(r);
    }

    const enriched: PreviewRow[] = allRows.map(row => {
      let status: RecordStatus = 'normal';
      let conflictWith: string | undefined;

      if (row.predictedType === 'model' && row.data.cameraAngle == null && !Object.keys(row.data).some(k => k.toLowerCase().includes('camera'))) {
        status = 'missing_camera';
      }

      const sig = recordSignature({ type: row.predictedType, data: row.data } as any);
      if (sigMap.has(sig)) {
        const existing = sigMap.get(sig)!;
        const sameData = existing.some(e => JSON.stringify(e.data) === JSON.stringify(row.data));
        status = sameData ? 'duplicate' : 'conflict';
        conflictWith = existing[0].fileName;
      }
      return { ...row, predictedStatus: status, conflictWith };
    });

    const groupSig = new Map<string, PreviewRow[]>();
    for (const r of enriched) {
      const sig = recordSignature({ type: r.predictedType, data: r.data } as any);
      if (!groupSig.has(sig)) groupSig.set(sig, []);
      groupSig.get(sig)!.push(r);
    }
    for (const [, group] of groupSig) {
      if (group.length > 1) {
        group.forEach((r, i) => {
          if (i > 0 && r.predictedStatus === 'normal') {
            r.predictedStatus = 'duplicate';
            r.conflictWith = group[0].fileName;
          }
        });
      }
    }

    setPreviewRows(enriched);
    setParsing(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  function confirmImport() {
    if (previewRows.length === 0) return;

    const now = new Date().toISOString();
    const newRecords: DataRecord[] = previewRows.map(row => ({
      id: generateId(),
      batchId: '',
      fileName: row.fileName,
      originalLine: row.lineNumber,
      sourceRemark: row.sourceRemark,
      type: row.predictedType,
      data: row.data,
      status: row.predictedStatus,
      createdAt: now,
      updatedAt: now,
    }));

    const batch = addBatch(
      batchName || `未命名批次_${Date.now()}`,
      files.map(f => f.name),
      newRecords,
    );
    newRecords.forEach(r => { r.batchId = batch.id; });

    setImported(true);
    setTimeout(() => {
      navigate('/filter');
    }, 1200);
  }

  function resetForm() {
    setFiles([]);
    setPreviewRows([]);
    setBatchName('');
    setImported(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  const stats = {
    total: previewRows.length,
    normal: previewRows.filter(r => r.predictedStatus === 'normal').length,
    duplicate: previewRows.filter(r => r.predictedStatus === 'duplicate').length,
    conflict: previewRows.filter(r => r.predictedStatus === 'conflict').length,
    missingCamera: previewRows.filter(r => r.predictedStatus === 'missing_camera').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">数据导入</h3>
          <p className="text-sm text-slate-500 mt-1">支持 Excel(.xlsx/.xls)、CSV、三维模型文件(.obj/.fbx/.gltf/.stl 等)。自动去重、检测冲突与相机视角丢失。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetForm} className="px-4 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 text-slate-700">
            清空重选
          </button>
          <button
            onClick={confirmImport}
            disabled={previewRows.length === 0 || imported || parsing}
            className="px-4 py-2 text-sm bg-tech-blue text-white rounded hover:bg-tech-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {imported ? '导入成功，跳转中...' : `确认导入 (${previewRows.length})`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <label className="text-sm font-medium text-slate-700 block mb-1.5">批次名称</label>
        <input
          type="text"
          value={batchName}
          onChange={e => setBatchName(e.target.value)}
          placeholder="为本次导入起个名字，方便后续追溯"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-tech-blue/40 focus:border-tech-blue"
        />

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all ${
            dragOver ? 'border-tech-blue bg-ocean-light' : 'border-slate-300 bg-slate-50 hover:border-tech-blue/60 hover:bg-ocean-light/40'
          }`}
        >
          <div className="text-4xl mb-2">📥</div>
          <div className="text-sm font-medium text-slate-700">拖拽文件到这里，或点击选择文件</div>
          <div className="text-xs text-slate-500 mt-1">支持 .xlsx .xls .csv .obj .fbx .gltf .glb .stl</div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".xlsx,.xls,.csv,.txt,.obj,.fbx,.gltf,.glb,.stl,.3ds"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
                📄 {f.name} <span className="text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {previewRows.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-semibold text-slate-700">导入预览与冲突检测</h4>
              <div className="flex gap-2 text-xs">
                <span className="text-slate-500">共 <b>{stats.total}</b> 条</span>
                <span className="text-green-600">正常 <b>{stats.normal}</b></span>
                <span className="text-yellow-600">重复 <b>{stats.duplicate}</b></span>
                <span className="text-red-600">冲突 <b>{stats.conflict}</b></span>
                <span className="text-purple-600">相机丢失 <b>{stats.missingCamera}</b></span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">行号</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">类型</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">状态</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">主要内容</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">来源文件</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className={row.predictedStatus !== 'normal' ? 'bg-yellow-50/30' : ''}>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{row.lineNumber}</td>
                    <td className="px-4 py-2.5"><TypeBadge type={row.predictedType} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={row.predictedStatus} /></td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-slate-800 font-medium">
                        {row.data.name || row.data.buoyId || row.data.modelId || row.data.deviceId || '(未命名)'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[340px]">
                        {Object.entries(row.data).slice(0, 3).map(([k, v]) => `${k}:${typeof v === 'object' ? '...' : v}`).join(' | ')}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 truncate max-w-[180px]">{row.fileName}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500 max-w-[220px]">
                      {row.conflictWith ? (
                        <span className="text-red-600">⚠ 与已有记录冲突: {row.conflictWith}</span>
                      ) : row.predictedStatus === 'missing_camera' ? (
                        <span className="text-purple-600">未检测到相机视角参数</span>
                      ) : (
                        row.sourceRemark
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {batches.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700">历史导入批次</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {batches.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="text-sm font-medium text-slate-800">{b.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {b.fileNames.join('、')} · {b.recordCount} 条记录
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{formatDateTime(b.importTime)}</span>
                  <button
                    onClick={() => navigate(`/filter?batchId=${b.id}`)}
                    className="text-xs text-tech-blue hover:underline"
                  >
                    查看该批次
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
