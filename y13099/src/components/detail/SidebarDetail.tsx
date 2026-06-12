import { useState } from "react";
import type { TimelineNode, PlanDetail, SensorRecord } from "@shared/types";
import { useStore } from "@/store/useStore";
import {
  Clock,
  User,
  FileText,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarDetailProps {
  node: TimelineNode | null;
  planDetail: PlanDetail | null;
}

export function SidebarDetail({ node, planDetail }: SidebarDetailProps) {
  const { fetchSensorDetail, sensorDetail, loading } = useStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    sensor: true,
    detail: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>请选择时间轴节点查看详情</p>
        </div>
      </div>
    );
  }

  const operator = node.detail.operator as string | undefined;
  const remark = node.detail.remark as string | undefined;
  const deviceCount = node.detail.deviceCount as number | undefined;
  const segmentCount = node.detail.segmentCount as number | undefined;
  const totalRecords = node.detail.totalRecords as number | undefined;
  const result = node.detail.result as string | undefined;
  const reason = node.detail.reason as string | undefined;
  const materials = node.detail.materials as string[] | undefined;

  return (
    <div className="h-full overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="p-4"
        >
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-text mb-1">
              {node.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(node.timestamp), "yyyy年MM月dd日 HH:mm", {
                locale: zhCN,
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-hover transition-colors"
                onClick={() => toggleSection("basic")}
              >
                <span className="text-sm font-medium text-text flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  基本信息
                </span>
                {expandedSections.basic ? (
                  <ChevronUp className="w-4 h-4 text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted" />
                )}
              </button>
              {expandedSections.basic && (
                <div className="px-3 pb-3 space-y-2.5 text-sm">
                  {operator && (
                    <div className="flex items-start gap-2.5">
                      <User className="w-3.5 h-3.5 text-muted mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-muted text-xs">操作人</span>
                        <p className="text-text">{operator}</p>
                      </div>
                    </div>
                  )}
                  {result && (
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-muted text-xs">审查结果</span>
                        <p className="text-text">{result}</p>
                      </div>
                    </div>
                  )}
                  {node.corridorSegmentIndex != null && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-muted text-xs">关联航段</span>
                        <p className="text-text font-mono">
                          第 {node.corridorSegmentIndex + 1} 航段
                        </p>
                      </div>
                    </div>
                  )}
                  {deviceCount != null && (
                    <div className="flex items-start gap-2.5">
                      <Radio className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-muted text-xs">采集统计</span>
                        <p className="text-text">
                          {deviceCount} 类传感器 · {segmentCount} 个航段 ·{" "}
                          {totalRecords} 条记录
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {node.sensorRecordId && (
              <div className="bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-hover transition-colors"
                  onClick={() => toggleSection("sensor")}
                >
                  <span className="text-sm font-medium text-text flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" />
                    关联传感器记录
                  </span>
                  {expandedSections.sensor ? (
                    <ChevronUp className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  )}
                </button>
                {expandedSections.sensor && (
                  <div className="px-3 pb-3">
                    <button
                      className="w-full flex items-center justify-between p-2.5 bg-background rounded-lg border border-border hover:border-primary/40 transition-colors text-left group"
                      onClick={() => fetchSensorDetail(node.sensorRecordId!)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Radio className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-text font-mono">
                            {node.sensorRecordId.substring(0, 8)}...
                          </p>
                          <p className="text-xs text-muted">点击查看原始读数</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                    </button>
                    {loading.sensorDetail && (
                      <div className="mt-2.5 text-xs text-muted text-center py-2">
                        加载中...
                      </div>
                    )}
                    {sensorDetail && sensorDetail.id === node.sensorRecordId && (
                      <div className="mt-2.5 bg-background/60 rounded-lg p-3 border border-primary/30">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted">设备编号</span>
                            <p className="font-mono text-text">
                              {sensorDetail.deviceCode}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted">采集时间</span>
                            <p className="font-mono text-text">
                              {format(
                                new Date(sensorDetail.timestamp),
                                "MM-dd HH:mm:ss"
                              )}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted">原始读数</span>
                            <p className="font-mono text-lg text-primary">
                              {sensorDetail.rawReading}{" "}
                              <span className="text-sm text-muted">
                                {sensorDetail.unit}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(remark || reason || materials) && (
              <div className="bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-hover transition-colors"
                  onClick={() => toggleSection("detail")}
                >
                  <span className="text-sm font-medium text-text flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    详细说明
                  </span>
                  {expandedSections.detail ? (
                    <ChevronUp className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  )}
                </button>
                {expandedSections.detail && (
                  <div className="px-3 pb-3 space-y-3 text-sm">
                    {reason && (
                      <div>
                        <span className="text-muted text-xs">撤回原因</span>
                        <p className="text-text mt-1 bg-danger/5 p-2 rounded border border-danger/20 text-sm">
                          {reason}
                        </p>
                      </div>
                    )}
                    {remark && (
                      <div>
                        <span className="text-muted text-xs">备注</span>
                        <p className="text-text mt-1">{remark}</p>
                      </div>
                    )}
                    {materials && materials.length > 0 && (
                      <div>
                        <span className="text-muted text-xs">补充材料</span>
                        <ul className="mt-1 space-y-1.5">
                          {materials.map((m, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-sm text-text"
                            >
                              <span className="w-5 h-5 bg-primary/10 text-primary text-xs rounded flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
