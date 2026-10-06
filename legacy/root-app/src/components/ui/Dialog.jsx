import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

export const Dialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false,
  children
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="w-8 h-8 text-rose-400" />;
      case 'success':
        return <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
      case 'info':
        return <Info className="w-8 h-8 text-cyan-400" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-amber-400" />;
    }
  };

  const getConfirmVariant = () => {
    switch (type) {
      case 'danger':
        return 'danger';
      case 'success':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" showClose={!isLoading}>
      <div className="flex flex-col items-center text-center p-2">
        <div className="p-3 bg-slate-800/80 rounded-2xl mb-4 border border-slate-700/60">
          {getIcon()}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        {description && <p className="text-sm text-slate-300 leading-relaxed mb-4">{description}</p>}
        {children}
        <div className="flex items-center gap-3 w-full mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={getConfirmVariant()}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Dialog;
