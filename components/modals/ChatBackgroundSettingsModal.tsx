
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Checkbox from '../Checkbox';
import Input from '../Input';
import { useSettings } from '../../contexts/SettingsContext';
import { ChatBackgroundSettings } from '../../types';
import { DEFAULT_CHAT_BACKGROUND_SETTINGS } from '../../constants';
import { usePublicToast } from '../../contexts/ToastContext';

interface ChatBackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBackgroundSettingsModal: React.FC<ChatBackgroundSettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings } = useSettings();
  const { addToast } = usePublicToast();
  
  // Local state for this modal, initialized from global settings
  const [localChatBgSettings, setLocalChatBgSettings] = useState<ChatBackgroundSettings>(
    settings.chatBackground || DEFAULT_CHAT_BACKGROUND_SETTINGS
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // For uploaded file preview

  useEffect(() => {
    if (isOpen) {
      // Sync local state with global settings when modal opens
      const currentGlobalSettings = settings.chatBackground || DEFAULT_CHAT_BACKGROUND_SETTINGS;
      setLocalChatBgSettings(currentGlobalSettings);
      setImagePreviewUrl(null); // Reset preview on open
    }
  }, [isOpen, settings.chatBackground]);

  const handleSettingChange = (field: keyof ChatBackgroundSettings, value: any) => {
    setLocalChatBgSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLocalChatBgSettings(prev => ({ ...prev, imageUrl: result }));
        setImagePreviewUrl(result); // Show preview of uploaded image
      };
      reader.readAsDataURL(file);
    } else {
      // If file is deselected, clear only if it was the source of the current imageUrl
      // This logic can be tricky if user types URL then uploads. For now, just clear preview.
      setImagePreviewUrl(null);
    }
  };
  
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    handleSettingChange('imageUrl', url);
    setImagePreviewUrl(null); // Clear file preview if URL is typed
  };

  const handleSaveChanges = () => {
    setSettings(prevGlobalSettings => ({
      ...prevGlobalSettings,
      chatBackground: localChatBgSettings,
    }));
    addToast({ message: "Đã cập nhật cài đặt hình nền chat.", type: 'success' });
    onClose();
  };

  const handleClearChatBackground = () => {
    const clearedSettings = { 
        ...DEFAULT_CHAT_BACKGROUND_SETTINGS, 
        enabled: localChatBgSettings.enabled // Keep enabled state, reset others
    };
    setLocalChatBgSettings(clearedSettings);
    setImagePreviewUrl(null);
    addToast({ message: "Đã xóa cài đặt hình nền và trở về mặc định.", type: 'info' });
  };
  
  // Determine effective preview: uploaded file > URL from settings > default
  const effectivePreview = imagePreviewUrl || localChatBgSettings.imageUrl;


  if (!isOpen) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title="Tùy Chỉnh Hình Nền Chat" size="lg"> {/* Changed size to lg */}
      <div className="space-y-6 pt-2">
        <Checkbox
          label="Bật hình nền tùy chỉnh cho Chat"
          checked={localChatBgSettings.enabled}
          onChange={(e) => handleSettingChange('enabled', e.target.checked)}
          wrapperClass="mb-5"
        />

        {localChatBgSettings.enabled && (
          <div className="space-y-5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 animate-fadeIn">
            {effectivePreview && (
                 <div className="mb-3">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Xem Trước Hình Nền:</label>
                    <div 
                        className="w-full h-40 rounded-md border border-border-light dark:border-border-dark bg-slate-200 dark:bg-slate-700 bg-center bg-no-repeat"
                        style={{ 
                            backgroundImage: `url(${effectivePreview})`,
                            backgroundSize: localChatBgSettings.opacity < 0.3 || localChatBgSettings.blur > 5 ? 'cover' : 'contain', // Adjust based on visibility
                            filter: `blur(${localChatBgSettings.blur}px)`,
                            opacity: localChatBgSettings.opacity
                         }}
                        title="Xem trước hình nền với độ mờ và độ trong suốt hiện tại"
                    >
                       {!effectivePreview && <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-16">Chưa có hình ảnh</p>}
                    </div>
                 </div>
            )}

            <div>
                <label htmlFor="chat-bg-file-upload" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Tải Ảnh Từ Máy:</label>
                <input 
                    id="chat-bg-file-upload"
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageFileChange} 
                    className="block w-full text-sm text-slate-500 dark:text-slate-400
                            file:mr-4 file:py-2 file:px-3
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary-light/20 file:text-primary dark:file:bg-primary-dark/30 dark:file:text-primary-light
                            hover:file:bg-primary-light/30 dark:hover:file:bg-primary-dark/40
                            focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:focus:ring-primary-dark"
                />
            </div>

            <Input
              label="Hoặc nhập URL Hình Nền:"
              value={localChatBgSettings.imageUrl}
              onChange={handleImageUrlChange}
              placeholder="Dán URL hình ảnh tại đây..."
              leftIcon={<i className="fas fa-link text-gray-400"></i>}
            />
            
            <div>
              <label htmlFor="chat-bg-blur" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                Độ Mờ Hình Nền (Blur): {localChatBgSettings.blur}px
              </label>
              <input
                id="chat-bg-blur"
                type="range"
                min="0"
                max="20"
                step="1"
                value={localChatBgSettings.blur}
                onChange={(e) => handleSettingChange('blur', parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-primary-light"
              />
            </div>

            <div>
              <label htmlFor="chat-bg-opacity" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                Độ Trong Suốt Hình Nền (Opacity): {Math.round(localChatBgSettings.opacity * 100)}%
              </label>
              <input
                id="chat-bg-opacity"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={localChatBgSettings.opacity}
                onChange={(e) => handleSettingChange('opacity', parseFloat(e.target.value))}
                className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-primary-light"
              />
            </div>

            <Button 
              variant="danger" 
              size="sm" 
              onClick={handleClearChatBackground}
              leftIcon={<i className="fas fa-times-circle"></i>}
              className="mt-2"
            >
              Xóa Hình Nền và Thiết Lập Mặc Định
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="lg">Hủy</Button>
        <Button onClick={handleSaveChanges} size="lg" variant="primary">Lưu Thay Đổi</Button>
      </div>
    </Modal>
  );
};

export default ChatBackgroundSettingsModal;
