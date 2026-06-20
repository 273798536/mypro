export function Badge({ children, variant }: { children: React.ReactNode; variant: "sky" | "emerald" | "amber" | "rose" }) {
  const styles = {
    sky: "bg-sky-950/50 text-sky-400 border-sky-800/50",
    emerald: "bg-emerald-950/50 text-emerald-400 border-emerald-800/50",
    amber: "bg-amber-950/50 text-amber-400 border-amber-800/50",
    rose: "bg-rose-950/50 text-rose-400 border-rose-800/50",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  )
}

export function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
        checked
          ? "bg-emerald-600 border-emerald-600"
          : "border-zinc-600 hover:border-zinc-400"
      }`}
    >
      {checked && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      )}
    </button>
  )
}
