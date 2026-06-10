interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export default function Card({ title, subtitle, children, className = '', headerAction }: CardProps) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            {title && <h3 className="font-semibold text-slate-200">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
