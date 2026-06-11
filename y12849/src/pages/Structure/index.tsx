import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Dna,
  ChevronDown,
  Filter,
  Search,
  Info,
  Layers,
} from 'lucide-react';
import { useAppStore, selectCurrentBatch, selectSelectedSample, selectSelectedMutation, selectActions } from '../../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import Protein3DScene from '../../components/protein/Protein3DScene';
import MutationDetailPanel from '../../components/protein/MutationDetailPanel';
import { proteinAtoms, proteinInfo } from '../../data/proteinData';
import type { Mutation } from '../../types';
import { MUTATION_TYPE_LABELS, FUNCTIONAL_IMPACT_LABELS } from '../../types';

const mutationTypeFilters = ['all', 'missense', 'nonsense', 'synonymous', 'frameshift'] as const;

export default function Structure() {
  const batch = useAppStore(selectCurrentBatch);
  const selectedSample = useAppStore(selectSelectedSample);
  const selectedMutation = useAppStore(selectSelectedMutation);
  const { selectSample, selectMutation, updateSample, addReviewRecord } = useAppStore(selectActions);

  const [typeFilter, setTypeFilter] = useState<typeof mutationTypeFilters[number]>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const samplesWithMutations = useMemo(() => 
    batch.samples.filter(s => s.mutations.length > 0),
    [batch.samples]
  );

  const activeSample = selectedSample && selectedSample.mutations.length > 0 
    ? selectedSample 
    : samplesWithMutations[0];

  const allMutations = useMemo(() => {
    if (!activeSample) return [];
    return activeSample.mutations.filter(m => {
      const matchesType = typeFilter === 'all' || m.type === typeFilter;
      const matchesSearch = searchQuery === '' || 
        m.hgvsC.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.hgvsP.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.gene.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [activeSample, typeFilter, searchQuery]);

  const handleAnnotate = (mutationId: string, annotation: string) => {
    if (!activeSample) return;
    
    const updatedMutations = activeSample.mutations.map(m =>
      m.id === mutationId
        ? { ...m, annotation, annotatedBy: '张育种' }
        : m
    );
    
    updateSample(activeSample.id, { mutations: updatedMutations });
    
    addReviewRecord({
      id: `review-${Date.now()}`,
      type: 'mutation',
      targetId: mutationId,
      action: '添加标注',
      comment: annotation,
      reviewer: '张育种',
      timestamp: new Date(),
    });
  };

  const mutationStats = useMemo(() => {
    if (!activeSample) return { total: 0, byType: {} as Record<string, number>, byImpact: {} as Record<string, number> };
    return {
      total: activeSample.mutations.length,
      byType: activeSample.mutations.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byImpact: activeSample.mutations.reduce((acc, m) => {
        acc[m.functionalImpact] = (acc[m.functionalImpact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [activeSample]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <Dna className="w-7 h-7 text-blue-600" />
            蛋白质结构突变标注
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {proteinInfo.fullName} · {proteinInfo.organism}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">样本:</span>
            <select
              value={activeSample?.id || ''}
              onChange={(e) => selectSample(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-[2px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              {samplesWithMutations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.generation})
                </option>
              ))}
            </select>
          </div>
          <Badge variant="blue" size="md">
            {proteinInfo.length} 个氨基酸 · {proteinInfo.molecularWeight}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">总突变数</p>
                <p className="text-2xl font-bold font-mono text-gray-900">{mutationStats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-[2px] flex items-center justify-center">
                <Dna className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        {(['high', 'medium', 'low'] as const).map((impact, index) => (
          <Card key={impact}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    {impact === 'high' ? '高影响' : impact === 'medium' ? '中影响' : '低影响'}
                  </p>
                  <p className={`text-2xl font-bold font-mono ${impact === 'high' ? 'text-red-600' : impact === 'medium' ? 'text-yellow-600' : 'text-emerald-600'}`}>
                    {mutationStats.byImpact[impact] || 0}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-[2px] flex items-center justify-center ${impact === 'high' ? 'bg-red-100' : impact === 'medium' ? 'bg-yellow-100' : 'bg-emerald-100'}`}>
                  <Info className={`w-5 h-5 ${impact === 'high' ? 'text-red-600' : impact === 'medium' ? 'text-yellow-600' : 'text-emerald-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-7 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 min-h-0 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  3D结构视图
                </CardTitle>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#FF8C42]" />
                    错义突变
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                    无义突变
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                    同义突变
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                    移码突变
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              {activeSample && (
                <Protein3DScene
                  atoms={proteinAtoms}
                  mutations={allMutations}
                  selectedMutationId={selectedMutation?.id || null}
                  onMutationSelect={selectMutation}
                />
              )}
            </CardContent>
          </Card>

          <Card className="h-[280px] overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">突变列表</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索突变..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-[2px] w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    {mutationTypeFilters.map(type => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`px-2 py-1 text-[10px] rounded-[2px] transition-colors ${
                          typeFilter === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type === 'all' ? '全部' : MUTATION_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">基因</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">核苷酸变化</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">氨基酸变化</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">类型</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">影响</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">置信度</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">标注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allMutations.map((mutation) => (
                    <motion.tr
                      key={mutation.id}
                      whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                      onClick={() => selectMutation(selectedMutation?.id === mutation.id ? null : mutation.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedMutation?.id === mutation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-gray-900">{mutation.gene}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700">{mutation.hgvsC}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700">{mutation.hgvsP}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={mutation.type === 'nonsense' ? 'danger' : mutation.type === 'missense' ? 'warning' : 'success'}
                          size="sm"
                        >
                          {MUTATION_TYPE_LABELS[mutation.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={mutation.functionalImpact === 'high' ? 'danger' : mutation.functionalImpact === 'medium' ? 'warning' : 'success'}
                          size="sm"
                        >
                          {FUNCTIONAL_IMPACT_LABELS[mutation.functionalImpact]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-xs text-gray-700">
                          {(mutation.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mutation.annotation ? (
                          <span className="text-emerald-600 text-xs font-medium">已标注</span>
                        ) : (
                          <span className="text-gray-400 text-xs">未标注</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5 min-h-0">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">突变详情</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)] overflow-y-auto">
              <MutationDetailPanel
                mutation={selectedMutation}
                onClose={() => selectMutation(null)}
                onAnnotate={handleAnnotate}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            蛋白质信息
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">基因名称</p>
              <p className="font-medium text-gray-900">{proteinInfo.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">物种</p>
              <p className="font-medium text-gray-900">普通小麦</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">功能</p>
              <p className="font-medium text-gray-900">{proteinInfo.function}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">分子量</p>
              <p className="font-mono font-medium text-gray-900">{proteinInfo.molecularWeight}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">理论pI</p>
              <p className="font-mono font-medium text-gray-900">{proteinInfo.theoreticalPI}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">结构来源</p>
              <p className="font-medium text-gray-900">同源建模 (模板: {proteinInfo.template})</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
