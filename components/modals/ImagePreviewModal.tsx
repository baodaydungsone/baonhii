
import React from 'react';
import Modal from '../Modal';
import { DEFAULT_AVATAR_PATH } from '../../constants';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;

  const effectiveImageUrl = imageUrl || DEFAULT_AVATAR_PATH;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl" containerClass="!p-0">
      <div className="flex justify-center items-center w-full h-full"> {/* Ensure centering within the no-padding container */}
        <img
          src={effectiveImageUrl}
          alt="Xem trước ảnh" 
          className="max-w-full max-h-[90vh] object-contain rounded-lg" // Removed shadow, adjusted max-h slightly
          onError={(e) => {
            if (e.currentTarget.src !== DEFAULT_AVATAR_PATH) {
                e.currentTarget.src = DEFAULT_AVATAR_PATH;
            }
          }}
        />
      </div>
    </Modal>
  );
};

export default ImagePreviewModal;
