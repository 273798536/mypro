import type { Batch } from '@/types';
import BatchCard from './BatchCard';

interface BatchListProps {
  batches: Batch[];
  onBatchClick: (batch: Batch) => void;
  onMergeClick?: (batch: Batch) => void;
}

export default function BatchList({ batches, onBatchClick, onMergeClick }: BatchListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {batches.map((batch) => (
        <BatchCard
          key={batch.id}
          batch={batch}
          onClick={onBatchClick}
          onMergeClick={onMergeClick}
        />
      ))}
    </div>
  );
}
