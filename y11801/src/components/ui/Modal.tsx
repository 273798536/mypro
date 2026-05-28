import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  maskClosable?: boolean;
  closable?: boolean;
  width?: string;
  className?: string;
}

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maskClosable = true,
  closable = true,
  width = '500px',
  className,
}: ModalProps) => {
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={() => maskClosable && onClose()}
      />
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-2xl animate-scaleIn',
          className
        )}
        style={{ width, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)' }}
      >
        {(title || closable) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
              )}
              {description && (
                <p className="text-sm text-slate-500 mt-1">{description}</p>
              )}
            </div>
            {closable && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors -mr-1 -mt-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ConfirmModalProps extends Omit<ModalProps, 'footer' | 'children'> {
  content: ReactNode;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ComponentProps<typeof Button>;
  cancelButtonProps?: React.ComponentProps<typeof Button>;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmLoading?: boolean;
}

export const ConfirmModal = ({
  open,
  onClose,
  title = '确认操作',
  content,
  okText = '确认',
  cancelText = '取消',
  okButtonProps,
  cancelButtonProps,
  onOk,
  onCancel,
  confirmLoading = false,
  ...rest
}: ConfirmModalProps) => {
  const handleOk = async () => {
    await onOk?.();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={title}
      width="420px"
      {...rest}
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel} {...cancelButtonProps}>
            {cancelText}
          </Button>
          <Button
            onClick={handleOk}
            loading={confirmLoading}
            {...okButtonProps}
          >
            {okText}
          </Button>
        </>
      }
    >
      <div className="py-2">{content}</div>
    </Modal>
  );
};
