import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function Panel({
  children,
  className,
  title,
  icon,
  collapsible = false,
  defaultCollapsed = false,
}: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'backdrop-blur-xl bg-slate-900/85 border border-slate-600/30 rounded-xl',
        'shadow-2xl shadow-black/50',
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-600/30">
          {icon && <span className="text-slate-400">{icon}</span>}
          <h3 className="text-sm font-medium text-slate-200 tracking-wide">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </motion.div>
  );
}
