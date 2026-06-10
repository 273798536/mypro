import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  MapPin,
  FlaskConical,
  Download,
  Clock,
  User,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate, contaminationTypeLabels } from '@/utils/formatters';
import { exportToCSV, exportToJSON, downloadFile } from '@/utils/exportUtils';

interface MaterialSummary {
  name: string;
  sampleCount: number;
  contaminatedCount: number;
  warningCount: number;
  normalCount: number;
  samples: string[];
  contaminationTypes: string[];
}

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const { getBatchById, getSamplesByBatch } = useAuditStore();

  const batch = getBatchById(id || '');
  const samples = id ? getSamplesByBatch(id) : [];

  const materialSummaries = useMemo(() => {
    const map = new Map<string, MaterialSummary>();

    samples.forEach(s => {
      const matName = s.sourceMaterial;
      if (!map.has(matName)) {
        map.set(matName, {
          name: matName,
          sampleCount: 0,
          contaminatedCount: 0,
          warningCount: 0,
          normalCount: 0,
          samples: [],
          contaminationTypes: [],
        });
      }
      const summary = map.get(matName)!;
      summary.sampleCount++;
      summary.samples.push(s.name);

      if (s.status === 'contaminated') {
        summary.contaminatedCount++;
        if (s.contamination.detected) {
          const typeLabel = contaminationTypeLabels[s.contamination.type];
          if (!summary.contaminationTypes.includes(typeLabel)) {
            summary.contaminationTypes.push(typeLabel);
          }
        }
      } else if (s.status === 'warning') {
        summary.warningCount++;
      } else {
        summary.normalCount++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.contaminatedCount - a.contaminatedCount);
  }, [samples]);

  const contaminatedMaterials = materialSummaries.filter(m => m.contaminatedCount > 0);
  const warningMaterials = materialSummaries.filter(m => m.warningCount > 0 && m.contaminatedCount === 0);

  const handleExport = (format: 'csv' | 'json') => {
    if (!batch) return;
    const content =
      format === 'csv' ? exportToCSV(batch, samples) : exportToJSON(batch, samples);
    const filename = `${batch.name}-审计报告.${format}`;
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
    downloadFile(content, filename, mimeType);
  };

  if (!batch) {
    return (
      <div className="p-6">
        <p className="text-slate-400">批次不存在</p>
        <Link to="/" className="text-teal-400 hover:text-teal-300 text-sm">
          返回看板
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-teal-400" />
            <div>
              <h1 className="font-display text-2xl text-slate-100">审计报告</h1>
              <p className="text-sm text-slate-500">{batch.name}</p>
            </div>
          </div>
        </div>
        <div className="relative group">
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded text-sm text-white transition-colors">
            <Download className="w-4 h-4" />
            下载报告
          </button>
          <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 first:rounded-t last:rounded-b"
            >
              CSV 格式
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 first:rounded-t last:rounded-b"
            >
              JSON 格式
            </button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">报告日期</p>
            <p className="text-sm text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              {formatDate(batch.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">审核人</p>
            <p className="text-sm text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              张博士
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">总样本数</p>
            <p className="text-sm text-slate-200 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-slate-400" />
              {batch.sampleCount} 份
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">审核状态</p>
            <StatusBadge status={batch.status} size="sm" />
          </div>
        </div>
      </Card>

      <Card
        title="一、结论摘要"
        subtitle="快速了解本次审计的核心结论"
        className="mb-6"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-teal-900/20 border border-teal-800/50 rounded">
            <CheckCircle2 className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-teal-300 font-medium">质控通过率</p>
              <p className="text-2xl font-display text-teal-200 mt-1">
                {(((samples.filter(s => s.status === 'normal' || s.status === 'manually_confirmed').length) / samples.length) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-teal-400/70 mt-1">
                {samples.filter(s => s.status === 'normal' || s.status === 'manually_confirmed').length} / {samples.length} 份样本通过
              </p>
            </div>
          </div>

          {contaminatedMaterials.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800/50 rounded">
              <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-300 font-medium">发现污染样本</p>
                <p className="text-2xl font-display text-red-200 mt-1">
                  {samples.filter(s => s.status === 'contaminated').length} 份
                </p>
                <p className="text-xs text-red-400/70 mt-1">
                  涉及 {contaminatedMaterials.length} 份材料
                </p>
              </div>
            </div>
          )}

          {warningMaterials.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-800/50 rounded">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-300 font-medium">需关注样本</p>
                <p className="text-2xl font-display text-amber-200 mt-1">
                  {samples.filter(s => s.status === 'warning').length} 份
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  建议进一步复核确认
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card
        title="二、污染材料追溯"
        subtitle="污染样本卡在哪份材料上一目了然"
        className="mb-6"
      >
        {contaminatedMaterials.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
            <p className="text-sm text-teal-400">未发现污染材料</p>
            <p className="text-xs text-slate-500 mt-1">所有来源材料均通过检测</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contaminatedMaterials.map((material, idx) => (
              <div
                key={material.name}
                className="border border-red-800/40 bg-red-900/10 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-red-900/20 border-b border-red-800/30">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span className="font-medium text-red-200">{material.name}</span>
                  </div>
                  <span className="text-xs bg-red-700/50 text-red-200 px-2 py-0.5 rounded">
                    材料编号 #{idx + 1}（污染）
                  </span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">样本总数</p>
                      <p className="text-lg font-display text-slate-200">{material.sampleCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">污染样本</p>
                      <p className="text-lg font-display text-red-400">{material.contaminatedCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">污染率</p>
                      <p className="text-lg font-display text-red-400">
                        {((material.contaminatedCount / material.sampleCount) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-2">污染类型</p>
                    <div className="flex flex-wrap gap-2">
                      {material.contaminationTypes.map(type => (
                        <span
                          key={type}
                          className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">涉及样本</p>
                    <div className="flex flex-wrap gap-1.5">
                      {material.samples
                        .map(name => samples.find(s => s.name === name))
                        .filter(Boolean)
                        .map(s => (
                          <Link
                            key={s!.id}
                            to={`/sample/${s!.id}`}
                            className={`text-xs px-2 py-1 rounded font-mono transition-colors ${
                              s!.status === 'contaminated'
                                ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50'
                                : s!.status === 'warning'
                                ? 'bg-amber-900/50 text-amber-300 hover:bg-amber-800/50'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {s!.name}
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {warningMaterials.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <h4 className="text-sm font-medium text-amber-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              需关注材料（警告级）
            </h4>
            <div className="space-y-3">
              {warningMaterials.map(material => (
                <div
                  key={material.name}
                  className="flex items-center justify-between p-3 bg-amber-900/10 border border-amber-800/30 rounded"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-amber-200">{material.name}</span>
                  </div>
                  <span className="text-xs text-amber-400">
                    {material.warningCount} 份样本警告
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card
        title="三、物种同义名检测"
        subtitle="自动识别录入名称与标准名称不一致的样本"
        className="mb-6"
      >
        {samples.filter(s => s.hasSpeciesSynonymIssue).length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            未发现物种同义名问题
          </div>
        ) : (
          <div className="space-y-3">
            {samples
              .filter(s => s.hasSpeciesSynonymIssue)
              .map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded"
                >
                  <div>
                    <Link
                      to={`/sample/${s.id}`}
                      className="text-sm text-slate-200 hover:text-teal-300"
                    >
                      {s.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-slate-500">录入名：</span>
                      <span className="text-amber-400 font-mono">{s.species}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-400">标准名：</span>
                      <span className="text-teal-400 font-mono">{s.speciesCanonical}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-1 rounded">
                    同义名
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>

      <Card title="四、完整样本清单" subtitle="所有样本审计结果明细">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="pb-3 pl-5 font-medium">#</th>
                <th className="pb-3 font-medium">样本名称</th>
                <th className="pb-3 font-medium">来源材料</th>
                <th className="pb-3 font-medium">物种</th>
                <th className="pb-3 font-medium text-right">污染置信度</th>
                <th className="pb-3 pr-5 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, idx) => (
                <tr
                  key={sample.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 pl-5 text-slate-500">{idx + 1}</td>
                  <td className="py-3">
                    <Link
                      to={`/sample/${sample.id}`}
                      className="text-slate-200 hover:text-teal-300 font-mono text-sm"
                    >
                      {sample.name}
                    </Link>
                  </td>
                  <td className="py-3 text-slate-400 text-xs">{sample.sourceMaterial}</td>
                  <td className="py-3 text-slate-400 text-xs">
                    {sample.species}
                    {sample.hasSpeciesSynonymIssue && (
                      <span className="ml-1 text-amber-500">※</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-mono text-sm">
                    {sample.contamination.detected ? (
                      <span
                        className={
                          sample.contamination.confidence > 0.8
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }
                      >
                        {(sample.contamination.confidence * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-teal-500">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-5">
                    <StatusBadge status={sample.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 text-center text-xs text-slate-600">
        <p>本报告由 PPI Audit 系统自动生成 · {formatDate(batch.createdAt)}</p>
        <p className="mt-1">如有疑问请联系质量控制部门</p>
      </div>
    </div>
  );
}
