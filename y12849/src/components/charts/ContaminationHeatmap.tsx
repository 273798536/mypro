import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Sample } from '../../types';

interface ContaminationHeatmapProps {
  samples: Sample[];
  selectedSampleId: string | null;
  onSampleSelect: (sampleId: string) => void;
  showLabels?: boolean;
}

const loci = [
  'TraesCS1A01G001200',
  'TraesCS2B01G003400',
  'TraesCS3D01G005600',
  'TraesCS4A01G007800',
  'TraesCS5B01G009100',
  'TraesCS6D01G011200',
];

const getContaminationColor = (value: number) => {
  if (value < 30) return 'bg-emerald-100 text-emerald-700';
  if (value < 60) return 'bg-yellow-100 text-yellow-700';
  if (value < 80) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

export default function ContaminationHeatmap({ samples, selectedSampleId, onSampleSelect, showLabels = false }: ContaminationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ sample: string; locus: string; value: number } | null>(null);

  const heatmapData = (showLabels ? samples : samples.filter(s => s.contamination.probability > 50)).map(sample => ({
    sampleId: sample.id,
    sampleName: sample.name,
    contamination: sample.contamination.probability,
    loci: loci.map((locus, i) => ({
      locus,
      value: sample.contamination.evidenceLoci.includes(locus) 
        ? 70 + Math.random() * 25 
        : 10 + Math.random() * 20,
    })),
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">样本</th>
            <th className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">污染概率</th>
            {loci.map(locus => (
              <th 
                key={locus} 
                className="text-center text-xs font-medium text-gray-500 pb-3 px-1"
                title={locus}
              >
                <span className="font-mono text-[9px]">
                  {locus.replace('TraesCS', '').replace(/01G\d+/, '')}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heatmapData.map((row, rowIndex) => (
            <motion.tr
              key={row.sampleId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIndex * 0.05 }}
              onClick={() => onSampleSelect(row.sampleId)}
              className={`
                cursor-pointer transition-colors border-b border-gray-100
                ${selectedSampleId === row.sampleId ? 'bg-blue-50' : 'hover:bg-gray-50'}
              `}
            >
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-gray-900">{row.sampleName}</span>
                </div>
              </td>
              <td className="py-2 pr-4">
                <span className={`
                  inline-block px-2 py-0.5 rounded-[2px] text-xs font-mono font-medium
                  ${getContaminationColor(row.contamination)}
                `}>
                  {row.contamination.toFixed(0)}%
                </span>
              </td>
              {row.loci.map((cell, colIndex) => (
                <td key={`${row.sampleId}-${cell.locus}`} className="py-2 px-1">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    onMouseEnter={() => setHoveredCell({ sample: row.sampleName, locus: cell.locus, value: cell.value })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`
                      w-8 h-8 mx-auto rounded-[2px] flex items-center justify-center text-[10px] font-mono font-medium
                      transition-all duration-200
                      ${getContaminationColor(cell.value)}
                      ${cell.value > 70 ? 'ring-2 ring-red-300' : ''}
                    `}
                  >
                    {cell.value.toFixed(0)}
                  </motion.div>
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
      
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-gray-900 text-white rounded-[2px] text-xs inline-block"
        >
          <p><span className="text-gray-400">样本:</span> {hoveredCell.sample}</p>
          <p><span className="text-gray-400">基因座:</span> <span className="font-mono">{hoveredCell.locus}</span></p>
          <p><span className="text-gray-400">异常评分:</span> {hoveredCell.value.toFixed(1)}%</p>
        </motion.div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span>图例:</span>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-emerald-100 rounded-[2px]" />
          <span>正常 ({'<'}30%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-yellow-100 rounded-[2px]" />
          <span>可疑 (30-60%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-orange-100 rounded-[2px]" />
          <span>异常 (60-80%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-100 rounded-[2px]" />
          <span>污染 ({'>'}80%)</span>
        </div>
      </div>
    </div>
  );
}
