import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export default function Drawer({ open, onClose, title, subtitle, children, footer, width }: DrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel" style={width ? { maxWidth: width } : undefined}>
        <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex-1 pr-4">
            <h3 className="section-title">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -mt-1 -mr-1"
          >
            <X className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
