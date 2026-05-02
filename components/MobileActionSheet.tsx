
import React, { ReactNode, useEffect } from 'react';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const MobileActionSheet: React.FC<MobileActionSheetProps> = ({ isOpen, onClose, title = "Thực Hiện Hành Động", children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('mobile-action-sheet-open-body');
    } else {
      document.body.classList.remove('mobile-action-sheet-open-body');
      // Only reset body overflow if no other modal (assumed by Modal.tsx's own logic) is open.
      // This is a simplified check. A robust system might use a global overlay counter.
      if (!document.querySelector('.fixed.inset-0.z-\\[100\\].opacity-100[role="dialog"]')) {
         document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.classList.remove('mobile-action-sheet-open-body');
      if (!document.querySelector('.fixed.inset-0.z-\\[100\\].opacity-100[role="dialog"]')) {
         document.body.style.overflow = '';
      }
    };
  }, [isOpen]);


  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] transition-opacity duration-300 ease-out
                    ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet Content */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-card-light dark:bg-card-dark shadow-top-xlarge rounded-t-2xl z-[160] transition-transform duration-300 ease-out
                    transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}
                    max-h-[70vh] flex flex-col`} // Increased max-height
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-sheet-title"
      >
        <div className="flex items-center justify-between p-3.5 border-b border-border-light dark:border-border-dark flex-shrink-0">
          <h3 id="action-sheet-title" className="text-md font-semibold text-text-light dark:text-text-dark">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors rounded-full p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Đóng bảng hành động"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        <div className="overflow-y-auto p-3.5 custom-scrollbar flex-grow">
          {children}
        </div>
      </div>
    </>
  );
};

export default MobileActionSheet;
