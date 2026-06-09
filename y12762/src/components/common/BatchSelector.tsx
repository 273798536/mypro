import { ChevronDown } from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { cn } from '@/lib/utils';

export default function BatchSelector() {
  const { batches, currentBatchId, setCurrentBatch } = useBatchStore();

  return (
    <div className="relative">
      <select
        value={currentBatchId || ''}
        onChange={(e) => setCurrentBatch(e.target.value)}
        className={cn(
          'appearance-none bg-white border border-gray-300 rounded-lg',
          'px-4 py-2 pr-10 text-sm text-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent',
          'cursor-pointer hover:border-[#0d9488] transition-colors'
        )}
      >
        {batches.length === 0 ? (
          <option value="">暂无批次</option>
        ) : (
          batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))
        )}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  );
}
