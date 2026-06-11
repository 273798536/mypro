import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * 模态框组件属性接口
 */
interface ModalProps {
  /** 是否打开模态框 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 模态框标题 */
  title?: ReactNode;
  /** 模态框内容 */
  children: ReactNode;
  /** 底部按钮区域 */
  footer?: ReactNode;
}

/**
 * 模态框组件
 * 带遮罩层、标题栏、内容区和底部按钮区
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: ModalProps) {
  /** ESC 键关闭模态框 */
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    /** 防止背景滚动 */
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-deep-ocean/50 backdrop-blur-sm" />

      {/* 模态框内容 */}
      <div
        className="relative bg-paper rounded-lg shadow-lift w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-deep-ocean/10">
            <h3 className="text-lg font-serif font-semibold text-deep-ocean">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-paper-dark transition-colors text-deep-ocean/60 hover:text-deep-ocean"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {children}
        </div>

        {/* 底部按钮区 */}
        {footer && (
          <div className="px-6 py-4 border-t border-deep-ocean/10 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
