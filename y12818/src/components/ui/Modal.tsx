import { type ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import Button from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  closeOnOverlayClick?: boolean;
}

// 模态框大小配置
const sizeConfig = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

// 模态框组件
export default function Modal({
  open,
  onClose,
  children,
  title,
  description,
  footer,
  size = 'md',
  className,
  closeOnOverlayClick = true,
}: ModalProps) {
  // 处理 ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 处理滚动锁定
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // 默认底部操作栏
  const defaultFooter = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        取消
      </Button>
      <Button onClick={onClose}>确认</Button>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* 模态框主体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900',
              sizeConfig[size],
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
          >
            {/* 头部区域 */}
            {(title || description) && (
              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="pr-8">
                  {title && (
                    <h3
                      id="modal-title"
                      className="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                    >
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="关闭模态框"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* 内容区域 */}
            <div
              className={cn(
                'px-6 py-5',
                !title && !description && 'pt-6',
                !footer && 'pb-6',
              )}
            >
              {children}
            </div>

            {/* 底部操作栏 */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              {footer !== undefined ? footer : defaultFooter}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
