import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  description?: string;
}

export default function EmptyState({ message = '暂无数据', description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-[#1e3a5f] border-2 border-[#2d5a8e] flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-[#5a9fd4]" />
      </div>
      <p className="text-[#8ba7c7] text-base font-medium">{message}</p>
      {description && (
        <p className="text-[#5a7aa0] text-sm mt-1 text-center">{description}</p>
      )}
    </div>
  );
}
