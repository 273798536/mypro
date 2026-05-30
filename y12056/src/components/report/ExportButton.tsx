import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Image, Printer, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  onExportPDF: () => void;
  onExportPNG: () => void;
  onPrint: () => void;
  isLoading?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

export default function ExportButton({
  onExportPDF,
  onExportPNG,
  onPrint,
  isLoading = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems: MenuItem[] = [
    {
      id: 'pdf',
      label: '导出 PDF',
      icon: <FileText className="w-4 h-4" />,
      onClick: onExportPDF,
      color: 'text-accent-rose hover:bg-accent-rose/10',
    },
    {
      id: 'png',
      label: '导出 PNG',
      icon: <Image className="w-4 h-4" />,
      onClick: onExportPNG,
      color: 'text-accent-emerald hover:bg-accent-emerald/10',
    },
    {
      id: 'print',
      label: '打印报告',
      icon: <Printer className="w-4 h-4" />,
      onClick: onPrint,
      color: 'text-primary hover:bg-primary/10',
    },
  ];

  const handleItemClick = (item: MenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all',
          'bg-primary text-white shadow-lg shadow-primary/20',
          isLoading && 'opacity-70 cursor-not-allowed',
          !isLoading && 'hover:bg-primary/90'
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{isLoading ? '导出中...' : '导出报告'}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border-2 border-neutral-ivory py-2 z-50"
          >
            {menuItems.map((item, idx) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  item.color
                )}
              >
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
