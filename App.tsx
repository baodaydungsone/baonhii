

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ModalType, Settings, NSFWPreferences, AIChatCharacter, ChatMessage, StoredAIChatCharacter, SavedCharacterSlotInfo, UserProfile, ActiveTab, Theme, StoredCharacterWithHistory, AIGroupChat } from './types'; 
import { APP_TITLE, LOCAL_STORAGE_CHARACTERS_KEY, LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX, LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX, LOCAL_STORAGE_GROUPS_KEY } from './constants';
import ApiSettingsModal from './components/modals/ApiSettingsModal';
import NsfwSettingsModal from './components/modals/NsfwSettingsModal';
import GeneralSettingsModal from './components/modals/GeneralSettingsModal';
import UserProfileModal from './components/modals/UserProfileModal';
import GuideModal from './components/modals/GuideModal';
import CharacterCreationModal from './components/modals/CharacterCreationModal';
import GroupCreationModal from './components/modals/GroupCreationModal';
import CharacterManagementAndImportModal from './components/modals/CharacterManagementAndImportModal'; 
import ChatBackgroundSettingsModal from './components/modals/ChatBackgroundSettingsModal';
import ImagePreviewModal from './components/modals/ImagePreviewModal';
import MainAppSettingsModal from './components/modals/MainAppSettingsModal'; 
import AiSettingsModal from './components/modals/AiSettingsModal'; 
import ChangelogModal from './components/modals/ChangelogModal'; 
import ThemeCustomizationModal from './components/modals/ThemeCustomizationModal';

import { useSettings } from './contexts/SettingsContext';
import { usePublicToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { StorageService } from './services/StorageService';

import CharacterListScreen from './pages/CharacterListScreen';
import ChatScreen from './pages/ChatScreen';
import HistoryScreen from './pages/HistoryScreen'; 
import ProfileScreen from './pages/ProfileScreen'; 
import NotebookScreen from './pages/NotebookScreen'; // New
import KnowledgeBaseScreen from './pages/KnowledgeBaseScreen'; // New
import BottomNavigationBar from './components/BottomNavigationBar'; 

import { Capacitor } from '@capacitor/core';
import { App as CapacitorAppPlugin, PluginListenerHandle } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; 

const App: React.FC = () => {
  const { settings, nsfwSettings, userProfile, setSettings, isSettingsLoaded } = useSettings(); 
  const { addToast } = usePublicToast();
  const [activeModal, setActiveModal] = useState<ModalType>(ModalType.None);
  const [editingCharacter, setEditingCharacter] = useState<AIChatCharacter | null>(null);
  const [editingGroup, setEditingGroup] = useState<AIGroupChat | null>(null);
  const [modalData, setModalData] = useState<any>(null); 

  const [characters, setCharacters] = useState<AIChatCharacter[]>([]);
  const [groups, setGroups] = useState<AIGroupChat[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<AIChatCharacter | null>(null);
  const [activeGroup, setActiveGroup] = useState<AIGroupChat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[] | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  const activeChatId = useMemo(() => activeCharacter?.id || activeGroup?.id, [activeCharacter, activeGroup]);
  const activeChatIdRef = useRef(activeChatId);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Load characters and groups from StorageService (IndexedDB)
  useEffect(() => {
    const loadAppData = async () => {
      if (!isSettingsLoaded) return;
      setIsLoadingApp(true);
      
      try {
        // 1. Migration from localStorage for characters, groups, and history
        const migrationDone = localStorage.getItem('indexeddb_app_data_migration_done');
        if (!migrationDone) {
          console.log("Starting app data migration to IndexedDB...");
          
          // Migrate Characters
          const charsJson = localStorage.getItem(LOCAL_STORAGE_CHARACTERS_KEY);
          if (charsJson) await StorageService.setItem(LOCAL_STORAGE_CHARACTERS_KEY, JSON.parse(charsJson));
          
          // Migrate Groups
          const groupsJson = localStorage.getItem(LOCAL_STORAGE_GROUPS_KEY);
          if (groupsJson) await StorageService.setItem(LOCAL_STORAGE_GROUPS_KEY, JSON.parse(groupsJson));
          
          // Migrate Chat History (this is the big one)
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX)) {
              const historyJson = localStorage.getItem(key);
              if (historyJson) await StorageService.setItem(key, JSON.parse(historyJson));
            }
          }
          
          localStorage.setItem('indexeddb_app_data_migration_done', 'true');
          console.log("App data migration completed.");
        }

        // 2. Load Characters
        const storedCharacters = await StorageService.getItem<any[]>(LOCAL_STORAGE_CHARACTERS_KEY);
        if (storedCharacters) {
          const parsedCharacters = storedCharacters.filter(
            (char: any) => char && typeof char.id === 'string' && typeof char.name === 'string'
          ).map((char: any) => ({
            id: char.id,
            name: char.name,
            avatarUrl: char.avatarUrl || '',
            animatedAvatarUrl: char.animatedAvatarUrl || '',
            personality: char.personality || '',
            greetingMessage: char.greetingMessage || '',
            voiceTone: char.voiceTone || '',
            exampleResponses: char.exampleResponses || '',
            systemPrompt: char.systemPrompt || '',
            createdAt: char.createdAt || new Date().toISOString(),
            updatedAt: char.updatedAt || new Date().toISOString(),
          }));
          setCharacters(parsedCharacters);
        }

        // 3. Load Groups
        const storedGroups = await StorageService.getItem<any[]>(LOCAL_STORAGE_GROUPS_KEY);
        if (storedGroups) {
          const parsedGroups = storedGroups.filter(
              (group: any) => group && typeof group.id === 'string' && typeof group.name === 'string' && Array.isArray(group.memberIds)
          ).map((group: any) => ({
              id: group.id,
              name: group.name,
              avatarUrl: group.avatarUrl || '',
              memberIds: group.memberIds,
              createdAt: group.createdAt || new Date().toISOString(),
              updatedAt: group.updatedAt || new Date().toISOString(),
          }));
          setGroups(parsedGroups);
        }
      } catch (error) {
        console.error("Error loading data from IndexedDB:", error);
        addToast({ message: "Lỗi khi tải dữ liệu đã lưu.", type: 'error' });
      } finally {
        setIsLoadingApp(false);
      }
    };

    loadAppData();
  }, [addToast, isSettingsLoaded]);

  // Save characters to StorageService (IndexedDB)
  useEffect(() => {
    if (isLoadingApp) return;
    StorageService.setItem(LOCAL_STORAGE_CHARACTERS_KEY, characters).catch(e => {
        console.error("Error saving characters to IndexedDB:", e);
    });
  }, [characters, isLoadingApp]);

  // Save groups to StorageService (IndexedDB)
  useEffect(() => {
    if (isLoadingApp) return;
    StorageService.setItem(LOCAL_STORAGE_GROUPS_KEY, groups).catch(e => {
        console.error("Error saving groups to IndexedDB:", e);
    });
  }, [groups, isLoadingApp]);

  // Load chat history for active character or group
  useEffect(() => {
    const loadHistory = async () => {
      if (activeChatId) {
        setChatMessages(null);
        
        try {
          const historyKey = LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + activeChatId;
          const storedHistory = await StorageService.getItem<any[]>(historyKey);
          if (storedHistory) {
            const parsedHistory: ChatMessage[] = storedHistory.map((msg: any) => ({
                ...msg,
                chatId: msg.chatId || msg.characterId || activeChatId,
            }));
            setChatMessages(parsedHistory);
          } else {
            setChatMessages([]);
          }
        } catch (error) {
          console.error(`Error loading chat history for ${activeChatId}:`, error);
          addToast({ message: `Lỗi tải lịch sử chat.`, type: 'error' });
          setChatMessages([]);
        }
      } else {
        setChatMessages(null);
      }
    };

    loadHistory();
  }, [activeChatId, addToast]);

  // Save chat history for active chat
  useEffect(() => {
    if (activeChatId && chatMessages !== null) {
      const historyKey = LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + activeChatId;
      const isCorrectChat = chatMessages.length === 0 || chatMessages.every(m => m.chatId === activeChatId);
      
      if (isCorrectChat) {
        if (chatMessages.length > 0) {
          StorageService.setItem(historyKey, chatMessages).catch(e => {
            console.error("Error saving history to IndexedDB:", e);
          });
        } else {
          StorageService.removeItem(historyKey);
        }
      }
    }
  }, [chatMessages, activeChatId]);

  const deselectChat = useCallback(() => {
    setActiveCharacter(null);
    setActiveGroup(null);
    setActiveTab('home'); 
  }, []);

  // Capacitor App back button handling
  useEffect(() => {
    let listener: PluginListenerHandle | undefined;
    if (Capacitor.isNativePlatform()) {
      listener = CapacitorAppPlugin.addListener('backButton', () => {
        if (activeModal !== ModalType.None) {
            handleCloseModal();
        } else if (activeChatIdRef.current) {
          deselectChat();
        } else if (activeTabRef.current !== 'home') {
          setActiveTab('home');
        } else {
          CapacitorAppPlugin.exitApp();
        }
      });
    }
    return () => {
      if (listener) listener.remove();
    };
  }, [deselectChat, activeModal]);

  // Handle notification tap
  const selectCharacterForChat = useCallback((character: AIChatCharacter) => {
    setActiveCharacter(character);
    setActiveGroup(null);
  }, []);

  const handleSaveCharacter = useCallback((newCharacter: AIChatCharacter) => {
    let isUpdate = false;
    setCharacters(prev => {
      const existingIndex = prev.findIndex(c => c.id === newCharacter.id);
      if (existingIndex > -1) {
        isUpdate = true;
        const updatedChars = [...prev];
        updatedChars[existingIndex] = newCharacter;
        return updatedChars;
      } else {
        isUpdate = false;
        return [...prev, newCharacter];
      }
    });

    if (isUpdate) {
        addToast({ message: `Đã cập nhật nhân vật: ${newCharacter.name}`, type: 'success' });
        if (activeCharacter?.id === newCharacter.id) {
            setActiveCharacter(newCharacter);
        }
    } else {
        addToast({ message: `Đã tạo nhân vật mới: ${newCharacter.name}`, type: 'success' });
    }
    
    setActiveModal(ModalType.None);
    setEditingCharacter(null);
  }, [addToast, activeCharacter]);

  const handleDeleteCharacter = useCallback((characterId: string) => {
    setCharacters(prev => prev.filter(c => c.id !== characterId));
    setGroups(prevGroups => prevGroups.map(g => ({
        ...g,
        memberIds: g.memberIds.filter(id => id !== characterId),
    })));
    StorageService.removeItem(LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + characterId);
    if (activeCharacter?.id === characterId) {
      setActiveCharacter(null);
      setActiveTab('home'); 
    }
  }, [activeCharacter]);
  
  const handleSaveGroup = useCallback((group: AIGroupChat) => {
    let isUpdate = false;
    setGroups(prev => {
        const existingIndex = prev.findIndex(g => g.id === group.id);
        if (existingIndex > -1) {
            isUpdate = true;
            const updatedGroups = [...prev];
            updatedGroups[existingIndex] = group;
            return updatedGroups;
        } else {
            isUpdate = false;
            return [...prev, group];
        }
    });

    if (isUpdate) {
        addToast({ message: `Đã cập nhật nhóm: ${group.name}`, type: 'success' });
        if (activeGroup?.id === group.id) {
            setActiveGroup(group);
        }
    } else {
        addToast({ message: `Đã tạo nhóm mới: ${group.name}`, type: 'success' });
    }

    setActiveModal(ModalType.None);
    setEditingGroup(null);
  }, [addToast, activeGroup]);

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    await StorageService.removeItem(LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + groupId);
    if (activeGroup?.id === groupId) {
        setActiveGroup(null);
        setActiveTab('home');
    }
  }, [activeGroup]);

  const selectGroupForChat = useCallback((group: AIGroupChat) => {
    if (group.memberIds.length === 0) {
        addToast({message: "Nhóm này không có thành viên nào. Vui lòng thêm thành viên để bắt đầu chat.", type: 'warning'});
        return;
    }
    setActiveGroup(group);
    setActiveCharacter(null);
  }, [addToast]);

  const saveCharacterToSlot = useCallback(async (characterToSave: AIChatCharacter, slotIdentifier: string): Promise<boolean> => {
    if (!characterToSave || !slotIdentifier) {
      addToast({ message: 'Tên slot không hợp lệ hoặc không có nhân vật để lưu.', type: 'error' });
      return false;
    }
    const normalizedSlotIdentifier = slotIdentifier.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!normalizedSlotIdentifier) {
      addToast({ message: 'Tên slot không hợp lệ sau khi chuẩn hóa.', type: 'error' });
      return false;
    }

    const savedSlotData: SavedCharacterSlotInfo = {
      character: characterToSave,
      savedAt: new Date().toISOString(),
    };
    const key = LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX + normalizedSlotIdentifier;
    try {
      await StorageService.setItem(key, savedSlotData);
      return true;
    } catch (error) {
      console.error(`Error saving character to IndexedDB slot "${normalizedSlotIdentifier}":`, error);
      addToast({ message: `Lỗi khi lưu nhân vật vào slot "${slotIdentifier}".`, type: 'error', duration: 8000 });
      return false;
    }
  }, [addToast]);

  const loadCharacterFromSlot = useCallback(async (slotKey: string) => {
    const slotInfo = await StorageService.getItem<SavedCharacterSlotInfo>(slotKey);
    if (slotInfo) {
        try {
            if (slotInfo.character) {
                const loadedCharacterFromSlot: AIChatCharacter = {
                    ...slotInfo.character,
                    avatarUrl: slotInfo.character.avatarUrl || '',
                    animatedAvatarUrl: slotInfo.character.animatedAvatarUrl || '',
                    voiceTone: slotInfo.character.voiceTone || '',
                    exampleResponses: slotInfo.character.exampleResponses || '',
                    systemPrompt: slotInfo.character.systemPrompt || '',
                    createdAt: slotInfo.character.createdAt || new Date().toISOString(),
                    updatedAt: slotInfo.character.updatedAt || new Date().toISOString(),
                };

                setCharacters(prevChars => {
                    const existingIndex = prevChars.findIndex(c => c.id === loadedCharacterFromSlot.id);
                    let newChars = [...prevChars];
                    if (existingIndex !== -1) {
                        newChars[existingIndex] = loadedCharacterFromSlot;
                    } else {
                        newChars.push(loadedCharacterFromSlot);
                    }
                    return newChars;
                });
                addToast({message: `Đã tải nhân vật "${loadedCharacterFromSlot.name}" từ slot.`, type: 'success'});
            } else {
                addToast({message: `Dữ liệu trong slot không hợp lệ.`, type: 'error'});
            }
        } catch (error) {
            addToast({message: `Lỗi khi đọc slot.`, type: 'error'});
            console.error(`Error parsing slot ${slotKey}:`, error);
        }
    } else {
        addToast({message: `Không tìm thấy slot.`, type: 'warning'});
    }
  }, [addToast]);

  const handleSaveCharacterToJsonFile = useCallback(async (characterToSave: AIChatCharacter) => {
    if (!characterToSave) {
        addToast({message: "Không có dữ liệu nhân vật để lưu.", type: 'error'});
        return;
    }
    try {
        const characterJson = JSON.stringify(characterToSave, null, 2);
        const charNameNormalized = characterToSave.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ai_character';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
        const fileName = `${charNameNormalized}_${timestamp}.json`;

        if (Capacitor.isNativePlatform()) {
            await Filesystem.writeFile({ path: fileName, data: characterJson, directory: Directory.Documents, encoding: Encoding.UTF8 });
            addToast({message: `Đã lưu "${characterToSave.name}" vào thư mục Documents!`, type: 'success', icon: 'fas fa-save', duration: 7000});
        } else {
            const blob = new Blob([characterJson], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            addToast({message: `Định nghĩa nhân vật "${characterToSave.name}" đã bắt đầu tải xuống!`, type: 'success', icon: 'fas fa-file-download'});
        }
    } catch (error) {
        console.error("Error saving character to JSON:", error);
        addToast({message: "Lỗi khi lưu nhân vật ra file JSON.", type: 'error'});
    }
  }, [addToast]);

  const handleSaveAllCharactersToJsonFile = useCallback(async () => {
    if (characters.length === 0) {
        addToast({message: "Không có nhân vật nào để lưu.", type: 'warning'});
        return;
    }
    try {
        const validCharactersToSave = characters.filter(char => char && char.id && char.name);
        if (validCharactersToSave.length === 0) {
            addToast({message: "Không có dữ liệu nhân vật hợp lệ nào để lưu.", type: 'warning'});
            return;
        }
        
        const allCharactersJson = JSON.stringify(validCharactersToSave, null, 2);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
        const fileName = `all_ai_characters_${timestamp}.json`;

        if (Capacitor.isNativePlatform()) {
            await Filesystem.writeFile({ path: fileName, data: allCharactersJson, directory: Directory.Documents, encoding: Encoding.UTF8 });
            addToast({message: `Đã lưu ${validCharactersToSave.length} nhân vật vào thư mục Documents!`, type: 'success', icon: 'fas fa-archive', duration: 7000});
        } else {
            const blob = new Blob([allCharactersJson], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            addToast({message: `Tất cả ${validCharactersToSave.length} nhân vật hợp lệ đã bắt đầu tải xuống!`, type: 'success', icon: 'fas fa-archive'});
        }
    } catch (error) {
        console.error("Error saving all characters to JSON:", error);
        addToast({message: "Lỗi khi lưu tất cả nhân vật ra file JSON.", type: 'error'});
    }
  }, [characters, addToast]);

  const handleSaveAllCharactersAndHistoryToJsonFile = useCallback(async () => {
    if (characters.length === 0) {
        addToast({ message: "Không có nhân vật nào để lưu.", type: 'warning' });
        return;
    }
    try {
        const dataToExport: StoredCharacterWithHistory[] = [];
        let charactersWithHistoryCount = 0;

        for (const char of characters) {
            if (char && char.id && char.name) {
                const historyKey = LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + char.id;
                const chatHistory = await StorageService.getItem<ChatMessage[]>(historyKey) || [];
                
                dataToExport.push({ character: char, chatHistory });
                if (chatHistory.length > 0) {
                    charactersWithHistoryCount++;
                }
            }
        }

        if (dataToExport.length === 0) {
            addToast({ message: "Không có dữ liệu nhân vật hợp lệ nào để lưu.", type: 'warning' });
            return;
        }
        
        const allDataJson = JSON.stringify(dataToExport, null, 2);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
        const fileName = `all_characters_with_history_${timestamp}.json`;

        if (Capacitor.isNativePlatform()) {
            await Filesystem.writeFile({ path: fileName, data: allDataJson, directory: Directory.Documents, encoding: Encoding.UTF8 });
            addToast({message: `Đã lưu ${dataToExport.length} nhân vật (trong đó ${charactersWithHistoryCount} có lịch sử chat) vào Documents!`, type: 'success', icon: 'fas fa-book-medical', duration: 7000});
        } else {
            const blob = new Blob([allDataJson], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            addToast({message: `Toàn bộ ${dataToExport.length} nhân vật (và lịch sử nếu có) đã bắt đầu tải xuống!`, type: 'success', icon: 'fas fa-book-medical'});
        }
    } catch (error) {
        console.error("Error saving all characters and history to JSON:", error);
        addToast({message: "Lỗi khi lưu tất cả nhân vật và lịch sử chat ra file JSON.", type: 'error'});
    }
  }, [characters, addToast]);

  const handleLoadCharacterDataFromFile = useCallback(async (parsedJson: any) => {
    let importedCharCount = 0;
    let importedHistoryCount = 0;
    let updatedCharCount = 0;
    let newCharCount = 0;

    const processSingleCharacterWithHistory = async (item: StoredCharacterWithHistory) => {
        if (item.character && item.character.id && item.character.name && item.character.personality) {
            const existingIndex = characters.findIndex(c => c.id === item.character.id);
             const characterToImport: AIChatCharacter = {
                ...item.character,
                avatarUrl: item.character.avatarUrl || '',
                animatedAvatarUrl: item.character.animatedAvatarUrl || '',
                voiceTone: item.character.voiceTone || '',
                exampleResponses: item.character.exampleResponses || '',
                systemPrompt: item.character.systemPrompt || '',
                createdAt: item.character.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            handleSaveCharacter(characterToImport); 
            if (existingIndex > -1) updatedCharCount++; else newCharCount++;

            if (item.chatHistory && Array.isArray(item.chatHistory) && item.chatHistory.length > 0) {
                 const migratedChatHistory = item.chatHistory.map((msg: any) => ({
                    ...msg,
                    chatId: msg.chatId || msg.characterId || item.character.id,
                }));
                const historyKey = LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + item.character.id;
                await StorageService.setItem(historyKey, migratedChatHistory);
                importedHistoryCount++;
            }
            importedCharCount++;
        } else {
            console.warn("Skipping invalid character entry in StoredCharacterWithHistory array:", item);
        }
    };
    
    const processSingleCharacter = (charData: AIChatCharacter) => {
        if (charData && charData.id && charData.name && charData.personality) {
            const existingIndex = characters.findIndex(c => c.id === charData.id);
             const characterToImport: AIChatCharacter = {
                ...charData,
                avatarUrl: charData.avatarUrl || '',
                animatedAvatarUrl: charData.animatedAvatarUrl || '',
                voiceTone: charData.voiceTone || '',
                exampleResponses: charData.exampleResponses || '',
                systemPrompt: charData.systemPrompt || '',
                createdAt: charData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            handleSaveCharacter(characterToImport);
            if (existingIndex > -1) updatedCharCount++; else newCharCount++;
            importedCharCount++;
        } else {
            console.warn("Skipping invalid character object in AIChatCharacter array:", charData);
        }
    };

    if (Array.isArray(parsedJson)) {
        if (parsedJson.length > 0 && parsedJson[0].character && typeof parsedJson[0].chatHistory !== 'undefined') {
            for (const item of parsedJson) {
                await processSingleCharacterWithHistory(item as StoredCharacterWithHistory);
            }
            if (importedCharCount > 0) {
              addToast({ message: `Đã xử lý ${importedCharCount} nhân vật (${newCharCount} mới, ${updatedCharCount} cập nhật). ${importedHistoryCount} có lịch sử chat được khôi phục.`, type: 'success', duration: 8000 });
            } else {
              addToast({ message: 'Không tìm thấy nhân vật hợp lệ nào trong file (định dạng có lịch sử chat).', type: 'warning' });
            }
        } else {
            parsedJson.forEach(charData => processSingleCharacter(charData as AIChatCharacter));
             if (importedCharCount > 0) {
              addToast({ message: `Đã xử lý ${importedCharCount} nhân vật (${newCharCount} mới, ${updatedCharCount} cập nhật) (không có lịch sử chat từ file này).`, type: 'success', duration: 8000 });
            } else {
              addToast({ message: 'Không tìm thấy nhân vật hợp lệ nào trong file (định dạng chỉ nhân vật).', type: 'warning' });
            }
        }
    } else if (parsedJson && parsedJson.character && typeof parsedJson.chatHistory !== 'undefined') {
        await processSingleCharacterWithHistory(parsedJson as StoredCharacterWithHistory);
        if (importedCharCount > 0) {
          addToast({ message: `Đã nhập 1 nhân vật (${newCharCount} mới, ${updatedCharCount} cập nhật) ${importedHistoryCount > 0 ? 'và lịch sử chat của họ' : '(không có lịch sử chat kèm theo)'}.`, type: 'success', duration: 8000 });
        }
    } else if (parsedJson && parsedJson.id && parsedJson.name && parsedJson.personality) {
        processSingleCharacter(parsedJson as AIChatCharacter);
    } else {
      addToast({ message: 'Cấu trúc file JSON không hợp lệ. Phải là một nhân vật, một mảng các nhân vật, hoặc một mảng các nhân vật kèm lịch sử chat.', type: 'error', duration: 7000 });
    }
  }, [handleSaveCharacter, addToast, characters]);


  // Theme and Font Size application
  useEffect(() => {
    const applyCurrentTheme = (themeToApply: Theme, osPreferenceDark: boolean) => {
      if (themeToApply === Theme.System) {
        document.documentElement.classList.toggle('dark', osPreferenceDark);
      } else {
        document.documentElement.classList.toggle('dark', themeToApply === Theme.Dark);
      }
      document.body.style.fontSize = `${settings.fontSize}px`;
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let currentOsPrefersDark = mediaQuery.matches;
    applyCurrentTheme(settings.theme, currentOsPrefersDark);

    const handleOsThemeChange = (event: MediaQueryListEvent) => {
      currentOsPrefersDark = event.matches;
      if (settings.theme === Theme.System) { 
        applyCurrentTheme(Theme.System, currentOsPrefersDark);
      }
    };
    
    mediaQuery.addEventListener('change', handleOsThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleOsThemeChange);
    };
  }, [settings.theme, settings.fontSize]);

  const handleOpenModal = useCallback((modalType: ModalType, data?: any) => {
    let finalData: any = data ? { ...data } : {};

    if (modalType === ModalType.CharacterCreation) {
        setEditingCharacter(data as AIChatCharacter);
    } else if (modalType === ModalType.GroupCreation) {
        setEditingGroup(data as AIGroupChat);
    }
    
    setModalData(finalData);
    setActiveModal(modalType);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(ModalType.None);
    if (editingCharacter) {
      setEditingCharacter(null);
    }
    if (editingGroup) {
      setEditingGroup(null);
    }
    setModalData(null);
  }, [editingCharacter, editingGroup]);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
  }, []);

  // Handle app launch via file (deep linking)
  useEffect(() => {
    let appUrlOpenListener: PluginListenerHandle | undefined;

    if (Capacitor.isNativePlatform()) {
      const handleFileOpen = async (event: { url: string }) => {
        const url = event.url;
        addToast({ message: 'Đang mở file...', type: 'info' });

        if (url && url.toLowerCase().endsWith('.json')) {
          try {
            const fileReadResult = await Filesystem.readFile({ path: url, encoding: Encoding.UTF8 });
            const jsonString = fileReadResult.data as string;
            if (jsonString) {
              const parsedJson = JSON.parse(jsonString);
              handleLoadCharacterDataFromFile(parsedJson);
              addToast({ message: 'Đã xử lý xong file JSON được mở.', type: 'success', duration: 5000 });
              deselectChat();
            } else {
              throw new Error("Không đọc được dữ liệu từ file.");
            }
          } catch (error: any) {
            console.error('Error processing opened JSON file:', error);
            addToast({ message: `Lỗi khi mở file JSON: ${error.message || 'Không thể xử lý file.'}`, type: 'error', duration: 10000 });
            deselectChat();
          }
        } else if (url) {
          addToast({ message: `Không phải file JSON hợp lệ: ${url}`, type: 'warning', duration: 7000 });
          deselectChat();
        }
      };
      
      appUrlOpenListener = CapacitorAppPlugin.addListener('appUrlOpen', handleFileOpen);
    }

    return () => {
      if (appUrlOpenListener) {
        appUrlOpenListener.remove();
      }
    };
  }, [addToast, handleLoadCharacterDataFromFile, deselectChat]);


  if (isLoadingApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-xl text-primary dark:text-primary-light bg-background-light dark:bg-background-dark p-4">
        <svg className="animate-spin h-12 w-12 text-primary dark:text-primary-light mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-semibold">Đang tải ứng dụng AI Chat...</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Chuẩn bị cho những cuộc trò chuyện thú vị!</p>
      </div>
    );
  }

  const renderModal = () => {
    switch (activeModal) {
      case ModalType.APISettings:
        return <ApiSettingsModal isOpen={true} onClose={handleCloseModal} />;
      case ModalType.AISettings: 
        return <AiSettingsModal 
                  isOpen={true} 
                  onClose={handleCloseModal} 
                  onSendTestNotification={modalData?.onSendTestNotification}
                />;
      case ModalType.NSFWSettings:
        return <NsfwSettingsModal isOpen={true} onClose={handleCloseModal} />;
      case ModalType.GeneralSettings:
        return <GeneralSettingsModal isOpen={true} onClose={handleCloseModal} openSpecificModal={handleOpenModal} />;
      case ModalType.UserProfileSettings:
        return <UserProfileModal isOpen={true} onClose={handleCloseModal} />;
      case ModalType.Guide:
        return <GuideModal onClose={handleCloseModal} />;
      case ModalType.CharacterCreation:
        return <CharacterCreationModal
                  isOpen={true}
                  onClose={handleCloseModal}
                  onSaveCharacter={handleSaveCharacter}
                  existingCharacter={editingCharacter}
                />;
       case ModalType.GroupCreation:
        return <GroupCreationModal
                  isOpen={true}
                  onClose={handleCloseModal}
                  onSaveGroup={handleSaveGroup}
                  allCharacters={characters}
                  existingGroup={editingGroup}
                />;
      case ModalType.CharacterManagementAndImportModal:
        return <CharacterManagementAndImportModal
                  isOpen={true}
                  onClose={handleCloseModal}
                  characters={characters}
                  groups={groups}
                  onSaveCharacterToJsonFile={handleSaveCharacterToJsonFile}
                  onSaveAllCharactersToJsonFile={handleSaveAllCharactersToJsonFile} 
                  onSaveAllCharactersAndHistoryToJsonFile={handleSaveAllCharactersAndHistoryToJsonFile} 
                  onSaveCharacterToSlot={saveCharacterToSlot}
                  onLoadCharacterFromFile={handleLoadCharacterDataFromFile} 
                  onLoadCharacterFromSlot={loadCharacterFromSlot} 
                  onDeleteCharacter={handleDeleteCharacter}
                  onDeleteGroup={handleDeleteGroup}
                  onEditGroup={(group) => { handleCloseModal(); handleOpenModal(ModalType.GroupCreation, group); }}
               />;
      case ModalType.ChatBackgroundSettings:
        return <ChatBackgroundSettingsModal
                  isOpen={true}
                  onClose={handleCloseModal}
                />;
      case ModalType.ImagePreview: 
        return <ImagePreviewModal
                  isOpen={true}
                  onClose={handleCloseModal}
                  imageUrl={modalData?.imageUrl || ''} 
                />;
      case ModalType.MainAppSettings:
        return <MainAppSettingsModal
                  isOpen={true}
                  onClose={handleCloseModal}
                  openSpecificModal={handleOpenModal}
                />;
      case ModalType.Changelog: 
        return <ChangelogModal
                  isOpen={true}
                  onClose={handleCloseModal}
                />;
      case ModalType.ThemeCustomization:
          return <ThemeCustomizationModal 
                    isOpen={true}
                    onClose={handleCloseModal}
                  />;
      default:
        return null;
    }
  };

  const isChatting = !!activeChatId;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ease-in-out`}>
      <ToastContainer />
      {renderModal()}
      
      {isChatting ? (
        chatMessages === null ? (
          <div className="flex flex-col items-center justify-center h-screen bg-background-light dark:bg-background-dark">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">Đang tải lịch sử trò chuyện...</p>
          </div>
        ) : (
          <ChatScreen
            character={activeCharacter}
            group={activeGroup}
            allCharacters={characters}
            messages={chatMessages}
            setMessages={setChatMessages as React.Dispatch<React.SetStateAction<ChatMessage[]>>}
            onBack={deselectChat}
            openModal={handleOpenModal}
            nsfwSettings={nsfwSettings}
            userProfile={userProfile}
          />
        )
      ) : (
        <div className="flex flex-col flex-grow"> 
          <main className="flex-grow pb-14"> 
            {activeTab === 'home' && (
              <CharacterListScreen
                characters={characters}
                groups={groups}
                onSelectCharacter={selectCharacterForChat}
                onSelectGroup={selectGroupForChat}
                openModal={handleOpenModal}
                userProfile={userProfile}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileScreen openModal={handleOpenModal} onTabChange={handleTabChange} />
            )}
            {activeTab === 'history' && (
              <HistoryScreen 
                characters={characters} 
                groups={groups}
                onSelectCharacter={selectCharacterForChat}
                onSelectGroup={selectGroupForChat}
              />
            )}
            {activeTab === 'notebook' && (
              <NotebookScreen characters={characters} />
            )}
            {activeTab === 'knowledge' && (
              <KnowledgeBaseScreen characters={characters} />
            )}
          </main>
          <BottomNavigationBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onCreate={() => handleOpenModal(ModalType.CharacterCreation)}
          />
        </div>
      )}
    </div>
  );
};

export default App;
