interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export default function Card({
  title,
  subtitle,
  children,
  className = '',
  headerAction,
}: CardProps) {
  return (
    <div className={`bg-white rounded-md shadow-card border border-neutral-200 ${className}`}>
      {(title || headerAction) && (
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-primary-800">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
