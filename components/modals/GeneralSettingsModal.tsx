import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Dropdown from '../Dropdown';
import { useSettings } from '../../contexts/SettingsContext';
import { Theme, ThemePalette, ModalType } from '../../types'; 
import { usePublicToast } from '../../contexts/ToastContext';
import { THEME_PALETTES } from '../../constants';

interface GeneralSettingsModalProps {
  isOpen: boolean; 
  onClose: () => void;
  openSpecificModal: (modalType: ModalType) => void;
}

const GeneralSettingsModal: React.FC<GeneralSettingsModalProps> = ({ isOpen, onClose, openSpecificModal }) => {
  const { settings, setSettings } = useSettings();
  const { addToast } = usePublicToast();
  
  const [tempSettings, setTempSettings] = useState(settings);

  useEffect(() => {
    if (isOpen) {
        setTempSettings(settings);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    setSettings(tempSettings);
    addToast({ message: "Đã lưu cài đặt giao diện.", type: 'success' });
    onClose();
  };

  const themeOptions = [
    { value: Theme.Light, label: 'Sáng (Light Mode)' },
    { value: Theme.Dark, label: 'Tối (Dark Mode)' },
    { value: Theme.System, label: 'Theo hệ thống' },
  ];

  const languageOptions = [
    { value: 'vi', label: 'Tiếng Việt (Mặc định)' },
  ];

  const displaySizeOptions = [
    { value: 12, label: 'Rất nhỏ (12px)' },
    { value: 14, label: 'Nhỏ (14px)' },
    { value: 16, label: 'Vừa - Mặc định (16px)' },
    { value: 18, label: 'Lớn (18px)' },
    { value: 20, label: 'Rất Lớn (20px)' },
  ];
  
  const handlePaletteChange = (palette: ThemePalette) => {
    setTempSettings(prev => ({...prev, themePalette: palette}));
  };

  const PaletteSwatch: React.FC<{
      paletteKey: ThemePalette;
      isActive: boolean;
      onClick: () => void;
      isCustom?: boolean;
    }> = ({ paletteKey, isActive, onClick, isCustom = false }) => {
    const palette = isCustom ? {name: 'Tùy Chỉnh', primary: tempSettings.customThemeColors.primary, secondary: tempSettings.customThemeColors.secondary} : THEME_PALETTES[paletteKey];

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left p-2.5 rounded-lg border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card-light dark:focus-visible:ring-offset-card-dark focus-visible:ring-current
                        ${isActive ? 'border-transparent ring-2 ring-primary dark:ring-primary-light shadow-lg' : 'border-border-light dark:border-border-dark hover:border-gray-400 dark:hover:border-gray-500'}`}
        >
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex shadow-inner">
                    <div className="w-1/2 h-full" style={{ backgroundColor: palette.primary }}></div>
                    <div className="w-1/2 h-full" style={{ backgroundColor: palette.secondary }}></div>
                </div>
                <div className="flex-grow">
                    <p className="font-semibold text-sm text-text-light dark:text-text-dark">{palette.name}</p>
                </div>
                {isCustom && <i className="fas fa-edit text-slate-500 dark:text-slate-400 text-xs"></i>}
            </div>
        </button>
    );
  };


  if (!isOpen) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title="Cài Đặt Giao Diện & Chung" size="md">
      <div className="space-y-6 pt-2">
        <Dropdown
          label="Chế độ màu:"
          options={themeOptions}
          value={tempSettings.theme}
          onChange={(e) => setTempSettings(prev => ({ ...prev, theme: e.target.value as Theme }))}
          wrapperClass="mb-5"
        />
        <Dropdown
          label="Ngôn ngữ:"
          options={languageOptions}
          value={tempSettings.language}
          onChange={(e) => setTempSettings(prev => ({ ...prev, language: e.target.value }))}
          disabled 
          wrapperClass="mb-5 opacity-70"
        />
        <Dropdown
          label="Kích thước hiển thị ứng dụng:"
          options={displaySizeOptions}
          value={tempSettings.fontSize.toString()}
          onChange={(e) => setTempSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value, 10) }))}
          wrapperClass="mb-2"
        />
         <p className="text-xs text-slate-500 dark:text-slate-400 px-1 -mt-1">
            Thay đổi kích thước này sẽ ảnh hưởng đến toàn bộ ứng dụng.
         </p>
        
        <div className="pt-4 border-t border-border-light dark:border-border-dark">
            <h3 className="text-md font-semibold text-text-light dark:text-text-dark mb-3">
                <i className="fas fa-palette mr-2 text-secondary dark:text-secondary-light"></i>Bảng màu
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(THEME_PALETTES).map(key => (
                    <PaletteSwatch 
                        key={key}
                        paletteKey={key as ThemePalette}
                        isActive={tempSettings.themePalette === key}
                        onClick={() => handlePaletteChange(key as ThemePalette)}
                    />
                ))}
                <PaletteSwatch
                    paletteKey="custom"
                    isActive={tempSettings.themePalette === 'custom'}
                    onClick={() => handlePaletteChange('custom')}
                    isCustom={true}
                />
            </div>
             {tempSettings.themePalette === 'custom' && (
                <div className="mt-4">
                    <Button 
                        variant="primary" 
                        fullWidth 
                        size="md" 
                        onClick={() => { onClose(); openSpecificModal(ModalType.ThemeCustomization); }}
                        leftIcon={<i className="fas fa-swatchbook"></i>}
                    >
                        Tùy Chỉnh Bảng Màu Cá Nhân...
                    </Button>
                </div>
            )}
        </div>

      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="lg">Hủy</Button>
        <Button onClick={handleSave} size="lg" variant="primary">Lưu Cài Đặt</Button>
      </div>
    </Modal>
  );
};

export default GeneralSettingsModal;