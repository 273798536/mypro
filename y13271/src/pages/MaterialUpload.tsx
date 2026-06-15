import { useState, useRef } from 'react';
import { useBusBayStore } from '@/store';
import type { BadDataFlag, ResidentFeedback } from '@/types';
import { detectBadData } from '@/utils/badDataDetector';
import { detectDuplicates } from '@/utils/duplicateDetector';
import {
  CloudUpload, Plus, X, CheckCircle2, AlertTriangle,
  Copy, FileText, User, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabKey = 'feedback' | 'supplement';

interface PreviewRow {
  name: string; phone: string; content: string; bayName: string;
  isBad: boolean; isDuplicate: boolean; badFlags: BadDataFlag[];
  original: Record<string, string>;
}

const BAD_FLAG_LABELS: Record<BadDataFlag, string> = {
  missing_name: '姓名缺失', invalid_name: '姓名格式错误', missing_phone: '电话缺失',
  invalid_phone: '电话格式错误', missing_content: '内容缺失', short_content: '内容过短',
  no_matching_bay: '未匹配站点', duplicate_content: '内容重复',
};
const BAY_STATUSES = [
  { value: 'normal', label: '正常' }, { value: 'abnormal', label: '异常' }, { value: 'pending', label: '待复核' },
];
const MOCK_NAMES = ['张伟', '王芳', '李娜', '刘强', '陈静', '杨勇', '赵敏', '黄磊', '周婷', '吴刚'];
const MOCK_CONTENTS = [
  '早高峰容量不足，建议扩容至20辆以上。', '晚高峰候车拥挤，站台需拓宽。',
  '雨天积水，建议改造排水。', '站点位置偏远，建议迁移50米。', '线路过多，建议分流。',
  '轮椅通道被占用，需加强管理。', '座椅太少，老年人不便。', '夜间照明不足，安全隐患。',
  '站牌信息模糊，需更新。', '垃圾桶太少，异味严重。',
];
const MOCK_BAYS = ['陆家嘴环路丰和路站', '世纪大道地铁站', '张江路张江高科站', '祖冲之路金科路站'];

function genPreview(): PreviewRow[] {
  return Array.from({ length: 10 }, (_, i) => {
    const isBad = i === 2 || i === 6, isDup = i === 4 || i === 9;
    const name = isBad && i === 2 ? '' : MOCK_NAMES[i];
    const phone = isBad && i === 6 ? '123' : `138${String(10000000 + i * 111).slice(0, 8)}`;
    const content = isBad && i === 2 ? '' : MOCK_CONTENTS[i];
    const badFlags: BadDataFlag[] = [];
    if (isBad && i === 2) badFlags.push('missing_name', 'missing_content');
    if (isBad && i === 6) badFlags.push('invalid_phone');
    if (isDup) badFlags.push('duplicate_content');
    return { name, phone, content, bayName: MOCK_BAYS[i % 4], isBad, isDuplicate: isDup, badFlags,
      original: { 序号: String(i+1), 姓名: name, 联系电话: phone, 反馈内容: content, 涉及站点: MOCK_BAYS[i%4] } };
  });
}

export default function MaterialUpload() {
  const [activeTab, setActiveTab] = useState<TabKey>('feedback');
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bays = useBusBayStore(s => s.bays);
  const importBatches = useBusBayStore(s => s.importBatches);
  const feedbacks = useBusBayStore(s => s.feedbacks);
  const addBatch = useBusBayStore(s => s.addFeedbackImportBatch);
  const supplement = useBusBayStore(s => s.supplementFieldData);

  const [selBay, setSelBay] = useState('');
  const [cap, setCap] = useState(''), [st, setSt] = useState('');
  const [lng, setLng] = useState(''), [lat, setLat] = useState('');
  const [atts, setAtts] = useState<string[]>([]);
  const [remark, setRemark] = useState('');
  const [ok, setOk] = useState(false);
  const bay = bays.find(b => b.id === selBay);
  const bad = previewRows.filter(r => r.isBad).length;
  const dup = previewRows.filter(r => r.isDuplicate).length;

  const handleFile = (f: File) => { setFileName(f.name); setPreviewRows(genPreview()); };

  const doImport = () => {
    const temp: ResidentFeedback[] = previewRows.map((r, i) => {
      const m = bays.find(b => b.name === r.bayName);
      return { id: `fb_${Date.now()}_${i}`, bayId: m?.id ?? null, sourceRow: i+1, sourceFile: fileName,
        residentName: r.name, phone: r.phone, content: r.content, reportedAt: new Date().toISOString(),
        isDuplicate: r.isDuplicate, badDataFlags: r.badFlags, rawData: r.original, importBatchId: '', createdAt: new Date().toISOString() };
    });
    const withBad = temp.map(fb => ({ ...fb, badDataFlags: detectBadData(fb, bays) as BadDataFlag[] }));
    detectDuplicates([...feedbacks, ...withBad]);
    addBatch(previewRows.map(r => r.original), fileName, '张工');
    alert(`导入成功！共 ${previewRows.length} 条，坏数据 ${bad} 条，重复 ${dup} 条`);
    setPreviewRows([]); setFileName('');
  };

  const doSubmit = () => {
    if (!selBay) return;
    const c: Record<string, number|string> = {};
    if (cap) c.currentCapacity = Number(cap);
    if (st) c.status = st;
    if (lng) c.lng = Number(lng);
    if (lat) c.lat = Number(lat);
    supplement(selBay, c, remark, atts, 'field');
    setOk(true);
    setTimeout(() => { setOk(false); setSelBay(''); setCap(''); setSt(''); setLng(''); setLat(''); setAtts([]); setRemark(''); }, 2000);
  };

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h2 className="page-title mb-1">材料上传区</h2>
        <p className="text-sm text-slate-500">导入居民反馈或现场补录站点字段信息</p>
      </div>

      <div className="flex border-b border-slate-200 bg-white rounded-t-md">
        {[{k:'feedback',l:'居民反馈导入'},{k:'supplement',l:'现场照片补录'}].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k as TabKey)}
            className={cn('px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab===t.k ? 'text-prussia-700 border-prussia-600' : 'text-slate-500 border-transparent hover:text-slate-700')}>
            {t.l}
          </button>
        ))}
      </div>

      {activeTab === 'feedback' && (
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-card">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="section-title mb-2 block">上传文件</label>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                className={cn('h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all',
                  isDragging ? 'border-prussia-500 bg-prussia-50' : 'border-slate-300 hover:border-prussia-400 hover:bg-slate-50')}>
                <CloudUpload className="w-12 h-12 text-slate-400 mb-3" />
                {fileName ? <div className="text-center"><p className="text-sm font-medium text-prussia-700">{fileName}</p><p className="text-xs text-slate-400 mt-1">点击或拖拽替换文件</p></div>
                  : <><p className="text-sm text-slate-600 font-medium">点击或拖拽文件到此处</p><p className="text-xs text-slate-400 mt-1">支持 .xlsx / .csv / .xls 格式</p></>}
                <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
              </div>
            </div>
            <div>
              <label className="section-title mb-2 block flex items-center gap-2"><FileText className="w-4 h-4" />数据预览
                {previewRows.length > 0 && <span className="text-xs text-slate-400 font-normal">仅展示前10行</span>}
              </label>
              <div className="h-64 border border-slate-200 rounded-lg overflow-auto">
                {previewRows.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">请先上传文件</div> : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0"><tr>
                      <th className="px-2 py-2 text-left font-medium text-slate-600">#</th>
                      <th className="px-2 py-2 text-left font-medium text-slate-600">姓名</th>
                      <th className="px-2 py-2 text-left font-medium text-slate-600">电话</th>
                      <th className="px-2 py-2 text-left font-medium text-slate-600">内容</th>
                      <th className="px-2 py-2 text-left font-medium text-slate-600">标记</th>
                    </tr></thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className={cn('border-t border-slate-100', r.isBad && 'bg-red-50', r.isDuplicate && !r.isBad && 'bg-amber-50')}>
                          <td className="px-2 py-2 text-slate-500">{i+1}</td>
                          <td className="px-2 py-2">{r.name || <span className="text-red-400">空</span>}</td>
                          <td className="px-2 py-2 font-mono">{r.phone}</td>
                          <td className="px-2 py-2 max-w-[120px] truncate" title={r.content}>{r.content || <span className="text-red-400">空</span>}</td>
                          <td className="px-2 py-2"><div className="flex gap-1 flex-wrap">
                            {r.isBad && <span className="tag bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" />坏数据</span>}
                            {r.isDuplicate && <span className="tag bg-amber-100 text-amber-700"><Copy className="w-3 h-3" />重复</span>}
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          {previewRows.length > 0 && (
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-sm text-slate-600">解析完成：共<span className="font-mono font-bold text-prussia-700 mx-1">{previewRows.length}</span>条，坏数据<span className="font-mono font-bold text-red-600 mx-1">{bad}</span>条，重复<span className="font-mono font-bold text-amber-600 mx-1">{dup}</span>条</div>
              <button onClick={doImport} className="btn-primary">
                <CheckCircle2 className="w-4 h-4" />确认导入（共{previewRows.length}条，其中坏数据{bad}条、重复{dup}条）
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'supplement' && (
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-card">
          {ok && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-emerald-700 text-sm fade-in"><CheckCircle2 className="w-5 h-5" />补录提交成功！</div>}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="section-title mb-2 block">选择站点</label>
              <select value={selBay} onChange={e => { setSelBay(e.target.value); const b = bays.find(x => x.id === e.target.value); if (b) { setCap(String(b.currentCapacity)); setSt(b.status); setLng(String(b.lng)); setLat(String(b.lat)); } }} className="select-field">
                <option value="">请选择站点...</option>
                {bays.map(b => <option key={b.id} value={b.id}>{b.name}（{b.district}）</option>)}
              </select>
              {bay && <div className="mt-4 p-3 bg-prussia-50 rounded-md space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">设计容量</span><span className="font-mono font-medium">{bay.designCapacity} 辆</span></div>
                <div className="flex justify-between"><span className="text-slate-500">当前状态</span>
                  <span>{bay.status==='normal'&&<span className="tag bg-emerald-100 text-emerald-700">正常</span>}
                    {bay.status==='abnormal'&&<span className="tag bg-red-100 text-red-700">异常</span>}
                    {bay.status==='pending'&&<span className="tag bg-amber-100 text-amber-700">待复核</span>}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">坐标</span><span className="font-mono">{bay.lng.toFixed(4)}, {bay.lat.toFixed(4)}</span></div>
              </div>}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-slate-600 mb-1 block">当前容量</label><input type="number" value={cap} onChange={e => setCap(e.target.value)} className="input-field" placeholder="辆" /></div>
                <div><label className="text-sm font-medium text-slate-600 mb-1 block">状态</label><select value={st} onChange={e => setSt(e.target.value)} className="select-field"><option value="">未修改</option>{BAY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                <div><label className="text-sm font-medium text-slate-600 mb-1 block">经度</label><input type="number" step="0.000001" value={lng} onChange={e => setLng(e.target.value)} className="input-field" /></div>
                <div><label className="text-sm font-medium text-slate-600 mb-1 block">纬度</label><input type="number" step="0.000001" value={lat} onChange={e => setLat(e.target.value)} className="input-field" /></div>
              </div>
            </div>
            <div>
              <label className="section-title mb-2 block flex items-center gap-2"><MapPin className="w-4 h-4" />现场照片（{atts.length}张）</label>
              <div className="grid grid-cols-3 gap-3">
                {atts.map((n, i) => <div key={i} className="aspect-[4/3] bg-slate-100 rounded-md border border-slate-200 relative overflow-hidden group">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">📷 {n.slice(0,12)}</div>
                  <button onClick={() => setAtts(p => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>)}
                <button onClick={() => setAtts(p => [...p, `现场照片_${Date.now().toString(36)}.jpg`])} className="aspect-[4/3] border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center text-slate-400 hover:border-prussia-400 hover:text-prussia-500 transition-colors"><Plus className="w-8 h-8 mb-1" /><span className="text-xs">添加照片</span></button>
              </div>
              <div className="mt-5"><label className="text-sm font-medium text-slate-600 mb-1 block">变更说明</label>
                <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={4} className="input-field resize-none" placeholder="请描述本次现场勘测的情况..." />
              </div>
              <button onClick={doSubmit} disabled={!selBay} className={cn('mt-5 w-full btn-primary', !selBay && 'opacity-50 cursor-not-allowed')}><User className="w-4 h-4" />提交补录</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-card">
        <h3 className="section-title mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-prussia-600" />导入批次记录</h3>
        <div className="overflow-auto"><table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="px-3 py-2 text-left font-medium text-slate-600">文件名</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">导入时间</th>
            <th className="px-3 py-2 text-center font-medium text-slate-600">总行数</th>
            <th className="px-3 py-2 text-center font-medium text-slate-600">有效</th>
            <th className="px-3 py-2 text-center font-medium text-slate-600">坏数据</th>
            <th className="px-3 py-2 text-center font-medium text-slate-600">重复</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">导入人</th>
          </tr></thead>
          <tbody>
            {importBatches.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">暂无导入记录</td></tr> :
              importBatches.map(b => <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-3 font-medium text-prussia-700">{b.fileName}</td>
                <td className="px-3 py-3 text-slate-500 text-xs font-mono">{new Date(b.importedAt).toLocaleString('zh-CN')}</td>
                <td className="px-3 py-3 text-center font-mono">{b.totalRows}</td>
                <td className="px-3 py-3 text-center"><span className="table-badge bg-emerald-100 text-emerald-700">{b.validRows}</span></td>
                <td className="px-3 py-3 text-center"><span className="table-badge bg-red-100 text-red-700">{b.badDataRows}</span></td>
                <td className="px-3 py-3 text-center"><span className="table-badge bg-amber-100 text-amber-700">{b.duplicateRows}</span></td>
                <td className="px-3 py-3 text-slate-600">{b.importedBy}</td>
              </tr>)}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
