import { useEffect } from 'react';
import ExportReviewList from '@/components/ui/ExportReviewList';
import { useExportStore } from '@/store/useExportStore';
import { useViewStore } from '@/store/useViewStore';

export default function ExportReview() {
  const loadExports = useExportStore((s) => s.loadExports);
  const loadViewpoints = useViewStore((s) => s.loadInitialViewpoints);

  useEffect(() => {
    loadExports();
    loadViewpoints();
  }, [loadExports, loadViewpoints]);

  return <ExportReviewList />;
}
