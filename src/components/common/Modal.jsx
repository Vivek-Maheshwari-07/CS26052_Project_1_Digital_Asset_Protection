import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, icon: Icon, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content Box */}
      <div
        className={`relative w-full ${maxWidth} bg-white border border-[#E5E5E5] rounded-xl shadow-lg overflow-hidden z-10`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5E5] bg-white">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-[#111111]" />}
            <h3 className="text-base font-bold text-[#111111]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#666666] hover:text-[#111111] hover:bg-gray-100 transition-colors focus:outline-none"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
