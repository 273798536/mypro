import { useState, useMemo } from 'react';
import { Upload, Play, Download, ImagePlus, Info } from 'lucide-react';
import type { Scheme, Material, TimelineEntry } from '../types';
import { useSchemeStore } from '../store/useSchemeStore';
import { exportSchemeReport } from '../utils/export';
import { AddMaterialModal } from './AddMaterialModal';

interface Props {
  scheme: Scheme;
}

const OPERATOR = '小赵';

export function ActionBar({ scheme }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const addMaterial = useSchemeStore((s) => s.addMaterial);
  const rerunScheme = useSchemeStore((s) => s.rerunScheme);
  const recordExport = useSchemeStore((s) => s.recordExport);
  const allMaterials = useSchemeStore((s) => s.materials);
  const allTimeline = useSchemeStore((s) => s.timeline);
  const allReasonNodes = useSchemeStore((s) => s.reasonNodes);

  const mats = useMemo(
    () => allMaterials.filter((m) => m.schemeId === scheme.id),
    [allMaterials, scheme.id]
  );
  const tls = useMemo(
    () =>
      allTimeline
        .filter((t) => t.schemeId === scheme.id)
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [allTimeline, scheme.id]
  );
  const rns = useMemo(
    () => allReasonNodes.filter((r) => r.schemeId === scheme.id),
    [allReasonNodes, scheme.id]
  );

  const handleAddMaterial = (material: Material, entry: TimelineEntry) => {
    addMaterial(material, entry, {
      hasCapacityOverload: material.isCapacityOverload || scheme.hasCapacityOverload,
      mapPoint: { ...scheme.mapPoint, isUpdated: true },
    });
    setShowModal(false);
  };

  const handleRerun = () => {
    rerunScheme(scheme.id, OPERATOR);
  };

  const handleExport = async () => {
    recordExport(scheme.id, OPERATOR);
    await exportSchemeReport(scheme, mats, tls, rns);
  };

  const handleLoadExample = () => {
    setShowModal(true);
  };

  return (
    <>
      <div className="bg-white border border-slateX-200 rounded-sm p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleLoadExample}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-slateX-100 border border-slateX-200 text-slateX-700 rounded-sm hover:bg-slateX-200 transition-colors"
          >
            <Upload size={14} />
            放样例
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-engineering-800 border border-engineering-800 text-white rounded-sm hover:bg-engineering-900 transition-colors"
          >
            <ImagePlus size={14} />
            补录照片
          </button>

          <button
            type="button"
            onClick={handleRerun}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-engineering-600 text-engineering-700 rounded-sm hover:bg-engineering-50 transition-colors"
          >
            <Play size={14} />
            重跑比选
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slateX-300 text-slateX-700 rounded-sm hover:bg-slateX-50 transition-colors"
          >
            <Download size={14} />
            导出报告
          </button>

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 px-2 py-2 text-sm text-slateX-500 hover:text-engineering-700 transition-colors"
          >
            <Info size={14} />
            操作说明
          </button>
        </div>

        {showHelp && (
          <div className="mt-3 p-3 bg-engineering-50 border border-engineering-200 rounded-sm text-sm text-slateX-700 space-y-2">
            <div>
              <span className="font-medium text-engineering-800">放样例：</span>
              载入示例材料到当前方案，方便熟悉流程
            </div>
            <div>
              <span className="font-medium text-engineering-800">重跑：</span>
              基于当前所有材料重新计算方案比选结论（写入时间线）
            </div>
            <div>
              <span className="font-medium text-engineering-800">查看历史时间线：</span>
              下方时间线面板可查看每次补录、结论变更、重跑、导出记录，不可删除
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddMaterialModal
          schemeId={scheme.id}
          operator={OPERATOR}
          onClose={() => setShowModal(false)}
          onSubmit={handleAddMaterial}
        />
      )}
    </>
  );
}
