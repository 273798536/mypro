import { useState } from 'react';
import { Header } from '@/components/common/Header';
import { useSampleStore } from '@/store/useSampleStore';
import { useTrackStore } from '@/store/useTrackStore';
import { useLicenseStore } from '@/store/useLicenseStore';
import { GitCompare, ArrowRight, Music, Disc, FileCheck, Plus, Minus, Edit3 } from 'lucide-react';

export const Compare = () => {
  const { samples } = useSampleStore();
  const { tracks } = useTrackStore();
  const { licenses } = useLicenseStore();
  
  const [objectType, setObjectType] = useState<'sample' | 'track' | 'license'>('sample');
  const [selectedId1, setSelectedId1] = useState('');
  const [selectedId2, setSelectedId2] = useState('');
  const [comparison, setComparison] = useState<any>(null);

  const getObjects = () => {
    if (objectType === 'sample') return samples;
    if (objectType === 'track') return tracks;
    return licenses;
  };

  const compareObjects = () => {
    const objects = getObjects();
    const obj1 = objects.find((o) => o.id === selectedId1);
    const obj2 = objects.find((o) => o.id === selectedId2);

    if (!obj1 || !obj2) return;

    const diffs: any[] = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    allKeys.forEach((key) => {
      if (key === 'versions' || key === 'manualEdits') return;

      const val1 = (obj1 as any)[key];
      const val2 = (obj2 as any)[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        let type = 'modified';
        if (val1 === undefined) type = 'added';
        if (val2 === undefined) type = 'removed';

        diffs.push({
          field: key,
          value1: val1,
          value2: val2,
          type,
        });
      }
    });

    setComparison({ obj1, obj2, diffs });
  };

  const getDiffIcon = (type: string) => {
    if (type === 'added') return <Plus className="w-4 h-4 text-success" />;
    if (type === 'removed') return <Minus className="w-4 h-4 text-danger" />;
    return <Edit3 className="w-4 h-4 text-warning" />;
  };

  const getDiffColor = (type: string) => {
    if (type === 'added') return 'bg-success/10 border-success/30';
    if (type === 'removed') return 'bg-danger/10 border-danger/30';
    return 'bg-warning/10 border-warning/30';
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="版本对比" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">对比设置</h3>
            
            <div className="flex gap-4 mb-6">
              {(['sample', 'track', 'license'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setObjectType(type); setSelectedId1(''); setSelectedId2(''); setComparison(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    objectType === type
                      ? 'bg-accent/20 border-accent/50 text-accent'
                      : 'border-white/10 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {type === 'sample' ? <Music className="w-4 h-4" /> : type === 'track' ? <Disc className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
                  <span>{type === 'sample' ? '采样素材' : type === 'track' ? '曲目项目' : '授权报告'}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-4 items-end">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择对象 A
                </label>
                <select
                  value={selectedId1}
                  onChange={(e) => setSelectedId1(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50"
                >
                  <option value="">请选择...</option>
                  {getObjects().map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <GitCompare className="w-8 h-8 text-accent" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择对象 B
                </label>
                <select
                  value={selectedId2}
                  onChange={(e) => setSelectedId2(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50"
                >
                  <option value="">请选择...</option>
                  {getObjects().map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={compareObjects}
                disabled={!selectedId1 || !selectedId2}
                className="px-8 py-3 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                开始对比
              </button>
            </div>
          </div>

          {comparison && (
            <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-4 rounded-lg bg-primary/30 border border-accent/30">
                  <p className="text-xs text-gray-400 mb-1">对象 A</p>
                  <p className="text-lg font-semibold text-white">{comparison.obj1.name}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/30 border border-success/30">
                  <p className="text-xs text-gray-400 mb-1">对象 B</p>
                  <p className="text-lg font-semibold text-white">{comparison.obj2.name}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-4">差异对比</h3>
              
              {comparison.diffs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">两个对象完全相同，没有差异</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comparison.diffs.map((diff: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getDiffColor(diff.type)}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {getDiffIcon(diff.type)}
                        <span className="font-medium text-white">{diff.field}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {diff.type === 'added' ? '新增字段' : diff.type === 'removed' ? '删除字段' : '字段修改'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">对象 A</p>
                          <p className={`text-sm ${diff.type === 'removed' ? 'text-danger line-through' : 'text-white'}`}>
                            {diff.value1 !== undefined ? String(diff.value1) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">对象 B</p>
                          <p className={`text-sm ${diff.type === 'added' ? 'text-success' : diff.type === 'modified' ? 'text-warning' : 'text-white'}`}>
                            {diff.value2 !== undefined ? String(diff.value2) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {comparison.diffs.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h4 className="text-sm font-medium text-gray-400 mb-4">影响分析</h4>
                  <div className="p-4 rounded-lg bg-primary/30">
                    <p className="text-sm text-gray-300">
                      共发现 <span className="text-accent font-bold">{comparison.diffs.length}</span> 处差异，
                      其中 <span className="text-success">{comparison.diffs.filter((d: any) => d.type === 'added').length}</span> 处新增，
                      <span className="text-danger"> {comparison.diffs.filter((d: any) => d.type === 'removed').length}</span> 处删除，
                      <span className="text-warning"> {comparison.diffs.filter((d: any) => d.type === 'modified').length}</span> 处修改。
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      注意：修改可能影响关联的曲目项目和授权报告，请仔细核对
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
