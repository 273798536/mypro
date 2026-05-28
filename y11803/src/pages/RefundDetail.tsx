import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { RefundDetailCard } from '@/components/refund/RefundDetailCard';
import { RefundCorrectionModal } from '@/components/refund/RefundCorrectionModal';
import { CustomerNoteList } from '@/components/refund/CustomerNoteList';
import { HistoryTimeline } from '@/components/history/HistoryTimeline';
import { useAppStore } from '@/store/useAppStore';

export default function RefundDetail() {
  const { id } = useParams<{ id: string }>();
  const refundOrders = useAppStore(state => state.refundOrders);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const refund = refundOrders.find(r => r.id === id);

  if (!refund) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-xl font-mono text-slate-500">
            退款单不存在或已被删除
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <RefundDetailCard
        refund={refund}
        onCorrect={() => setShowCorrectionModal(true)}
        onAddNote={() => setShowNoteModal(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomerNoteList refundOrderId={refund.id} />
        <HistoryTimeline refundOrderId={refund.id} />
      </div>

      <RefundCorrectionModal
        refund={refund}
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
      />
    </PageContainer>
  );
}
