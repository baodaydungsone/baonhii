import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Settings, Theme, NSFWPreferences, UserProfile, ChatBackgroundSettings, ApiProvider, ThemePalette, CustomThemeColors } from '../types';
import { 
  LOCAL_STORAGE_SETTINGS_KEY, LOCAL_STORAGE_NSFW_KEY, 
  LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS, 
  LOCAL_STORAGE_USER_PROFILE_KEY, DEFAULT_USER_NAME, 
  DEFAULT_USER_BIO, DEFAULT_CHAT_BACKGROUND_SETTINGS,
  THEME_PALETTES, DEFAULT_CUSTOM_THEME_COLORS
} from '../constants';
import { validateApiKey as validateGeminiSingleKey } from '../services/GeminiService'; 
import { StorageService } from '../services/StorageService';

// --- Color Manipulation Helpers ---
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
};
const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

const changeColorLightness = (hex: string, percent: number): string => {
    if (!hex || !hex.startsWith('#')) return hex;
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    let { r, g, b } = rgb;
    const factor = 1 + percent / 100;
    r = clamp(Math.round(r * factor), 0, 255);
    g = clamp(Math.round(g * factor), 0, 255);
    b = clamp(Math.round(b * factor), 0, 255);

    const toHex = (c: number) => ('00' + c.toString(16)).slice(-2);
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

interface SettingsContextProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  nsfwSettings: NSFWPreferences;
  setNsfwSettings: React.Dispatch<React.SetStateAction<NSFWPreferences>>;
  
  addApiKey: (provider: 'gemini', key: string) => void;
  removeApiKey: (provider: 'gemini', keyToRemove: string) => void;
  setApiKeys: (provider: 'gemini', keys: string[]) => void;
  
  validateAndSaveGeminiKeys: (keys: string[], model?: string, proxyUrl?: string, proxyPass?: string) => Promise<boolean>;

  userProfile: UserProfile; 
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>; 
  isSettingsLoaded: boolean;
}

const defaultSettings: Settings = {
  theme: Theme.Dark,
  themePalette: 'blue',
  customThemeColors: DEFAULT_CUSTOM_THEME_COLORS,
  apiProvider: 'geminiDefault',
  apiKeyStatus: 'default', 
  language: 'vi',
  fontSize: 16,
  useDefaultAPI: true, 
  chatBackground: DEFAULT_CHAT_BACKGROUND_SETTINGS,
  geminiCustomApiKeys: [],
  geminiModel: 'gemini-2.5-flash',
  geminiProxyUrl: '',
  geminiProxyPass: '',
  enableWebSearch: false,
  enableMemory: true, 
  enableEmotions: true, 
  allowUnlimitedGroupMembers: false,
  enableGroupMemory: false,
  enableTimeAwareness: true,
  enableDateAwareness: true,
  enableNotebookContext: true, // New
  enableRAGContext: true, // New
};

const defaultNSFWPrefs: NSFWPreferences = {
  enabled: false,
  eroticaLevel: 'none',
  violenceLevel: 'none',
  darkContentLevel: 'none',
  customPrompt: '', 
};

const defaultUserProfile: UserProfile = { 
  name: DEFAULT_USER_NAME,
  avatarUrl: '', 
  bio: DEFAULT_USER_BIO,
};

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [nsfwSettings, setNsfwSettings] = useState<NSFWPreferences>(defaultNSFWPrefs);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);

  // Load all settings from StorageService (IndexedDB)
  useEffect(() => {
    const loadAllSettings = async () => {
      // 1. Migration from localStorage if needed
      const migrationDone = localStorage.getItem('indexeddb_migration_done');
      if (!migrationDone) {
        console.log("Starting migration from localStorage to IndexedDB...");
        const keysToMigrate = [
          LOCAL_STORAGE_SETTINGS_KEY,
          LOCAL_STORAGE_NSFW_KEY,
          LOCAL_STORAGE_USER_PROFILE_KEY,
          LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS
        ];
        
        for (const key of keysToMigrate) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              await StorageService.setItem(key, JSON.parse(value));
            } catch (e) {
              console.error(`Migration failed for key ${key}:`, e);
            }
          }
        }
        localStorage.setItem('indexeddb_migration_done', 'true');
        console.log("Migration completed.");
      }

      // 2. Load Settings
      try {
        const savedSettings = await StorageService.getItem<any>(LOCAL_STORAGE_SETTINGS_KEY);
        if (savedSettings) {
          setSettings(prev => {
            const loadedSettings = { ...prev };
            loadedSettings.theme = [Theme.Light, Theme.Dark, Theme.System].includes(savedSettings.theme) ? savedSettings.theme : defaultSettings.theme;
            loadedSettings.themePalette = savedSettings.themePalette || defaultSettings.themePalette;
            loadedSettings.customThemeColors = { ...defaultSettings.customThemeColors, ...(savedSettings.customThemeColors || {}) };
            loadedSettings.apiProvider = ['geminiDefault', 'geminiCustom'].includes(savedSettings.apiProvider) ? savedSettings.apiProvider : defaultSettings.apiProvider;
            loadedSettings.apiKeyStatus = ['unknown', 'valid', 'invalid', 'default'].includes(savedSettings.apiKeyStatus) ? savedSettings.apiKeyStatus : defaultSettings.apiKeyStatus;
            loadedSettings.language = savedSettings.language || defaultSettings.language;
            loadedSettings.fontSize = typeof savedSettings.fontSize === 'number' ? savedSettings.fontSize : defaultSettings.fontSize;
            loadedSettings.chatBackground = { ...defaultSettings.chatBackground, ...(savedSettings.chatBackground || {}) };
            
            const geminiKeys = Array.isArray(savedSettings.geminiCustomApiKeys) ? savedSettings.geminiCustomApiKeys : (typeof savedSettings.userApiKey === 'string' && savedSettings.userApiKey ? [savedSettings.userApiKey] : []);
            loadedSettings.geminiCustomApiKeys = geminiKeys.filter(k => typeof k === 'string' && k.trim() !== '');
            
            loadedSettings.geminiModel = savedSettings.geminiModel || defaultSettings.geminiModel;
            loadedSettings.geminiProxyUrl = savedSettings.geminiProxyUrl || defaultSettings.geminiProxyUrl;
            loadedSettings.geminiProxyPass = savedSettings.geminiProxyPass || defaultSettings.geminiProxyPass;

            loadedSettings.enableWebSearch = typeof savedSettings.enableWebSearch === 'boolean' ? savedSettings.enableWebSearch : defaultSettings.enableWebSearch;
            loadedSettings.enableMemory = typeof savedSettings.enableMemory === 'boolean' ? savedSettings.enableMemory : defaultSettings.enableMemory;
            loadedSettings.enableEmotions = typeof savedSettings.enableEmotions === 'boolean' ? savedSettings.enableEmotions : defaultSettings.enableEmotions;
            loadedSettings.allowUnlimitedGroupMembers = typeof savedSettings.allowUnlimitedGroupMembers === 'boolean' ? savedSettings.allowUnlimitedGroupMembers : defaultSettings.allowUnlimitedGroupMembers;
            loadedSettings.enableGroupMemory = typeof savedSettings.enableGroupMemory === 'boolean' ? savedSettings.enableGroupMemory : defaultSettings.enableGroupMemory;
            loadedSettings.enableTimeAwareness = typeof savedSettings.enableTimeAwareness === 'boolean' ? savedSettings.enableTimeAwareness : defaultSettings.enableTimeAwareness;
            loadedSettings.enableDateAwareness = typeof savedSettings.enableDateAwareness === 'boolean' ? savedSettings.enableDateAwareness : defaultSettings.enableDateAwareness;
            loadedSettings.enableNotebookContext = typeof savedSettings.enableNotebookContext === 'boolean' ? savedSettings.enableNotebookContext : defaultSettings.enableNotebookContext;
            loadedSettings.enableRAGContext = typeof savedSettings.enableRAGContext === 'boolean' ? savedSettings.enableRAGContext : defaultSettings.enableRAGContext;
            
            return loadedSettings;
          });
        }

        // Load Legacy Gemini Keys if needed
        const legacyKeys = await StorageService.getItem<string[]>(LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS);
        if (legacyKeys && Array.isArray(legacyKeys)) {
          setSettings(prev => ({
            ...prev,
            geminiCustomApiKeys: prev.geminiCustomApiKeys.length > 0 ? prev.geminiCustomApiKeys : legacyKeys.filter(k => typeof k === 'string' && k.trim() !== '')
          }));
        }

        // Load NSFW Settings
        const savedNSFW = await StorageService.getItem<any>(LOCAL_STORAGE_NSFW_KEY);
        if (savedNSFW) {
          setNsfwSettings(prev => ({ ...prev, ...savedNSFW }));
        }

        // Load User Profile
        const savedProfile = await StorageService.getItem<any>(LOCAL_STORAGE_USER_PROFILE_KEY);
        if (savedProfile) {
          setUserProfile(prev => ({ ...prev, ...savedProfile }));
        }
      } catch (error) {
        console.error("Error loading settings from IndexedDB:", error);
      } finally {
        setIsSettingsLoaded(true);
      }
    };

    loadAllSettings();
  }, []);

  useEffect(() => {
    if (!isSettingsLoaded) return;
    const { deepSeekApiKeys, chatGptApiKeys, deepSeekApiKeyStatus, chatGptApiKeyStatus, userApiKey, ...settingsToSave } = settings as any;
    StorageService.setItem(LOCAL_STORAGE_SETTINGS_KEY, settingsToSave);
    StorageService.setItem(LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS, settings.geminiCustomApiKeys);
  }, [settings, isSettingsLoaded]);

  useEffect(() => {
    if (!isSettingsLoaded) return;
    StorageService.setItem(LOCAL_STORAGE_NSFW_KEY, nsfwSettings);
  }, [nsfwSettings, isSettingsLoaded]);

  useEffect(() => { 
    if (!isSettingsLoaded) return;
    StorageService.setItem(LOCAL_STORAGE_USER_PROFILE_KEY, userProfile);
  }, [userProfile, isSettingsLoaded]);

  useEffect(() => {
    const root = document.documentElement;
    let primaryColor: string, secondaryColor: string;
    
    if (settings.themePalette === 'custom') {
        primaryColor = settings.customThemeColors.primary;
        secondaryColor = settings.customThemeColors.secondary;
    } else {
        const palette = THEME_PALETTES[settings.themePalette] || THEME_PALETTES.blue;
        primaryColor = palette.primary;
        secondaryColor = palette.secondary;
    }

    const primaryLight = changeColorLightness(primaryColor, 15);
    const primaryDark = changeColorLightness(primaryColor, -10);
    const secondaryLight = changeColorLightness(secondaryColor, 15);
    const secondaryDark = changeColorLightness(secondaryColor, -10);

    const primaryRgb = hexToRgb(primaryColor);
    const primaryLightRgb = hexToRgb(primaryLight);
    const primaryDarkRgb = hexToRgb(primaryDark);
    const secondaryRgb = hexToRgb(secondaryColor);
    const secondaryLightRgb = hexToRgb(secondaryLight);
    const secondaryDarkRgb = hexToRgb(secondaryDark);

    if (primaryRgb) root.style.setProperty('--color-primary-DEFAULT', `${primaryRgb.r} ${primaryRgb.g} ${primaryRgb.b}`);
    if (primaryLightRgb) root.style.setProperty('--color-primary-light', `${primaryLightRgb.r} ${primaryLightRgb.g} ${primaryLightRgb.b}`);
    if (primaryDarkRgb) root.style.setProperty('--color-primary-dark', `${primaryDarkRgb.r} ${primaryDarkRgb.g} ${primaryDarkRgb.b}`);
    
    if (secondaryRgb) root.style.setProperty('--color-secondary-DEFAULT', `${secondaryRgb.r} ${secondaryRgb.g} ${secondaryRgb.b}`);
    if (secondaryLightRgb) root.style.setProperty('--color-secondary-light', `${secondaryLightRgb.r} ${secondaryLightRgb.g} ${secondaryLightRgb.b}`);
    if (secondaryDarkRgb) root.style.setProperty('--color-secondary-dark', `${secondaryDarkRgb.r} ${secondaryDarkRgb.g} ${secondaryDarkRgb.b}`);
    
  }, [settings.themePalette, settings.customThemeColors]);


  useEffect(() => {
    setSettings(currentSettings => {
      let newUseDefaultAPI = currentSettings.useDefaultAPI;
      let newApiKeyStatus = currentSettings.apiKeyStatus;

      if (currentSettings.apiProvider === 'geminiDefault') {
        newUseDefaultAPI = true;
        newApiKeyStatus = 'default';
      } else { // geminiCustom
        newUseDefaultAPI = false; 
        if (newApiKeyStatus === 'default') newApiKeyStatus = 'unknown'; 
        
        const hasProxy = currentSettings.geminiProxyUrl?.trim();
        if (currentSettings.geminiCustomApiKeys.length === 0 && !hasProxy && newApiKeyStatus !== 'invalid') {
          newApiKeyStatus = 'invalid';
        } else if (hasProxy && newApiKeyStatus === 'invalid') {
          // If we have a proxy, it shouldn't be "invalid" just because keys are missing
          newApiKeyStatus = 'valid';
        }
      }
      
      if (newUseDefaultAPI !== currentSettings.useDefaultAPI ||
          newApiKeyStatus !== currentSettings.apiKeyStatus) {
        return { 
            ...currentSettings, 
            useDefaultAPI: newUseDefaultAPI,
            apiKeyStatus: newApiKeyStatus,
        };
      }
      return currentSettings; 
    });
  }, [settings.apiProvider, settings.geminiCustomApiKeys.length]);


  const addApiKey = useCallback((provider: 'gemini', key: string) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;

    setSettings(s => {
      if (provider === 'gemini') {
        if (s.geminiCustomApiKeys.includes(trimmedKey)) return s; 
        const updatedKeys = [...s.geminiCustomApiKeys, trimmedKey];
        return { ...s, geminiCustomApiKeys: updatedKeys, apiKeyStatus: 'unknown', apiProvider: 'geminiCustom', useDefaultAPI: false };
      }
      return s;
    });
  }, []);

  const removeApiKey = useCallback((provider: 'gemini', keyToRemove: string) => {
    setSettings(s => {
      if (provider === 'gemini') {
        const newKeys = s.geminiCustomApiKeys.filter(k => k !== keyToRemove);
        return { ...s, geminiCustomApiKeys: newKeys, apiKeyStatus: newKeys.length > 0 ? 'unknown' : 'invalid' };
      }
      return s;
    });
  }, []);
  
  const setApiKeys = useCallback((provider: 'gemini', keys: string[]) => {
     const uniqueKeys = [...new Set(keys.map(k => k.trim()).filter(k => k))]; 
     setSettings(s => {
      if (provider === 'gemini') {
        return { ...s, geminiCustomApiKeys: uniqueKeys, apiKeyStatus: uniqueKeys.length > 0 ? 'unknown' : 'invalid', apiProvider: 'geminiCustom', useDefaultAPI: false };
      }
      return s;
    });
  }, []);

  const validateAndSaveGeminiKeys = async (keys: string[], model?: string, proxyUrl?: string, proxyPass?: string): Promise<boolean> => {
    const uniqueKeys = [...new Set(keys.map(k => k.trim()).filter(k => k))];
    let overallStatus: 'valid' | 'invalid' = 'invalid'; 
    let oneKeyIsValid = false;

    // If we have a proxy, we consider it valid even without custom keys
    if (proxyUrl?.trim()) {
      oneKeyIsValid = true;
      overallStatus = 'valid';
      
      // If there are keys, still validate them to catch errors early
      if (uniqueKeys.length > 0) {
        for (const key of uniqueKeys) {
          await validateGeminiSingleKey(key, proxyUrl, model, proxyPass);
        }
      }
    } else if (uniqueKeys.length > 0) {
      for (const key of uniqueKeys) {
        if (!key.trim()) continue; 
        
        let isValidSingleKey = await validateGeminiSingleKey(key, proxyUrl, model, proxyPass);
        
        if (isValidSingleKey) {
          oneKeyIsValid = true;
        }
      }
      overallStatus = oneKeyIsValid ? 'valid' : 'invalid';
    } else {
      overallStatus = 'invalid';
    }

    setSettings(s => {
      return { 
        ...s, 
        geminiCustomApiKeys: uniqueKeys, 
        apiKeyStatus: overallStatus, 
        apiProvider: 'geminiCustom', 
        useDefaultAPI: false, 
        geminiModel: model || s.geminiModel, 
        geminiProxyUrl: proxyUrl !== undefined ? proxyUrl : s.geminiProxyUrl,
        geminiProxyPass: proxyPass !== undefined ? proxyPass : s.geminiProxyPass
      };
    });
    return (oneKeyIsValid || !!proxyUrl?.trim());
  };
  

  return (
    <SettingsContext.Provider value={{ 
      settings, setSettings, 
      nsfwSettings, setNsfwSettings, 
      addApiKey, removeApiKey, setApiKeys,
      validateAndSaveGeminiKeys,
      userProfile, setUserProfile,
      isSettingsLoaded
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  const { settings, ...rest } = context;
  return { 
    settings,
    ...rest 
  };
};