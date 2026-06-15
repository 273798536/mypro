import FilterBar from '@/components/FilterBar';
import AlignTable from '@/components/AlignTable';

export default function AlignHome() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-medium tracking-wider text-amber-500">
          分账对齐工作台
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink-800">
          刷新不丢状态，结论有人负责
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          筛选条件自动保存，人工备注带来源标签，截图和记录绑在一起。
          授权到期的会自动<b className="text-rouge-500">挂起锁死</b>，宁可不动也不瞎给结论。
        </p>
      </header>
      <FilterBar />
      <AlignTable />
    </div>
  );
}
