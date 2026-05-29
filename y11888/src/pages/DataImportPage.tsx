import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Play, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useAppStore, addAuditLog } from '@/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatNumber, formatPercent, cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface DataImportPageProps {
  onNext: () => void;
}

export default function DataImportPage({ onNext }: DataImportPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cleanLogs, setCleanLogs] = useState<string[]>([]);
  
  const { rawData, cleanedData, loadSampleData, setRawData, setCleanedData } = useAppStore();
  
  const handleLoadSampleData = () => {
    loadSampleData();
    addAuditLog('data_import', '加载样例数据', null, { rows: 14 }, '');
    
    const logs: string[] = [];
    const state = useAppStore.getState();
    state.rawData.forEach((row, index) => {
      if (row.isDirty) {
        logs.push(`第 ${index + 1} 行（${row.date}）：${row.dirtyReason}，已跳过`);
      }
    });
    setCleanLogs(logs);
  };
  
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = e.target?.result;
      let parsedData: any[] = [];
      
      if (file.name.endsWith('.csv')) {
        const result = Papa.parse(data as string, { header: true });
        parsedData = result.data;
      } else {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        parsedData = XLSX.utils.sheet_to_json(sheet);
      }
      
      const transformedData = parsedData.map((row: any, index: number) => {
        const isDirty = !row['历史转化率'] || !row['日流量'];
        let dirtyReason = '';
        if (!row['历史转化率']) dirtyReason += '历史转化率为空；';
        if (!row['日流量']) dirtyReason += '日流量为空；';
        
        return {
          id: `row-${index}-${Date.now()}`,
          date: row['日期'] || row['date'] || `2024-01-${String(index + 1).padStart(2, '0')}`,
          historicalConversion: row['历史转化率'] ? Number(row['历史转化率']) : null,
          dailyTraffic: row['日流量'] ? Number(row['日流量']) : null,
          minimumLift: row['最小提升'] ? Number(row['最小提升']) : null,
          remarks: row['备注'] || row['remarks'] || '',
          isDirty,
          dirtyReason,
        };
      });
      
      setRawData(transformedData);
      setCleanedData(transformedData.filter(row => !row.isDirty));
      
      const logs = transformedData
        .map((row, index) => row.isDirty ? `第 ${index + 1} 行（${row.date}）：${row.dirtyReason}，已跳过` : null)
        .filter(Boolean) as string[];
      setCleanLogs(logs);
      
      addAuditLog('data_import', `导入文件 ${file.name}`, null, { rows: transformedData.length }, '');
    };
    
    reader.readAsBinaryString(file);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    }
  };
  
  const handleClearData = () => {
    setRawData([]);
    setCleanedData([]);
    setCleanLogs([]);
  };
  
  const dirtyCount = rawData.filter(r => r.isDirty).length;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="样例数据"
          subtitle="内置演示数据，含典型脏数据场景"
          headerAction={
            <Button
              size="sm"
              variant="outline"
              icon={<Play className="w-4 h-4" />}
              onClick={handleLoadSampleData}
            >
              加载样例
            </Button>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              包含14天历史数据，其中4行含空值或备注，用于演示数据清洗流程。
            </p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success-green" />
                <span>正常数据: 10行</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-warning-orange" />
                <span>脏数据: 4行</span>
              </div>
            </div>
          </div>
        </Card>
        
        <Card
          title="文件导入"
          subtitle="支持 Excel (.xlsx/.xls) 和 CSV 格式"
        >
          <div
            className={cn(
              'border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer',
              dragActive
                ? 'border-tech-cyan-500 bg-tech-cyan-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              点击或拖拽文件到此处
            </p>
            <p className="text-xs text-gray-500 mt-1">
              支持列名：日期、历史转化率、日流量、最小提升、备注
            </p>
          </div>
        </Card>
      </div>
      
      {rawData.length > 0 && (
        <Card
          title="数据预览与清洗"
          subtitle={`共 ${rawData.length} 行，其中 ${cleanedData.length} 行有效，${dirtyCount} 行已跳过`}
          headerAction={
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleClearData}
            >
              清空
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">日期</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">历史转化率</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">日流量</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">最小提升</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">备注</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {rawData.slice(0, 8).map((row) => (
                  <tr key={row.id} className={cn(
                    'border-b border-gray-100',
                    row.isDirty && 'bg-orange-50'
                  )}>
                    <td className="py-2 px-3 font-mono text-xs">{row.date}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">
                      {row.historicalConversion !== null
                        ? formatPercent(row.historicalConversion)
                        : <span className="text-error-red">空值</span>
                      }
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs">
                      {row.dailyTraffic !== null
                        ? formatNumber(row.dailyTraffic, 0)
                        : <span className="text-error-red">空值</span>
                      }
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs">
                      {row.minimumLift !== null
                        ? formatPercent(row.minimumLift)
                        : '-'
                      }
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500 max-w-[150px] truncate">
                      {row.remarks}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {row.isDirty ? (
                        <StatusBadge status="review" text="已跳过" size="sm" />
                      ) : (
                        <StatusBadge status="pass" text="有效" size="sm" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rawData.length > 8 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                还有 {rawData.length - 8} 行数据...
              </p>
            )}
          </div>
          
          {cleanLogs.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-md border border-orange-200">
              <p className="text-sm font-medium text-orange-800 mb-2">清洗日志：</p>
              <ul className="space-y-1">
                {cleanLogs.slice(0, 5).map((log, index) => (
                  <li key={index} className="text-xs text-orange-700 flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {log}
                  </li>
                ))}
                {cleanLogs.length > 5 && (
                  <li className="text-xs text-orange-600">
                    还有 {cleanLogs.length - 5} 条日志...
                  </li>
                )}
              </ul>
            </div>
          )}
        </Card>
      )}
      
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={cleanedData.length === 0}
          icon={<FileSpreadsheet className="w-4 h-4" />}
        >
          下一步：样本量计算
        </Button>
      </div>
    </div>
  );
}
