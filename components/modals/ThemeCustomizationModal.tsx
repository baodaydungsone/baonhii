import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { useSettings } from '../../contexts/SettingsContext';
import { usePublicToast } from '../../contexts/ToastContext';
import { CustomThemeColors } from '../../types';

interface ThemeCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeCustomizationModal: React.FC<ThemeCustomizationModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings } = useSettings();
  const { addToast } = usePublicToast();
  
  const [customColors, setCustomColors] = useState<CustomThemeColors>(settings.customThemeColors);

  useEffect(() => {
    if (isOpen) {
      setCustomColors(settings.customThemeColors);
    }
  }, [isOpen, settings.customThemeColors]);

  const handleColorChange = (colorType: keyof CustomThemeColors, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [colorType]: value,
    }));
  };

  const handleSave = () => {
    setSettings(prev => ({
      ...prev,
      customThemeColors: customColors,
      themePalette: 'custom', // Ensure custom palette is active
    }));
    addToast({ message: "Đã lưu bảng màu tùy chỉnh của bạn!", type: 'success' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tùy Chỉnh Bảng Màu" size="sm">
      <div className="space-y-5 p-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Chọn màu sắc chính và phụ cho giao diện. Các sắc thái sáng/tối sẽ được tự động tạo ra.
        </p>

        <div className="flex items-center gap-4">
          <label htmlFor="primary-color-picker" className="text-sm font-medium text-text-light dark:text-text-dark flex-shrink-0">
            Màu Chính (Primary):
          </label>
          <input
            id="primary-color-picker"
            type="color"
            value={customColors.primary}
            onChange={(e) => handleColorChange('primary', e.target.value)}
            className="w-16 h-10 p-1 bg-transparent border border-border-light dark:border-border-dark rounded-md cursor-pointer"
          />
          <span className="font-mono text-sm text-slate-700 dark:text-slate-200 p-2 rounded-md bg-slate-100 dark:bg-slate-700">
            {customColors.primary}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <label htmlFor="secondary-color-picker" className="text-sm font-medium text-text-light dark:text-text-dark flex-shrink-0">
            Màu Phụ (Secondary):
          </label>
          <input
            id="secondary-color-picker"
            type="color"
            value={customColors.secondary}
            onChange={(e) => handleColorChange('secondary', e.target.value)}
            className="w-16 h-10 p-1 bg-transparent border border-border-light dark:border-border-dark rounded-md cursor-pointer"
          />
           <span className="font-mono text-sm text-slate-700 dark:text-slate-200 p-2 rounded-md bg-slate-100 dark:bg-slate-700">
            {customColors.secondary}
          </span>
        </div>

        <div>
            <h4 className="text-sm font-medium text-text-light dark:text-text-dark mb-2">Xem trước:</h4>
            <div className="p-4 bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark space-y-3">
                <Button style={{ backgroundColor: customColors.primary }}>Nút Primary</Button>
                <Button style={{ backgroundColor: customColors.secondary }}>Nút Secondary</Button>
                <p>Đây là một đoạn văn bản với một <a href="#" onClick={e => e.preventDefault()} style={{color: customColors.primary}} className="font-semibold hover:underline">liên kết màu Primary</a>.</p>
            </div>
        </div>

      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="lg">Hủy</Button>
        <Button onClick={handleSave} size="lg" style={{ backgroundColor: customColors.primary, color: 'white' }}>Lưu Màu</Button>
      </div>
    </Modal>
  );
};

export default ThemeCustomizationModal;
