import type { ReactNode } from "react";
import { Waves } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, children, className }: Props) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-ocean-100 bg-white/85 backdrop-blur-md",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-500 to-ocean-600 text-white shadow-md shadow-ocean-500/30">
            <Waves className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-song text-lg font-bold text-ocean-800 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-ocean-500 font-song leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
