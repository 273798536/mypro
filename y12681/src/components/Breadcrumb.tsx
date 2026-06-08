import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-sm text-space-400 mb-6">
      <Link to="/" className="flex items-center gap-1.5 hover:text-gold-400 transition-colors">
        <Home className="w-4 h-4" />
        <span>沙盘列表</span>
      </Link>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2 text-space-600" />
          {item.to ? (
            <Link to={item.to} className="hover:text-gold-400 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-space-200">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SandboxBreadcrumb({ extra = [] }: { extra?: BreadcrumbItem[] }) {
  const { id } = useParams<{ id: string }>();
  const sandbox = useSandboxStore((s) => s.getSandbox(id || ''));
  return (
    <Breadcrumb
      items={[
        { label: sandbox?.name || '沙盘详情', to: sandbox ? `/sandbox/${sandbox.id}` : undefined },
        ...extra,
      ]}
    />
  );
}
