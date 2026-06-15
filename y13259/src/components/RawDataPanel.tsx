import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RawDataPanelProps {
  data: Record<string, any>;
  title?: string;
}

export default function RawDataPanel({ data, title = '原始数据' }: RawDataPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedJson = JSON.stringify(data, null, 2);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">{title}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            不做清洗
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-200">
              <pre
                className={cn(
                  'bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm',
                  'max-h-96 overflow-y-auto'
                )}
              >
                <code>{formattedJson}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
