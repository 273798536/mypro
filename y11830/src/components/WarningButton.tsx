import { Bell, Check } from 'lucide-react';

interface WarningButtonProps {
  warningIssued: boolean;
  onToggle: () => void;
  disabled: boolean;
}

export default function WarningButton({ warningIssued, onToggle, disabled }: WarningButtonProps) {
  return (
    <>
      <style>{`
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); transform: scale(1); }
          50% { box-shadow: 0 0 20px 8px rgba(245, 158, 11, 0.3); transform: scale(1.06); }
        }
        @keyframes subtle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 12px 4px rgba(34, 197, 94, 0.2); }
        }
        .breathe { animation: breathe 2s ease-in-out infinite; }
        .subtle-pulse { animation: subtle-pulse 2.5s ease-in-out infinite; }
      `}</style>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={[
          "flex flex-col items-center justify-center w-20 h-20 rounded-full font-bold text-xs transition-all duration-300 border-2",
          disabled
            ? "bg-gray-400 border-gray-500 text-gray-600 cursor-not-allowed opacity-50"
            : warningIssued
              ? "bg-green-500 border-green-600 text-white subtle-pulse"
              : "bg-amber-500 border-amber-600 text-white breathe cursor-pointer",
        ].join(" ")}
      >
        {warningIssued ? <Check size={28} /> : <Bell size={28} />}
        <span className="mt-1 leading-tight text-[10px]">
          {warningIssued ? "已发预警 ✓" : "发出预警"}
        </span>
      </button>
    </>
  );
}
