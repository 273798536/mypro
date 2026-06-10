import OldNewCompare from '@/components/OldNewCompare';

export default function Comparison() {
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-warm-900">新旧结论对比</h2>
        <p className="text-warm-500 text-sm mt-1">
          样本清单被改过以后，旧结论和新结论并排看，别让生物老师猜影响范围
        </p>
      </div>
      <OldNewCompare />
    </div>
  );
}
