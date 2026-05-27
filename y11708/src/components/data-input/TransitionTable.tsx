import React, { useState } from 'react';
import { Plus, Trash2, Upload, Download, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import type { TransitionRecord, UserState } from '../../types';
import { generateId, formatNumber } from '../../utils/cn';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

interface TransitionTableProps {
  transitions: TransitionRecord[];
  states: UserState[];
  onAdd: (record: TransitionRecord) => void;
  onUpdate: (id: string, updates: Partial<TransitionRecord>) => void;
  onRemove: (id: string) => void;
  onBulkImport: (records: TransitionRecord[]) => void;
}

export const TransitionTable: React.FC<TransitionTableProps> = ({
  transitions,
  states,
  onAdd,
  onUpdate,
  onRemove,
  onBulkImport
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<TransitionRecord>>({
    fromState: states[0]?.id || '',
    toState: states[0]?.id || '',
    count: 0,
    channel: '',
    campaignTag: '',
    period: new Date().toISOString().slice(0, 7)
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (newRecord.fromState && newRecord.toState && newRecord.count !== undefined && newRecord.period) {
      onAdd({
        id: generateId(),
        fromState: newRecord.fromState,
        toState: newRecord.toState,
        count: newRecord.count,
        channel: newRecord.channel || undefined,
        campaignTag: newRecord.campaignTag || undefined,
        period: newRecord.period,
        source: '手动输入'
      });
      setNewRecord({
        fromState: states[0]?.id || '',
        toState: states[0]?.id || '',
        count: 0,
        channel: '',
        campaignTag: '',
        period: new Date().toISOString().slice(0, 7)
      });
      setIsAdding(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const records: TransitionRecord[] = results.data
          .filter((row: any) => row.fromState && row.toState && row.count)
          .map((row: any, index: number) => ({
            id: generateId(),
            fromState: row.fromState,
            toState: row.toState,
            count: parseInt(row.count) || 0,
            channel: row.channel || undefined,
            campaignTag: row.campaignTag || undefined,
            period: row.period || new Date().toISOString().slice(0, 7),
            source: `文件导入: ${file.name}`
          }));
        
        if (records.length > 0) {
          onBulkImport(records);
        }
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = ['fromState', 'toState', 'count', 'channel', 'campaignTag', 'period'];
    const sampleData = states.flatMap(fromState =>
      states.map(toState => ({
        fromState: fromState.id,
        toState: toState.id,
        count: Math.floor(Math.random() * 100),
        channel: '渠道A',
        campaignTag: '活动1',
        period: new Date().toISOString().slice(0, 7)
      }))
    ).slice(0, 5);

    const csv = Papa.unparse([headers, ...sampleData.map(d => Object.values(d))]);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '转移数据模板.csv';
    link.click();
  };

  const totalCount = transitions.reduce((sum, t) => sum + t.count, 0);

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <Card.Title>状态转移数据</Card.Title>
            <Card.Description>
              共 {transitions.length} 条记录，总样本量 {formatNumber(totalCount)}
            </Card.Description>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              模板
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">起始状态</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">目标状态</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">用户数</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">渠道</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">活动标签</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">月份</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isAdding && (
                <tr className="bg-blue-50">
                  <td className="px-4 py-3">
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      value={newRecord.fromState}
                      onChange={(e) => setNewRecord({ ...newRecord, fromState: e.target.value })}
                    >
                      {states.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      value={newRecord.toState}
                      onChange={(e) => setNewRecord({ ...newRecord, toState: e.target.value })}
                    >
                      {states.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      value={newRecord.count || ''}
                      onChange={(e) => setNewRecord({ ...newRecord, count: parseInt(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="可选"
                      value={newRecord.channel}
                      onChange={(e) => setNewRecord({ ...newRecord, channel: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="可选"
                      value={newRecord.campaignTag}
                      onChange={(e) => setNewRecord({ ...newRecord, campaignTag: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="month"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      value={newRecord.period}
                      onChange={(e) => setNewRecord({ ...newRecord, period: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="primary" onClick={handleAdd}>
                        确认
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                        取消
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
              {transitions.map((record) => {
                const fromState = states.find(s => s.id === record.fromState);
                const toState = states.find(s => s.id === record.toState);
                
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded text-sm font-medium"
                        style={{ backgroundColor: `${fromState?.color}20`, color: fromState?.color }}
                      >
                        {fromState?.name || record.fromState}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded text-sm font-medium"
                        style={{ backgroundColor: `${toState?.color}20`, color: toState?.color }}
                      >
                        {toState?.name || record.toState}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNumber(record.count)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.channel || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.campaignTag || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.period}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => onRemove(record.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {transitions.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无转移数据</p>
                    <p className="text-sm mt-1">点击"添加"手动输入或"导入"上传CSV文件</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card.Content>
    </Card>
  );
};
