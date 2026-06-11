export default function CaliberChangeTag({ changed }: { changed: boolean }) {
  if (!changed) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-900/40 text-amber-400 border border-amber-700/50">
      口径变更
    </span>
  );
}
