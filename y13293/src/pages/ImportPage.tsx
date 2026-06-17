import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Th, Tr, Td } from '@/components/ui/Table';
import { parseCsv, detectDirtyFields, type CsvRow } from '@/utils/csv';
import type { GisPoint } from '@/types';
import { Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface PreviewRow {
  name: string;
  address: string;
  lng: number | null;
  lat: number | null;
  source: string;
  raw: CsvRow;
  dirty: string[];
}

export default function ImportPage() {
  const { importPoints } = useAppStore((s) => s.actions);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [sourceName, setSourceName] = useState('手动导入-' + new Date().toLocaleDateString('zh-CN'));
  const [imported, setImported] = useState(false);
  const [error, setError] = useState('');

  const dirtyCount = useMemo(
    () => previewRows.filter((r) => r.dirty.length > 0).length,
    [previewRows],
  );
  const validCount = useMemo(
    () => previewRows.filter((r) => r.name && r.lng && r.lat).length,
    [previewRows],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImported(false);
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        let rows: CsvRow[] = [];
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          rows = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          rows = parseCsv(text);
        }
        const preview: PreviewRow[] = rows.map((row) => {
          const name =
            row['name'] || row['名称'] || row['点位名称'] || row['原始名称'] || '';
          const address = row['address'] || row['地址'] || '';
          const lngStr = row['lng'] || row['经度'] || row['经纬度']?.split(',')[0] || '';
          const latStr = row['lat'] || row['纬度'] || row['经纬度']?.split(',')[1] || '';
          return {
            name: String(name),
            address: String(address),
            lng: lngStr ? parseFloat(String(lngStr)) : null,
            lat: latStr ? parseFloat(String(latStr)) : null,
            source: row['source'] || row['来源'] || '',
            raw: row,
            dirty: detectDirtyFields(row),
          };
        });
        setPreviewRows(preview);
      } catch (err: any) {
        setError('文件解析失败：' + (err?.message || '格式不正确'));
        setPreviewRows([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const valid = previewRows.filter((r) => r.name && r.lng && r.lat);
    const toImport = valid.map<Omit<GisPoint, 'id' | 'created_at' | 'updated_at'>>((r) => ({
      name: r.name,
      address: r.address,
      lng: r.lng!,
      lat: r.lat!,
      status: 'pending',
      source: r.source || sourceName,
      raw_data: r.raw,
      corrected_fields: [],
    }));
    importPoints(toImport);
    setImported(true);
  };

  const loadSample = () => {
    const sample: PreviewRow[] = [
      {
        name: '新华公园东门慢行桥',
        address: '新华大道102号',
        lng: 104.075,
        lat: 30.665,
        source: '示例数据',
        raw: { name: '新华公园东门桥', address: '新华大道102号', 经纬度: '104.075,30.665' },
        dirty: [],
      },
      {
        name: '',
        address: '人民中路',
        lng: 104.068,
        lat: 30.67,
        source: '示例数据',
        raw: { name: '', address: '人民中路', 经度: '104.068', 纬度: '30.67' },
        dirty: ['name: 空值'],
      },
      {
        name: '建设路坡道',
        address: '',
        lng: null,
        lat: null,
        source: '示例数据',
        raw: { name: '建设路坡道', address: '' },
        dirty: ['address: 空值', '经度缺失', '纬度缺失'],
      },
    ];
    setFileName('示例数据.csv');
    setPreviewRows(sample);
    setImported(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-slate-800">数据导入</h2>
        <p className="text-sm text-slate-500 mt-1">
          支持 CSV / JSON 格式导入。原始数据将完整保留，修正字段通过版本历史记录。
        </p>
      </div>

      {imported ? (
        <Card className="text-center py-16">
          <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />
          <p className="text-lg font-serif font-semibold text-slate-800 mb-2">导入成功</p>
          <p className="text-sm text-slate-500 mb-6">
            共导入 {validCount} 条有效点位数据，原始数据已完整存档
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => {
              setPreviewRows([]);
              setFileName('');
              setImported(false);
            }}>
              继续导入
            </Button>
            <Button onClick={() => navigate('/points')}>查看点位列表</Button>
          </div>
        </Card>
      ) : (
        <>
          <Card title="上传文件">
            <div
              className="border-2 border-dashed border-slate-300 rounded-sm p-12 text-center hover:border-slate-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFile}
              />
              <Upload size={36} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-700 font-medium mb-1">
                {fileName || '点击或拖拽文件到此区域上传'}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                支持 .csv 和 .json 格式 · 字段自动识别
              </p>
              <div className="flex justify-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <FileSpreadsheet size={12} /> CSV
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileJson size={12} /> JSON
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <div>
                <label className="inline-block text-slate-600 mr-2">数据来源标签：</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
              <button
                onClick={loadSample}
                className="text-slate-500 hover:text-slate-700 underline text-xs"
              >
                加载示例数据预览
              </button>
            </div>
          </Card>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {previewRows.length > 0 && (
            <>
              <Card
                title={`数据预览（${previewRows.length} 条）`}
                subtitle={
                  dirtyCount > 0
                    ? `检测到 ${dirtyCount} 条含空值或异常字段的数据，原始数据将完整保留不做清洗`
                    : '所有字段检测正常'
                }
                action={
                  <div className="flex items-center gap-3">
                    {dirtyCount > 0 && (
                      <span className="text-xs text-amber-700 flex items-center gap-1">
                        <AlertTriangle size={12} /> {dirtyCount} 条异常
                      </span>
                    )}
                    <span className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {validCount} 条可导入
                    </span>
                    <Button size="sm" onClick={handleImport} disabled={validCount === 0}>
                      确认导入
                    </Button>
                  </div>
                }
              >
                <Table>
                  <Thead>
                    <Th>状态</Th>
                    <Th>点位名称</Th>
                    <Th>地址</Th>
                    <Th>经度</Th>
                    <Th>纬度</Th>
                    <Th>来源</Th>
                    <Th>脏数据标记</Th>
                  </Thead>
                  <tbody>
                    {previewRows.map((row, idx) => {
                      const isValid = row.name && row.lng && row.lat;
                      return (
                        <Tr key={idx}>
                          <Td>
                            {isValid ? (
                              <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                                <CheckCircle2 size={12} /> 可导入
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 text-xs">
                                <AlertTriangle size={12} /> 跳过
                              </span>
                            )}
                          </Td>
                          <Td>
                            <span className={!row.name ? 'text-red-600 line-through' : 'text-slate-800'}>
                              {row.name || '(空)'}
                            </span>
                          </Td>
                          <Td className={!row.address ? 'text-red-600' : 'text-slate-600'}>
                            {row.address || '-'}
                          </Td>
                          <Td className="font-mono text-xs">
                            {row.lng?.toFixed(4) || <span className="text-red-600">-</span>}
                          </Td>
                          <Td className="font-mono text-xs">
                            {row.lat?.toFixed(4) || <span className="text-red-600">-</span>}
                          </Td>
                          <Td className="text-slate-500 text-xs">{row.source || sourceName}</Td>
                          <Td>
                            {row.dirty.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.dirty.map((d) => (
                                  <span
                                    key={d}
                                    className="px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-sm"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card>

              <Card title="导入说明">
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <X size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>不做清洗：</strong>
                      空值、格式异常等脏数据不会被自动修正，原始 JSON 完整保存在点位的「原始数据」标签页中
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>修正留痕：</strong>
                      后续在点位详情中修正的字段，都会通过版本历史记录修正前后对比和操作人、时间
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>自动识别字段：</strong>
                      name/名称/点位名称、address/地址、lng/经度、lat/纬度 等字段名自动匹配
                    </span>
                  </li>
                </ul>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
