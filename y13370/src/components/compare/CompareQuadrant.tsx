import React from 'react';
import type { VersionCompareReport } from '@/types';
import { DiffBlock } from './DiffBlock';

interface Props {
  report: VersionCompareReport;
}

export const CompareQuadrant: React.FC<Props> = ({ report }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <DiffBlock
        title="样本分布对比"
        subtitle="各批次样本量变化"
        accent="info"
        previousLabel={`前版 ${report.versionPair.previous}`}
        currentLabel={`当前版 ${report.versionPair.current}`}
        items={report.samples}
        numeric
      />
      <DiffBlock
        title="阈值配置对比"
        subtitle="核心阈值参数变更"
        accent="pink"
        previousLabel={`前版 ${report.versionPair.previous}`}
        currentLabel={`当前版 ${report.versionPair.current}`}
        items={report.thresholds}
        numeric
      />
      <DiffBlock
        title="人工修正清单对比"
        subtitle="修正判断记录变更"
        accent="amber"
        previousLabel={`前版 ${report.versionPair.previous}`}
        currentLabel={`当前版 ${report.versionPair.current}`}
        items={report.corrections}
      />
      <DiffBlock
        title="核心指标变化对比"
        subtitle="precision / recall / f1 / auc"
        accent="emerald"
        previousLabel={`前版 ${report.versionPair.previous}`}
        currentLabel={`当前版 ${report.versionPair.current}`}
        items={report.metrics}
        numeric
      />
    </div>
  );
};
