import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  hoverable?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  actions,
  hoverable = false,
  className,
  headerClassName,
  bodyClassName,
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-card border border-neutral-100 transition-all duration-200",
        hoverable && "hover:shadow-card-hover cursor-pointer",
        className
      )}
    >
      {(title || icon || actions) && (
        <div
          className={cn(
            "flex items-start justify-between px-5 py-4 border-b border-neutral-100",
            headerClassName
          )}
        >
          <div className="flex items-start gap-3">
            {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
            <div>
              {title && (
                <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
};
