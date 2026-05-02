
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import Dropdown from '../Dropdown';
import RadioGroup from '../RadioGroup'; 
import { useSettings } from '../../contexts/SettingsContext';
import { GEMINI_API_KEY_URL } from '../../constants';
import { ApiProvider } from '../../types';
import { usePublicToast } from '../../contexts/ToastContext';
import { testProxyConnection } from '../../services/GeminiService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyItem: React.FC<{apiKey: string, onRemove: () => void, isOnlyKey: boolean}> = ({apiKey, onRemove, isOnlyKey}) => {
    const maskKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };
    return (
        <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-700 rounded-md">
            <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{maskKey(apiKey)}</span>
            <Button 
                variant="danger" 
                size="xs" 
                onClick={onRemove}
                title="Xóa API Key này"
                className="!p-1.5"
                disabled={isOnlyKey && (apiKey === "" || apiKey === undefined)} 
            >
                <i className="fas fa-times"></i>
            </Button>
        </div>
    );
};

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    setSettings, 
    // addApiKey, // Direct use of setApiKeys or validateAndSaveGeminiKeys is preferred
    // removeApiKey,
    validateAndSaveGeminiKeys,
  } = useSettings();
  const { addToast } = usePublicToast();

  const predefinedModels = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro Exp' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B' },
    { value: 'custom', label: 'Tùy chỉnh (Nhập tên model)' }
  ];

  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>(settings.apiProvider);
  
  const [localGeminiKeys, setLocalGeminiKeys] = useState<string[]>([]);
  const [newGeminiKeyInput, setNewGeminiKeyInput] = useState('');
  const [localGeminiModel, setLocalGeminiModel] = useState(settings.geminiModel || 'gemini-2.5-flash');
  const [isCustomModel, setIsCustomModel] = useState(!predefinedModels.some(m => m.value === (settings.geminiModel || 'gemini-2.5-flash')) && (settings.geminiModel || 'gemini-2.5-flash') !== 'custom');
  const [localGeminiProxyUrl, setLocalGeminiProxyUrl] = useState(settings.geminiProxyUrl || '');
  const [localGeminiProxyPass, setLocalGeminiProxyPass] = useState(settings.geminiProxyPass || '');
  
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [overallProviderStatus, setOverallProviderStatus] = useState<'idle' | 'success' | 'error'>('idle');


  useEffect(() => {
    if (isOpen) {
      setSelectedProvider(settings.apiProvider);
      setLocalGeminiKeys([...settings.geminiCustomApiKeys]);
      setLocalGeminiModel(settings.geminiModel || 'gemini-2.5-flash');
      setLocalGeminiProxyUrl(settings.geminiProxyUrl || '');
      setLocalGeminiProxyPass(settings.geminiProxyPass || '');
      setNewGeminiKeyInput('');
      setIsProcessingSave(false);
      
      if (settings.apiProvider === 'geminiCustom') {
        if (settings.apiKeyStatus === 'valid') setOverallProviderStatus('success');
        else if (settings.apiKeyStatus === 'invalid' && settings.geminiCustomApiKeys.length > 0) setOverallProviderStatus('error');
        else setOverallProviderStatus('idle');
      } else { // geminiDefault
        setOverallProviderStatus('success'); // Default is always considered successful selection initially
      }
    }
  }, [isOpen, settings]);

  const handleProviderChange = (provider: string) => {
    const newProvider = provider as ApiProvider;
    setSelectedProvider(newProvider);
    setOverallProviderStatus('idle'); 
    if (newProvider === 'geminiCustom' && settings.apiKeyStatus !== 'valid') setOverallProviderStatus('idle');
    if (newProvider === 'geminiDefault') setOverallProviderStatus('success');
  };

  const handleAddGeminiKeyToList = () => {
    if (newGeminiKeyInput.trim() && !localGeminiKeys.includes(newGeminiKeyInput.trim())) {
      setLocalGeminiKeys(prev => [...prev, newGeminiKeyInput.trim()]);
    }
    setNewGeminiKeyInput('');
    setOverallProviderStatus('idle'); 
  };

  const handleRemoveGeminiKeyFromList = (keyToRemove: string) => {
    setLocalGeminiKeys(prev => prev.filter(k => k !== keyToRemove));
    setOverallProviderStatus('idle'); 
  };

  const handleTestProxy = async () => {
    if (!localGeminiProxyUrl.trim()) {
      addToast({ message: "Vui lòng nhập URL Proxy trước khi kiểm tra.", type: 'warning' });
      return;
    }
    
    setIsTestingProxy(true);
    const result = await testProxyConnection(localGeminiProxyUrl, localGeminiProxyPass, localGeminiModel);
    addToast({ message: result.message, type: result.success ? 'success' : 'error', duration: 5000 });
    setIsTestingProxy(false);
  };

  const handleSaveSettings = async () => {
    setIsProcessingSave(true);
    let success = true;
    let providerStatus: 'valid' | 'invalid' | 'unknown' | 'default' = 'unknown';

    if (selectedProvider === 'geminiCustom') {
      const hasProxy = localGeminiProxyUrl.trim();
      if (localGeminiKeys.length === 0 && !hasProxy) {
        await validateAndSaveGeminiKeys([], localGeminiModel, localGeminiProxyUrl, localGeminiProxyPass); 
        providerStatus = 'invalid'; 
        success = false; 
      } else {
        success = await validateAndSaveGeminiKeys(localGeminiKeys, localGeminiModel, localGeminiProxyUrl, localGeminiProxyPass);
        // If success is false but we have a proxy, we still consider the provider "valid" for use
        providerStatus = (success || hasProxy) ? 'valid' : 'invalid';
      }
      setOverallProviderStatus(providerStatus === 'valid' ? 'success' : 'error');
    } else { // geminiDefault
      setSettings(s => ({ ...s, apiProvider: 'geminiDefault', useDefaultAPI: true, apiKeyStatus: 'default', geminiModel: localGeminiModel, geminiProxyUrl: localGeminiProxyUrl, geminiProxyPass: localGeminiProxyPass }));
      success = true; 
      providerStatus = 'default';
      setOverallProviderStatus('success');
    }
    
    if (selectedProvider !== 'geminiDefault') { // geminiCustom
        setSettings(s => ({ ...s, apiProvider: selectedProvider, useDefaultAPI: false }));
    }


    if (success || localGeminiProxyUrl.trim()) {
      let toastMessage = "Đã lưu cài đặt API.";
      if (selectedProvider === 'geminiDefault') {
        toastMessage = "Đã chuyển sang dùng API Key mặc định của ứng dụng.";
      } else if (success) { 
        toastMessage = `Đã lưu API Keys cho Gemini (Key riêng). Ít nhất một key hợp lệ.`;
      } else {
        toastMessage = `Đã lưu cấu hình Proxy. Lưu ý: Không tìm thấy API Key hợp lệ.`;
      }
      
      addToast({ message: toastMessage, type: success ? 'success' : 'warning', duration: 7000 });
      setTimeout(onClose, (providerStatus === 'valid' || providerStatus === 'default' || localGeminiProxyUrl.trim()) ? 1200 : 0);
    } else {
      addToast({ message: `Không có API key nào hợp lệ cho Gemini (Key riêng). Vui lòng kiểm tra lại.`, type: 'error'});
    }
    setIsProcessingSave(false);
  };
  
  const providerOptions = [
    { value: 'geminiDefault', label: 'Gemini (Mặc định ứng dụng)', description: 'Sử dụng Gemini Flash. Khuyến nghị cho người mới.' },
    { value: 'geminiCustom', label: 'Gemini (Key riêng)', description: 'Sử dụng (các) API Key Gemini của riêng bạn.' },
  ];

  const renderGeminiKeyManagementSection = () => {
    const isCurrentProvider = selectedProvider === 'geminiCustom';
    let statusToDisplay: 'idle' | 'success' | 'error' = 'idle';

    if (settings.apiProvider === 'geminiCustom') {
        statusToDisplay = settings.apiKeyStatus === 'valid' ? 'success' : (settings.apiKeyStatus === 'invalid' && settings.geminiCustomApiKeys.length > 0 ? 'error' : 'idle');
    }
    if (isCurrentProvider && overallProviderStatus !== 'idle' && settings.apiProvider === selectedProvider) {
        statusToDisplay = overallProviderStatus;
    }

    return (
      <div className={`transition-all duration-300 ease-in-out ${!isCurrentProvider ? 'opacity-50 max-h-0 overflow-hidden pointer-events-none' : 'opacity-100 max-h-[1000px] pt-4 mt-3 border-t border-dashed'}`}>
        <h4 className="text-sm font-medium text-text-light dark:text-text-dark mb-2">Quản lý API Keys Gemini:</h4>
        <div className="flex items-start gap-2 mb-3">
          <Input
            label={`Thêm API Key Gemini:`}
            type="password"
            value={newGeminiKeyInput}
            onChange={(e) => setNewGeminiKeyInput(e.target.value)}
            placeholder="Dán API Key Gemini của bạn (ví dụ: AIza...)"
            disabled={isProcessingSave || !isCurrentProvider}
            leftIcon={<i className="fas fa-plus text-gray-400"></i>}
            wrapperClass="flex-grow !mb-0"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGeminiKeyToList();}}}
          />
          <Button onClick={handleAddGeminiKeyToList} disabled={isProcessingSave || !isCurrentProvider || !newGeminiKeyInput.trim()} size="md" className="mt-[26px] !px-3" title={`Thêm key Gemini`}>Thêm</Button>
        </div>
        
        {localGeminiKeys.length > 0 && (
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {localGeminiKeys.map((key, index) => (
              <ApiKeyItem key={`Gemini-${index}-${key.slice(-4)}`} apiKey={key} onRemove={() => handleRemoveGeminiKeyFromList(key)} isOnlyKey={localGeminiKeys.length === 1} />
            ))}
          </div>
        )}
        {localGeminiKeys.length === 0 && isCurrentProvider && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 my-2"><i className="fas fa-exclamation-circle mr-1"></i>Không có API key nào được cấu hình cho Gemini (Key riêng).</p>
        )}

        {statusToDisplay === 'success' && isCurrentProvider && <p className="text-sm text-green-600 dark:text-green-400 mt-1"><i className="fas fa-check-circle mr-1"></i>Ít nhất một Key Gemini hợp lệ và đã được lưu!</p>}
        {statusToDisplay === 'error' && isCurrentProvider && localGeminiKeys.length > 0 && <p className="text-sm text-red-600 dark:text-red-400 mt-1"><i className="fas fa-times-circle mr-1"></i>Tất cả Keys Gemini đều không hợp lệ. Vui lòng kiểm tra lại.</p>}
        {statusToDisplay === 'idle' && isCurrentProvider && localGeminiKeys.length > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1"><i className="fas fa-question-circle mr-1"></i>Trạng thái keys Gemini chưa rõ hoặc đã thay đổi. Hãy Lưu để kiểm tra.</p>
        )}
         <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Lấy API Key Gemini tại: <a href={GEMINI_API_KEY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{GEMINI_API_KEY_URL}</a>
        </p>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thiết Lập API Key" size="md"> {/* Changed size to md */}
      <div className="space-y-5">
        <RadioGroup
          label="Chọn nhà cung cấp API:"
          name="apiProvider"
          options={providerOptions}
          selectedValue={selectedProvider}
          onChange={handleProviderChange}
        />

        {selectedProvider === 'geminiDefault' && (
             <div className="p-3 bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700/60 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-200">
                    <i className="fas fa-info-circle mr-1.5"></i>API Key mặc định (Gemini) của ứng dụng đang được sử dụng.
                </p>
             </div>
        )}
        
        <div className="space-y-3 mt-4">
          <Dropdown
            label="Model Gemini:"
            options={predefinedModels}
            value={isCustomModel ? 'custom' : localGeminiModel}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                setIsCustomModel(true);
                setLocalGeminiModel('');
              } else {
                setIsCustomModel(false);
                setLocalGeminiModel(val);
              }
            }}
            disabled={isProcessingSave}
          />
          {isCustomModel && (
            <Input
              label="Tên Model Tùy Chỉnh:"
              value={localGeminiModel}
              onChange={(e) => setLocalGeminiModel(e.target.value)}
              placeholder="Ví dụ: gemini-2.5-flash"
              disabled={isProcessingSave}
            />
          )}
          <Input
            label="API Proxy URL (Tùy chọn):"
            value={localGeminiProxyUrl}
            onChange={(e) => setLocalGeminiProxyUrl(e.target.value)}
            placeholder="Ví dụ: https://api.proxy.com"
            disabled={isProcessingSave}
          />
          <div className="flex items-end gap-2">
            <Input
              label="API Proxy Pass/Key (Tùy chọn):"
              value={localGeminiProxyPass}
              onChange={(e) => setLocalGeminiProxyPass(e.target.value)}
              placeholder="Nhập mã proxy..."
              type="password"
              disabled={isProcessingSave}
              wrapperClass="flex-grow !mb-0"
            />
            <Button 
                variant="outline" 
                size="md" 
                onClick={handleTestProxy} 
                disabled={isProcessingSave || isTestingProxy || !localGeminiProxyUrl.trim()}
                isLoading={isTestingProxy}
                className="whitespace-nowrap"
            >
                {isTestingProxy ? "Đang thử..." : "Kết nối"}
            </Button>
          </div>
        </div>

        {renderGeminiKeyManagementSection()}

      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="md" disabled={isProcessingSave}>Hủy</Button>
        <Button 
            onClick={handleSaveSettings} 
            isLoading={isProcessingSave}
            disabled={isProcessingSave || 
                        (selectedProvider === 'geminiCustom' && localGeminiKeys.length === 0 && !localGeminiProxyUrl.trim())
                     }
            size="md"
            variant="primary"
        >
          {isProcessingSave ? "Đang xử lý..." : "Lưu & Đóng"}
        </Button>
      </div>
    </Modal>
  );
};

export default ApiSettingsModal;
