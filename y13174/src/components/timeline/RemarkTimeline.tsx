import { motion } from 'framer-motion';
import { MessageSquare, Edit3 } from 'lucide-react';
import type { Remark } from '@/types';
import { formatDateTime } from '@/utils/formatters';

interface RemarkTimelineProps {
  remarks: Remark[];
}

export default function RemarkTimeline({ remarks }: RemarkTimelineProps) {
  if (remarks.length === 0) {
    return (
      <div className="py-12 text-center">
        <MessageSquare className="w-12 h-12 text-[#5a7aa0] mx-auto mb-3" />
        <p className="text-[#8ba7c7] text-sm">暂无备注记录</p>
      </div>
    );
  }

  const sortedRemarks = [...remarks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-[#2d5a8e]" />

      <div className="space-y-6">
        {sortedRemarks.map((remark, index) => (
          <motion.div
            key={remark.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="relative"
          >
            <div
              className={`absolute -left-5 w-4 h-4 rounded-full border-2 ${
                remark.isBackfilled
                  ? 'bg-amber-500 border-amber-400'
                  : 'bg-[#5a9fd4] border-[#5a9fd4]'
              }`}
            />

            <div
              className={`bg-[#1e3a5f] border-2 ${
                remark.isBackfilled ? 'border-amber-500/30' : 'border-[#2d5a8e]'
              } p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{remark.author}</span>
                  {remark.isBackfilled && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      补录
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#5a9fd4] text-xs font-mono">v{remark.version}</span>
                  <span className="text-[#8ba7c7] text-xs font-mono">
                    {formatDateTime(remark.createdAt)}
                  </span>
                </div>
              </div>

              <p className="text-[#c9d6e6] text-sm leading-relaxed whitespace-pre-wrap">
                {remark.content}
              </p>

              {remark.attachmentUrls && remark.attachmentUrls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#2d5a8e]/50">
                  <p className="text-[#8ba7c7] text-xs mb-2">附件 ({remark.attachmentUrls.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {remark.attachmentUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        className="text-[#5a9fd4] text-xs hover:text-white transition-colors"
                      >
                        附件 {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
