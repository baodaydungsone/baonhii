
import React from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { ModalType, Theme } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { usePublicToast } from '../../contexts/ToastContext';

interface MainAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  openSpecificModal: (modalType: ModalType) => void;
}

const SettingsItemButton: React.FC<{icon: string, label: string, onClick: () => void, description?: string, iconClass?: string}> = 
    ({ icon, label, onClick, description, iconClass }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center p-2.5 sm:p-3 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600/80 rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
        <i className={`fas ${icon} ${iconClass || 'text-primary dark:text-primary-light'} text-lg sm:text-xl w-7 sm:w-8 text-center`}></i>
        <div className="ml-2.5 sm:ml-3 text-left">
            <span className="font-semibold text-xs sm:text-sm text-text-light dark:text-text-dark">{label}</span>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <i className="fas fa-chevron-right text-slate-400 dark:text-slate-500 ml-auto text-xs sm:text-sm"></i>
    </button>
);


const MainAppSettingsModal: React.FC<MainAppSettingsModalProps> = ({ isOpen, onClose, openSpecificModal }) => {
  const { settings, nsfwSettings } = useSettings(); 
  
  const nsfwCurrentlyEnabled = nsfwSettings.enabled;
  const memoryCurrentlyEnabled = settings.enableMemory;
  const emotionsCurrentlyEnabled = settings.enableEmotions;
  
  // AI Core Features status text
  const aiCoreFeaturesStatus = [];
  if (memoryCurrentlyEnabled) aiCoreFeaturesStatus.push('Nhớ');
  if (emotionsCurrentlyEnabled) aiCoreFeaturesStatus.push('C.xúc');
  const aiCoreFeaturesText = aiCoreFeaturesStatus.length > 0 ? aiCoreFeaturesStatus.join(', ') : 'Cơ bản';


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài Đặt Ứng Dụng" size="sm">
      <div className="space-y-2 sm:space-y-2.5">
        <SettingsItemButton
            icon="fa-key"
            label="Thiết Lập API Key"
            description="Quản lý API Key cho Gemini."
            onClick={() => { onClose(); openSpecificModal(ModalType.APISettings); }}
        />
        <SettingsItemButton 
            icon="fa-brain"
            label={`Tính Năng AI (${aiCoreFeaturesText})`}
            description="Trí nhớ, cảm xúc." // Updated description
            onClick={() => { onClose(); openSpecificModal(ModalType.AISettings); }}
        />
        <SettingsItemButton
            icon={nsfwCurrentlyEnabled ? "fa-fire-alt" : "fa-shield-alt"}
            iconClass={nsfwCurrentlyEnabled ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400"}
            label={`Chế Độ NSFW ${nsfwCurrentlyEnabled ? '(Đang Bật)' : '(Đang Tắt)'}`}
            description="Nội dung nhạy cảm."
            onClick={() => { onClose(); openSpecificModal(ModalType.NSFWSettings); }}
        />
        <SettingsItemButton
            icon="fa-palette"
            label="Giao Diện & Chung"
            description="Chủ đề, font, kích thước, hình nền..."
            onClick={() => { onClose(); openSpecificModal(ModalType.GeneralSettings); }}
        />
         <SettingsItemButton
            icon="fa-scroll"
            label="Nhật Ký Thay Đổi (Changelog)"
            description="Xem các tính năng mới và cập nhật."
            onClick={() => { onClose(); openSpecificModal(ModalType.Changelog); }}
        />
        <SettingsItemButton
            icon="fa-book-reader"
            label="Hướng Dẫn"
            description="Xem cách sử dụng."
            onClick={() => { onClose(); openSpecificModal(ModalType.Guide); }}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={onClose} size="md">
          Đóng
        </Button>
      </div>
    </Modal>
  );
};

export default MainAppSettingsModal;