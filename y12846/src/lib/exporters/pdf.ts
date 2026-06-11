import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  AnalysisResult,
  PrimerPair,
  SampleResult,
  AnomalyRecord,
  MutationImpact,
  CoverageRegion,
} from '../utils/types';
import { getMutationSeverityCount } from '../bio/mutation';

const PAGE_WIDTH = 210;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function getStatusLabel(status: PrimerPair['status']): string {
  const map: Record<PrimerPair['status'], string> = {
    valid: 'OK',
    warning: 'Caution',
    invalid: 'Failed',
    needs_review: 'Review',
  };
  return map[status];
}

function getStatusColor(status: PrimerPair['status']): [number, number, number] {
  const map: Record<PrimerPair['status'], [number, number, number]> = {
    valid: [34, 197, 94],
    warning: [234, 179, 8],
    invalid: [239, 68, 68],
    needs_review: [59, 130, 246],
  };
  return map[status];
}

function getSeverityLabel(severity: AnomalyRecord['severity']): string {
  const map: Record<AnomalyRecord['severity'], string> = {
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
  };
  return map[severity];
}

function getSeverityColor(severity: AnomalyRecord['severity']): [number, number, number] {
  const map: Record<AnomalyRecord['severity'], [number, number, number]> = {
    error: [239, 68, 68],
    warning: [234, 179, 8],
    info: [59, 130, 246],
  };
  return map[severity];
}

function getMismatchLevelLabel(level: MutationImpact['mismatchLevel']): string {
  const map: Record<MutationImpact['mismatchLevel'], string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return map[level];
}

function describeCoverage(coverage: CoverageRegion[], refLength: number): string {
  const gaps = coverage.filter((r) => r.isGap);
  const coveredBases = refLength - gaps.reduce((sum, g) => sum + (g.end - g.start), 0);
  const percent = (coveredBases / refLength) * 100;

  if (gaps.length === 0) {
    return 'Full genome coverage achieved. No gaps detected.';
  }

  const descriptions: string[] = [];
  descriptions.push(
    `Coverage: ${percent.toFixed(1)}% of the reference genome. ` +
    `${gaps.length} gap region(s) detected.`
  );

  if (gaps.length <= 5) {
    for (const gap of gaps) {
      const size = gap.end - gap.start;
      descriptions.push(
        `Gap of ${size} bp affecting approximately ${size < 100 ? 'a small' : size < 500 ? 'a moderate' : 'a large'} segment.`
      );
    }
  } else {
    const avgGapSize = gaps.reduce((s, g) => s + (g.end - g.start), 0) / gaps.length;
    descriptions.push(
      `Multiple gaps detected with average size of ${avgGapSize.toFixed(0)} bp. Consider adding more primers.`
    );
  }

  return descriptions.join(' ');
}

function describeAnomaly(anomaly: AnomalyRecord): string {
  switch (anomaly.type) {
    case 'reversed_primer':
      return 'Primer orientation issue detected. The primer sequence may be reversed.';
    case 'ambiguity_base':
      return 'Ambiguous bases found in primer sequence. This may reduce binding specificity.';
    case 'duplicate_name':
      return 'Multiple primer pairs share the same name. Please rename for clarity.';
    case 'out_of_range_tm':
      return 'Melting temperature outside the recommended range. PCR efficiency may be affected.';
    default:
      return anomaly.message;
  }
}

function drawCoverPage(doc: jsPDF, result: AnalysisResult): void {
  const centerX = PAGE_WIDTH / 2;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Primer Analysis Report', centerX, 50, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Virus Primer Coverage & Mutation Impact Assessment', centerX, 65, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(MARGIN, 80, PAGE_WIDTH - MARGIN, 80);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Summary', MARGIN, 100);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const infoY = 115;
  const lineHeight = 8;

  doc.text(`Reference: ${result.reference.name}`, MARGIN, infoY);
  doc.text(`Reference Length: ${result.reference.length.toLocaleString()} bp`, MARGIN, infoY + lineHeight);
  doc.text(`GC Content: ${formatPercent(result.reference.gcContent)}`, MARGIN, infoY + lineHeight * 2);
  doc.text(`Primer Pairs Analyzed: ${result.summary.totalPrimers}`, MARGIN, infoY + lineHeight * 3);
  doc.text(`Samples Evaluated: ${result.sampleResults.length}`, MARGIN, infoY + lineHeight * 4);
  doc.text(`Mutations Detected: ${result.mutations.length}`, MARGIN, infoY + lineHeight * 5);
  doc.text(`Report Generated: ${formatDate(result.createdAt)}`, MARGIN, infoY + lineHeight * 6);
  doc.text(`Report ID: ${result.id}`, MARGIN, infoY + lineHeight * 7);

  const severityCounts = getMutationSeverityCount(result.mutationImpacts);
  const rightX = PAGE_WIDTH / 2 + 10;
  doc.text(`Valid Primers: ${result.summary.validPrimers}/${result.summary.totalPrimers}`, rightX, infoY);
  doc.text(`Coverage: ${formatPercent(result.summary.coveragePercent)}`, rightX, infoY + lineHeight);
  doc.text(`Coverage Gaps: ${result.summary.gapCount}`, rightX, infoY + lineHeight * 2);
  doc.text(`Critical Mismatches: ${severityCounts.critical}`, rightX, infoY + lineHeight * 3);
  doc.text(`High Risk Mismatches: ${severityCounts.high}`, rightX, infoY + lineHeight * 4);
  doc.text(`Samples Needing Attention: ${result.summary.samplesNeedingAttention}`, rightX, infoY + lineHeight * 5);
  doc.text(`Anomalies Detected: ${result.summary.anomalyCount}`, rightX, infoY + lineHeight * 6);

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This report was generated automatically. Please review critical findings with a lab technician.',
    centerX,
    pageHeight - 20,
    { align: 'center' }
  );
}

function drawSummarySection(doc: jsPDF, result: AnalysisResult): void {
  doc.addPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', MARGIN, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  let y = 40;
  const lineHeight = 6;

  const coverageDesc = describeCoverage(result.coverage, result.reference.length);
  doc.text('Coverage Assessment:', MARGIN, y);
  y += lineHeight;
  doc.setFontSize(9);
  const splitCoverage = doc.splitTextToSize(coverageDesc, CONTENT_WIDTH);
  doc.text(splitCoverage, MARGIN + 5, y);
  y += splitCoverage.length * lineHeight + 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Primer Quality:', MARGIN, y);
  y += lineHeight;
  doc.setFontSize(9);
  const validPercent = result.summary.totalPrimers > 0
    ? (result.summary.validPrimers / result.summary.totalPrimers) * 100
    : 0;
  let primerQualityText = '';
  if (validPercent >= 90) {
    primerQualityText = `Most primer pairs (${validPercent.toFixed(0)}%) meet quality standards. `;
  } else if (validPercent >= 70) {
    primerQualityText = `A significant portion of primer pairs (${validPercent.toFixed(0)}%) are usable, but some need attention. `;
  } else {
    primerQualityText = `Only ${validPercent.toFixed(0)}% of primer pairs pass quality checks. Significant redesign may be needed. `;
  }
  if (result.anomalies.length > 0) {
    primerQualityText += `${result.anomalies.length} issue(s) were flagged during validation. See the Anomaly Detection section for details.`;
  } else {
    primerQualityText += 'No anomalies were detected during primer validation.';
  }
  const splitPrimer = doc.splitTextToSize(primerQualityText, CONTENT_WIDTH);
  doc.text(splitPrimer, MARGIN + 5, y);
  y += splitPrimer.length * lineHeight + 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Sample Analysis:', MARGIN, y);
  y += lineHeight;
  doc.setFontSize(9);

  const samplesNeedingAttention = result.sampleResults.filter((s) => s.needsAlternativePrimers);
  let sampleText = '';
  if (samplesNeedingAttention.length === 0) {
    sampleText = 'All analyzed samples appear compatible with the current primer set. No immediate action required.';
  } else if (samplesNeedingAttention.length <= result.sampleResults.length / 2) {
    sampleText = `${samplesNeedingAttention.length} of ${result.sampleResults.length} sample(s) may experience reduced amplification efficiency. Consider alternative primers for these samples.`;
  } else {
    sampleText = `Most samples (${samplesNeedingAttention.length}/${result.sampleResults.length}) show potential issues. The current primer panel may need revision for this sample set.`;
  }
  const splitSample = doc.splitTextToSize(sampleText, CONTENT_WIDTH);
  doc.text(splitSample, MARGIN + 5, y);
  y += splitSample.length * lineHeight + 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Mutation Impact:', MARGIN, y);
  y += lineHeight;
  doc.setFontSize(9);
  const severityCounts = getMutationSeverityCount(result.mutationImpacts);
  let mutationText = '';
  if (result.mutationImpacts.length === 0) {
    mutationText = 'No mutations overlap with primer binding regions. All primers should work as designed.';
  } else if (severityCounts.critical > 0) {
    mutationText = `${severityCounts.critical} critical 3' end mismatch(es) detected. These mutations are likely to prevent proper primer binding and amplification failure. Immediate primer redesign is recommended for affected regions. `;
  } else if (severityCounts.high > 0) {
    mutationText = `${severityCounts.high} high-impact mutation(s) found near primer binding sites. While not at the critical 3' end, these may reduce amplification efficiency significantly. `;
  } else {
    mutationText = 'Mutations detected are mostly low-to-medium impact. PCR should still work, but efficiency may vary between samples.';
  }
  if (severityCounts.medium > 0 || severityCounts.low > 0) {
    mutationText += ` Additionally, ${severityCounts.medium} medium and ${severityCounts.low} low-impact mismatches were noted.`;
  }
  const splitMutation = doc.splitTextToSize(mutationText, CONTENT_WIDTH);
  doc.text(splitMutation, MARGIN + 5, y);
}

function drawPrimerTable(doc: jsPDF, result: AnalysisResult): void {
  doc.addPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Primer Pair Details', MARGIN, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total: ${result.primerPairs.length} primer pairs`, MARGIN, 35);

  const tableData = result.primerPairs.map((pair) => {
    const fwdSeq = pair.forward.sequence.length > 20
      ? pair.forward.sequence.substring(0, 17) + '...'
      : pair.forward.sequence;
    const revSeq = pair.reverse.sequence.length > 20
      ? pair.reverse.sequence.substring(0, 17) + '...'
      : pair.reverse.sequence;

    return [
      pair.name,
      pair.batch || '-',
      fwdSeq,
      pair.forward.tm.toFixed(1),
      revSeq,
      pair.reverse.tm.toFixed(1),
      pair.productSize > 0 ? `${pair.productSize} bp` : 'N/A',
      getStatusLabel(pair.status),
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Name', 'Batch', 'Forward', 'Tm(C)', 'Reverse', 'Tm(C)', 'Product', 'Status']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontStyle: 'bold',
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const pair = result.primerPairs[data.row.index];
        if (pair) {
          const color = getStatusColor(pair.status);
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });
}

function drawSampleRecommendations(doc: jsPDF, result: AnalysisResult): void {
  doc.addPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Sample Recommendations', MARGIN, 25);

  const tableData = result.sampleResults.map((sample: SampleResult) => {
    const action = sample.needsAlternativePrimers ? 'Review needed' : 'OK to use';
    const recCount = sample.recommendedPrimerPairs.length;
    const total = result.primerPairs.length;
    const usablePrimers = total > 0 ? `${recCount}/${total}` : 'N/A';

    return [
      sample.sampleName,
      sample.mutationCount.toString(),
      sample.criticalMismatches.length.toString(),
      usablePrimers,
      action,
      sample.notes.length > 80 ? sample.notes.substring(0, 77) + '...' : sample.notes,
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['Sample', 'Mutations', 'Critical', 'Usable Primers', 'Action', 'Notes']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontStyle: 'bold',
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const sample = result.sampleResults[data.row.index];
        if (sample?.needsAlternativePrimers) {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });
}

function drawAnomalyList(doc: jsPDF, result: AnalysisResult): void {
  if (result.anomalies.length === 0) {
    return;
  }

  doc.addPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Anomaly Detection', MARGIN, 25);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${result.anomalies.length} issue(s) were detected during primer validation. Review each item below.`,
    MARGIN,
    35
  );

  const tableData = result.anomalies.map((anomaly: AnomalyRecord) => {
    const pair = result.primerPairs.find((p) => p.id === anomaly.primerPairId);
    const source = pair?.name || 'System';

    return [
      getSeverityLabel(anomaly.severity),
      source,
      describeAnomaly(anomaly),
      anomaly.suggestion.length > 100
        ? anomaly.suggestion.substring(0, 97) + '...'
        : anomaly.suggestion,
    ];
  });

  autoTable(doc, {
    startY: 43,
    head: [['Severity', 'Source', 'Issue Description', 'Recommendation']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontStyle: 'bold',
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const anomaly = result.anomalies[data.row.index];
        if (anomaly) {
          const color = getSeverityColor(anomaly.severity);
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });
}

function drawCoverageMap(doc: jsPDF, result: AnalysisResult): void {
  doc.addPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Coverage Map Overview', MARGIN, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let y = 38;
  const lineHeight = 6;

  doc.text('How to Read This Map:', MARGIN, y);
  y += lineHeight;
  doc.setFontSize(9);
  doc.text(
    '- The horizontal bar represents the full reference genome from left (5\' end) to right (3\' end).',
    MARGIN + 5,
    y
  );
  y += lineHeight;
  doc.text(
    '- Green segments indicate regions covered by at least one primer pair.',
    MARGIN + 5,
    y
  );
  y += lineHeight;
  doc.text(
    '- Red segments indicate coverage gaps where no primer amplicons reach.',
    MARGIN + 5,
    y
  );
  y += lineHeight;
  doc.text(
    '- Darker green regions are covered by multiple overlapping primer pairs (higher depth).',
    MARGIN + 5,
    y
  );
  y += lineHeight * 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Visual Coverage Representation:', MARGIN, y);
  y += lineHeight * 2;

  const barY = y;
  const barHeight = 15;
  const totalWidth = CONTENT_WIDTH;
  const refLength = result.reference.length;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, barY, totalWidth, barHeight);

  for (const region of result.coverage) {
    const startX = MARGIN + (region.start / refLength) * totalWidth;
    const regionWidth = ((region.end - region.start) / refLength) * totalWidth;

    if (region.isGap) {
      doc.setFillColor(239, 68, 68);
    } else {
      const depth = Math.min(region.coverageDepth, 5);
      const greenBase = 196 - depth * 20;
      doc.setFillColor(34, greenBase, 94);
    }
    doc.rect(startX, barY + 1, Math.max(regionWidth, 0.1), barHeight - 2, 'F');
  }

  y = barY + barHeight + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Legend:', MARGIN, y);
  y += lineHeight;
  doc.setFontSize(9);

  doc.setFillColor(34, 196, 94);
  doc.rect(MARGIN, y - 3, 8, 6, 'F');
  doc.text('Covered (single primer)', MARGIN + 12, y + 1);

  doc.setFillColor(34, 136, 94);
  doc.rect(MARGIN + 70, y - 3, 8, 6, 'F');
  doc.text('Covered (multiple primers)', MARGIN + 82, y + 1);

  doc.setFillColor(239, 68, 68);
  doc.rect(MARGIN, y + 6, 8, 6, 'F');
  doc.text('Coverage Gap', MARGIN + 12, y + 10);

  y += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Coverage Assessment:', MARGIN, y);
  y += lineHeight;
  doc.setFontSize(9);
  const coverageDesc = describeCoverage(result.coverage, refLength);
  const splitDesc = doc.splitTextToSize(coverageDesc, CONTENT_WIDTH);
  doc.text(splitDesc, MARGIN, y);
  y += splitDesc.length * lineHeight + 4;

  const nonGapRegions = result.coverage.filter((r) => !r.isGap);
  if (nonGapRegions.length > 0) {
    const maxDepth = Math.max(...nonGapRegions.map((r) => r.coverageDepth));
    const avgDepth = nonGapRegions.reduce((s, r) => s + r.coverageDepth * (r.end - r.start), 0) /
      (refLength - result.coverage.filter((r) => r.isGap).reduce((s, g) => s + (g.end - g.start), 0));
    doc.setFontSize(9);
    doc.text(`Maximum coverage depth: ${maxDepth}x`, MARGIN, y);
    y += lineHeight;
    doc.text(`Average coverage depth: ${avgDepth.toFixed(2)}x`, MARGIN, y);
  }
}

export function exportToPdf(result: AnalysisResult, filename?: string): void {
  if (!result) {
    throw new Error('Analysis result is required for PDF export');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  drawCoverPage(doc, result);
  drawSummarySection(doc, result);
  drawPrimerTable(doc, result);
  drawSampleRecommendations(doc, result);
  drawAnomalyList(doc, result);
  drawCoverageMap(doc, result);

  const outputFilename = filename || `primer-analysis-report-${result.createdAt}.pdf`;
  doc.save(outputFilename);
}

export function generatePdfBlob(result: AnalysisResult): Blob {
  if (!result) {
    throw new Error('Analysis result is required for PDF export');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  drawCoverPage(doc, result);
  drawSummarySection(doc, result);
  drawPrimerTable(doc, result);
  drawSampleRecommendations(doc, result);
  drawAnomalyList(doc, result);
  drawCoverageMap(doc, result);

  return doc.output('blob');
}
