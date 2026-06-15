import { useEffect, useState } from 'react';
import { X, FileText, MapPin, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFullTraceData } from '@/services/traceService';
import { formatDate } from '@/services/traceService';
import type { TraceData } from '@/types';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import RawDataPanel from './RawDataPanel';

interface TracePanelProps {
  itemId: string | null;
  onClose: () => void;
}

interface TableRowProps {
  label: string;
  value: React.ReactNode;
}

function TableRow({ label, value }: TableRowProps) {
  return (
    <tr className="border-b border-gray-100 last:border-b-0">
      <td className="py-2 px-4 text-sm text-gray-500 font-medium w-32 align-top">{label}</td>
      <td className="py-2 px-4 text-sm text-gray-900">{value}</td>
    </tr>
  );
}

export default function TracePanel({ itemId, onClose }: TracePanelProps) {
  const [traceData, setTraceData] = useState<TraceData | null>(null);

  useEffect(() => {
    if (itemId) {
      const data = getFullTraceData(itemId);
      setTraceData(data);
    } else {
      setTraceData(null);
    }
  }, [itemId]);

  const isOpen = itemId !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed right-0 top-0 h-full w-[520px] bg-white shadow-xl z-50',
              'flex flex-col overflow-hidden'
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">数据追溯详情</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {traceData ? (
                <>
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-municipal-600">
                      <FileText className="w-5 h-5" />
                      <h3 className="font-semibold text-base">公示清单数据</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          <TableRow label="学校名称" value={traceData.listItem.schoolName} />
                          <TableRow label="接送时段" value={traceData.listItem.pickupTime} />
                          <TableRow label="核定容量" value={traceData.listItem.capacity} />
                          <TableRow label="实际人数" value={traceData.listItem.actualCount} />
                          <TableRow
                            label="状态"
                            value={<StatusBadge status={traceData.listItem.status} />}
                          />
                          <TableRow label="备注" value={traceData.listItem.remark} />
                          <TableRow
                            label="创建时间"
                            value={formatDate(traceData.listItem.createdAt)}
                          />
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-municipal-600">
                      <MapPin className="w-5 h-5" />
                      <h3 className="font-semibold text-base">GIS点位原始数据</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          <TableRow label="数据来源" value={traceData.gisPoint.source} />
                          <TableRow label="经度" value={traceData.gisPoint.lng} />
                          <TableRow label="纬度" value={traceData.gisPoint.lat} />
                          <TableRow label="所属街道" value={traceData.gisPoint.street} />
                          <TableRow
                            label="状态"
                            value={<StatusBadge status={traceData.gisPoint.status} />}
                          />
                          <TableRow
                            label="更新时间"
                            value={formatDate(traceData.gisPoint.updatedAt)}
                          />
                        </tbody>
                      </table>
                    </div>
                    <RawDataPanel
                      data={traceData.gisPoint.originalData}
                      title="GIS点位原始数据"
                    />
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-municipal-600">
                      <Calculator className="w-5 h-5" />
                      <h3 className="font-semibold text-base">计算口径详情</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          <TableRow label="规则名称" value={traceData.calculationRule.name} />
                          <TableRow label="版本号" value={traceData.calculationRule.version} />
                          <TableRow label="算法" value={traceData.calculationRule.algorithm} />
                          <TableRow
                            label="生效时间"
                            value={formatDate(traceData.calculationRule.effectiveAt)}
                          />
                        </tbody>
                      </table>
                    </div>
                    <RawDataPanel
                      data={traceData.calculationRule.parameters}
                      title="计算参数"
                    />
                  </section>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  未找到追溯数据
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
