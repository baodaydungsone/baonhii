
import React, { ReactNode, useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | '2xl' | '3xl';
  footer?: ReactNode;
  containerClass?: string;
}

const Modal: React.FC<ModalProps> = React.memo(({ isOpen, onClose, title, children, size = 'md', footer, containerClass = '' }) => {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    let parentOverflow: string | null = null;
    if (isOpen) {
      setIsShowing(true);
      parentOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden'; 
    } else {
      const timer = setTimeout(() => {
        setIsShowing(false);
        const otherModalsOpen = document.querySelectorAll('.fixed.inset-0.z-\\[100\\].opacity-100').length > 1; 
        if (!otherModalsOpen) {
          document.body.style.overflow = parentOverflow || '';
        }
      }, 300); 
      return () => clearTimeout(timer);
    }
    return () => {
       const otherModalsStillOpen = document.querySelectorAll('.fixed.inset-0.z-\\[100\\].opacity-100').length > 0;
       if (!otherModalsStillOpen) {
         document.body.style.overflow = parentOverflow || '';
       }
    };
  }, [isOpen]);

  if (!isShowing && !isOpen) return null;

  let sizeClass = '';
  let dialogHeightClass = 'max-h-[85vh]'; // Reduced max height

  switch (size) {
    case 'sm': sizeClass = 'max-w-sm'; break;
    case 'md': sizeClass = 'max-w-md'; break;
    case 'lg': sizeClass = 'max-w-lg'; break;
    case 'xl': sizeClass = 'max-w-xl'; break;
    case '2xl': sizeClass = 'max-w-2xl'; break;
    case '3xl': sizeClass = 'max-w-3xl'; break;
    case 'full': 
      sizeClass = 'w-full h-full'; 
      dialogHeightClass = 'h-full max-h-full rounded-none sm:rounded-xl sm:h-[90vh] sm:max-h-[90vh]'; // Reduced max height for full
      break; 
    default: sizeClass = 'max-w-md';
  }

  const animationClass = isOpen ? 'animate-fadeIn' : 'animate-fadeOut';
  const backdropPadding = size === 'full' ? 'p-0 sm:p-3' : 'p-3'; // Reduced padding

  // Determine if header should be rendered
  const showHeader = title && title.trim() !== "";

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm ${backdropPadding} transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={showHeader ? "modal-title" : undefined}
    >
      <div 
        className={`bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full ${sizeClass} ${dialogHeightClass} flex flex-col overflow-hidden ${animationClass} ${containerClass}`}
        onClick={(e) => e.stopPropagation()} 
      >
        {showHeader && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border-light dark:border-border-dark flex-shrink-0"> {/* Reduced padding */}
            <h3 id="modal-title" className="text-lg sm:text-xl font-semibold text-text-light dark:text-text-dark">{title}</h3> {/* Adjusted text size for consistency */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close modal"
            >
              <i className="fas fa-times fa-lg"></i>
            </button>
          </div>
        )}
        <div className={`overflow-y-auto flex-grow custom-scrollbar ${showHeader ? 'p-3 sm:p-4' : (containerClass ? '' : 'p-3 sm:p-4')}`}> {/* Reduced padding, conditional if no header and no custom container class managing padding */}
          {children}
        </div>
        {footer && (
          <div className={`border-t border-border-light dark:border-border-dark flex-shrink-0 p-3 sm:p-4`}> {/* Reduced padding */}
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default Modal;
