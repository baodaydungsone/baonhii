
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import { AIChatCharacter, SavedCharacterSlotInfo, AIGroupChat } from '../../types';
import { LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX } from '../../constants';
import { usePublicToast } from '../../contexts/ToastContext';
import InitialAvatar from '../InitialAvatar';
import { StorageService } from '../../services/StorageService';

interface CharacterManagementAndImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: AIChatCharacter[];
  groups: AIGroupChat[];
  onSaveCharacterToJsonFile: (character: AIChatCharacter) => void;
  onSaveAllCharactersToJsonFile: () => void;
  onSaveAllCharactersAndHistoryToJsonFile: () => void;
  onSaveCharacterToSlot: (character: AIChatCharacter, slotName: string) => boolean; // Return boolean for success
  onLoadCharacterFromFile: (parsedData: any) => void;
  onLoadCharacterFromSlot: (slotKey: string) => void;
  onDeleteCharacter: (characterId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onEditGroup: (group: AIGroupChat) => void;
}

interface ExistingSlotInfo {
  key: string;
  characterName: string;
  savedAt: string;
}

const getAvailableCharacterSlots = async (): Promise<ExistingSlotInfo[]> => {
  const slots: ExistingSlotInfo[] = [];
  const allKeys = await StorageService.keys();
  
  for (const key of allKeys) {
    if (key && key.startsWith(LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX)) {
      try {
        const item = await StorageService.getItem<SavedCharacterSlotInfo>(key);
        if (item) {
          if (item.character && item.savedAt) {
            slots.push({
              key: key,
              characterName: item.character.name,
              savedAt: item.savedAt,
            });
          }
        }
      } catch (e) {
        console.warn(`Could not parse character slot ${key}:`, e);
      }
    }
  }
  return slots.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
};

const CharacterManagementAndImportModal: React.FC<CharacterManagementAndImportModalProps> = ({
  isOpen,
  onClose,
  characters,
  groups,
  onSaveCharacterToJsonFile,
  onSaveAllCharactersToJsonFile,
  onSaveAllCharactersAndHistoryToJsonFile,
  onSaveCharacterToSlot,
  onLoadCharacterFromFile,
  onLoadCharacterFromSlot,
  onDeleteCharacter,
  onDeleteGroup,
  onEditGroup,
}) => {
  const { addToast } = usePublicToast();
  const [activeTab, setActiveTab] = useState<'characters' | 'groups'>('characters');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [slotName, setSlotName] = useState<string>('');
  const [existingSlots, setExistingSlots] = useState<ExistingSlotInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const refreshSlots = useCallback(async () => {
    const slots = await getAvailableCharacterSlots();
    setExistingSlots(slots);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setSelectedFile(null);
      if (characters.length > 0) {
        const currentSelectionExists = characters.some(c => c.id === selectedCharacterId);
        if (!selectedCharacterId || !currentSelectionExists) {
            setSelectedCharacterId(characters[0].id);
            setSlotName(characters[0].name);
        } else {
            const char = characters.find(c => c.id === selectedCharacterId);
            if (char) setSlotName(char.name);
        }
      } else {
        setSelectedCharacterId('');
        setSlotName('');
      }
    }
  }, [isOpen, characters, selectedCharacterId, refreshSlots]);

  useEffect(() => {
    if (isOpen && selectedCharacterId) {
        const char = characters.find(c => c.id === selectedCharacterId);
        if (char) setSlotName(char.name);
    }
  }, [selectedCharacterId, characters, isOpen]);
  
  const getSelectedCharacter = (): AIChatCharacter | undefined => {
    return characters.find(c => c.id === selectedCharacterId);
  };

  const handleSaveToSlot = async () => {
    const characterToSave = getSelectedCharacter();
    if (!characterToSave) {
      addToast({ message: "Vui lòng chọn một nhân vật để lưu.", type: 'error' });
      return;
    }
    const trimmedSlotName = slotName.trim();
    if (!trimmedSlotName) {
      addToast({ message: "Vui lòng nhập tên cho slot lưu trữ.", type: 'warning' });
      return;
    }
    
    const normalizedSlotIdentifier = trimmedSlotName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const fullSlotKey = LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX + normalizedSlotIdentifier;
    const isOverwriting = existingSlots.some(s => s.key === fullSlotKey);

    const success = await onSaveCharacterToSlot(characterToSave, normalizedSlotIdentifier);
    
    if (success) {
      if (isOverwriting) {
        addToast({ message: `Đã ghi đè slot "${trimmedSlotName}" với nhân vật ${characterToSave.name}.`, type: 'success', icon: 'fas fa-hdd' });
      } else {
        addToast({ message: `Nhân vật ${characterToSave.name} đã được lưu vào slot mới: "${trimmedSlotName}"`, type: 'success', icon: 'fas fa-save' });
      }
      await refreshSlots();
    }
  };

  const handleDeleteLocalCharacter = (charId: string) => {
    const charToDelete = characters.find(c => c.id === charId);
    if (!charToDelete) return;

    if (window.confirm(`Bạn có chắc muốn xóa nhân vật "${charToDelete.name}" khỏi ứng dụng? Hành động này không thể hoàn tác và cũng sẽ xóa lịch sử chat của nhân vật này.`)) {
        onDeleteCharacter(charId);
        addToast({message: `Đã xóa nhân vật "${charToDelete.name}" và lịch sử chat liên quan.`, type: 'info', duration: 7000});
        if (selectedCharacterId === charId) {
            const remainingChars = characters.filter(c => c.id !== charId);
            if (remainingChars.length > 0) {
                setSelectedCharacterId(remainingChars[0].id);
                setSlotName(remainingChars[0].name);
            } else {
                setSelectedCharacterId('');
                setSlotName('');
            }
        }
    }
  };

  const handleDeleteGroupWithConfirm = (group: AIGroupChat) => {
    if (window.confirm(`Bạn có chắc muốn xóa nhóm "${group.name}"? Hành động này sẽ xóa cả lịch sử chat và không thể hoàn tác.`)) {
      onDeleteGroup(group.id);
      addToast({ message: `Đã xóa nhóm: ${group.name}`, type: 'success' });
    }
  };

  const handleSelectSlotForOverwrite = (slotInfo: ExistingSlotInfo) => {
    setSlotName(slotInfo.characterName);
    addToast({message: `Tên slot "${slotInfo.characterName}" đã được điền. Chọn nhân vật và nhấn "Lưu Vào Slot Này" để ghi đè.`, type: 'info', icon: 'fas fa-edit'});
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'application/json') {
        setSelectedFile(file);
      } else {
        addToast({ message: 'Vui lòng chọn một file .json hợp lệ.', type: 'error' });
        setSelectedFile(null);
        event.target.value = '';
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleLoadFromFile = () => {
    if (!selectedFile) {
      addToast({ message: 'Vui lòng chọn một file để tải.', type: 'warning' });
      return;
    }
    setIsLoadingFile(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const parsedJson = JSON.parse(text);
          await onLoadCharacterFromFile(parsedJson); 
        } else {
          throw new Error('Không thể đọc nội dung file.');
        }
      } catch (error) {
        console.error('Error loading or parsing character file:', error);
        addToast({
          message: `Lỗi khi tải file: ${error instanceof Error ? error.message : 'Nội dung file không hợp lệ.'}`,
          type: 'error',
          duration: 7000,
        });
      } finally {
        setIsLoadingFile(false);
        setSelectedFile(null);
        const fileInput = document.getElementById('char-manage-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    };
    reader.onerror = () => {
      addToast({ message: 'Lỗi khi đọc file.', type: 'error' });
      setIsLoadingFile(false);
    };
    reader.readAsText(selectedFile);
  };
  
  const TabButton: React.FC<{tabId: 'characters' | 'groups'; title: string; icon: string; count: number}> = ({ tabId, title, icon, count }) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === tabId}
      onClick={() => setActiveTab(tabId)}
      className={`flex-1 px-3 py-3 text-sm font-semibold border-b-2
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0
                  transition-colors duration-200 ease-in-out flex items-center justify-center gap-2
                  ${activeTab === tabId
                    ? 'border-primary text-primary dark:border-primary-light dark:text-primary-light'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
    >
      <i className={`fas ${icon} fa-fw`}></i>
      {title}
      <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tabId ? 'bg-primary/10 dark:bg-primary-light/10' : 'bg-slate-200 dark:bg-slate-700'}`}>{count}</span>
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản Lý & Nhập/Xuất" size="2xl">
        <div className="flex border-b border-border-light dark:border-border-dark -mt-2 sm:-mt-3">
            <TabButton tabId="characters" title="Nhân Vật" icon="fa-user" count={characters.length} />
            <TabButton tabId="groups" title="Nhóm Chat" icon="fa-users" count={groups.length} />
        </div>

        <div className="mt-4">
            {activeTab === 'characters' && (
                <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <section className="space-y-4 p-3.5 border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-border-light dark:border-border-dark">
                        <h3 className="text-base font-semibold text-text-light dark:text-text-dark flex items-center">
                            <i className="fas fa-users-cog mr-2 text-primary dark:text-primary-light"></i>Quản Lý Nhân Vật ({characters.length})
                        </h3>
                        {characters.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic py-2">Chưa có nhân vật nào trong ứng dụng.</p>
                        ) : (
                            <>
                                <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1.5">
                                {characters.map(char => (
                                    <div 
                                        key={char.id} 
                                        className={`p-2 border rounded-md flex items-center cursor-pointer transition-all duration-150
                                                    ${selectedCharacterId === char.id 
                                                        ? 'bg-primary/10 dark:bg-primary-dark/20 border-primary dark:border-primary-light shadow-md' 
                                                        : 'bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                                                    }`}
                                        onClick={() => setSelectedCharacterId(char.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCharacterId(char.id);}}
                                        tabIndex={0}
                                        role="radio"
                                        aria-checked={selectedCharacterId === char.id}
                                    >
                                        <InitialAvatar name={char.name} avatarUrl={char.avatarUrl} animatedAvatarUrl={char.animatedAvatarUrl} className="w-7 h-7 rounded-full mr-2 flex-shrink-0" />
                                        <span className={`flex-grow text-sm truncate ${selectedCharacterId === char.id ? 'font-semibold text-primary dark:text-primary-light' : 'text-slate-700 dark:text-slate-200'}`}>{char.name}</span>
                                        <Button 
                                            size="xs" variant="danger" 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteLocalCharacter(char.id); }}
                                            className="!p-1.5 ml-2" title={`Xóa nhân vật ${char.name} khỏi ứng dụng`}
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </Button>
                                    </div>
                                ))}
                                </div>
                                <div className="space-y-2.5 pt-3 border-t border-border-light dark:border-border-dark">
                                    <h4 className="text-sm font-medium text-text-light dark:text-text-dark">Thao tác với nhân vật đã chọn:</h4>
                                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                                        <Input
                                            label="Tên Slot Lưu Trữ (Trình Duyệt):" value={slotName} onChange={(e) => setSlotName(e.target.value)}
                                            placeholder="Tên gợi nhớ cho slot..." wrapperClass="flex-grow !mb-0" disabled={!selectedCharacterId || characters.length === 0}
                                        />
                                        <Button 
                                            onClick={handleSaveToSlot} variant="secondary" className="w-full sm:w-auto"
                                            disabled={!slotName.trim() || !selectedCharacterId || characters.length === 0} leftIcon={<i className="fas fa-hdd"></i>}
                                        >
                                            Lưu Vào Slot
                                        </Button>
                                    </div>
                                    <Button 
                                        onClick={() => {
                                            const char = getSelectedCharacter();
                                            if(char) onSaveCharacterToJsonFile(char); else addToast({message: "Vui lòng chọn một nhân vật từ danh sách.", type: 'warning'});
                                        }}
                                        variant="outline" fullWidth leftIcon={<i className="fas fa-file-export"></i>} disabled={!selectedCharacterId || characters.length === 0}
                                    >
                                        Lưu Nhân Vật Đã Chọn Ra File JSON
                                    </Button>
                                </div>
                            </>
                        )}
                        <div className="space-y-2.5 pt-3 border-t border-border-light dark:border-border-dark">
                            <h4 className="text-sm font-medium text-text-light dark:text-text-dark">Thao tác với toàn bộ nhân vật:</h4>
                            <Button onClick={onSaveAllCharactersToJsonFile} variant="outline" fullWidth leftIcon={<i className="fas fa-archive"></i>} disabled={characters.length === 0}>
                                Lưu Tất Cả Nhân Vật Ra File JSON
                            </Button>
                            <Button onClick={onSaveAllCharactersAndHistoryToJsonFile} variant="outline" fullWidth leftIcon={<i className="fas fa-book-medical"></i>} disabled={characters.length === 0}>
                                Lưu Tất Cả NV & Lịch Sử Chat
                            </Button>
                        </div>
                    </section>
                    <section className="space-y-4 p-3.5 border rounded-lg bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-600">
                        <h3 className="text-base font-semibold text-text-light dark:text-text-dark flex items-center">
                            <i className="fas fa-upload mr-2 text-blue-500 dark:text-blue-400"></i>Nhập/Tải Nhân Vật
                        </h3>
                        <div className="space-y-2.5">
                            <h4 className="text-sm font-medium text-text-light dark:text-text-dark">Nhập từ File JSON:</h4>
                            <div>
                                <label htmlFor="char-manage-file-upload" className="sr-only">Chọn file nhân vật JSON</label>
                                <input
                                    id="char-manage-file-upload" type="file" accept=".json" onChange={handleFileChange}
                                    className="block w-full text-xs file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold
                                            file:bg-blue-100 file:text-blue-700 dark:file:bg-blue-700 dark:file:text-blue-100 
                                            hover:file:bg-blue-200 dark:hover:file:bg-blue-600 focus:outline-none"
                                />
                            </div>
                            {selectedFile && <p className="text-xs text-slate-600 dark:text-slate-300">Đã chọn: <span className="font-medium">{selectedFile.name}</span></p>}
                            <Button onClick={handleLoadFromFile} disabled={!selectedFile || isLoadingFile} isLoading={isLoadingFile} fullWidth variant="primary" leftIcon={<i className="fas fa-file-import"></i>}>
                                {isLoadingFile ? "Đang Nhập..." : "Nhập Từ File Đã Chọn"}
                            </Button>
                        </div>
                        {existingSlots.length > 0 && (
                            <div className="space-y-2.5 pt-3 border-t border-blue-300 dark:border-blue-700">
                                <h4 className="text-sm font-medium text-text-light dark:text-text-dark">Hoặc tải từ Slot đã lưu trong trình duyệt:</h4>
                                <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1.5">
                                    {existingSlots.map(slot => (
                                    <div key={slot.key} className="p-2 border rounded-md bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 flex justify-between items-center text-xs">
                                        <div>
                                            <strong className="block text-slate-800 dark:text-slate-100 truncate" title={slot.characterName}>{slot.characterName}</strong>
                                            <span className="text-slate-500 dark:text-slate-400">Lưu: {new Date(slot.savedAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <Button size="xs" variant="outline" onClick={() => onLoadCharacterFromSlot(slot.key)} className="!py-1 !px-2" leftIcon={<i className="fas fa-download"></i>}>
                                            Tải Slot
                                        </Button>
                                    </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {existingSlots.length === 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-3 border-t border-blue-300 dark:border-blue-700">Không có slot nào được lưu trong trình duyệt.</p>
                        )}
                    </section>
                </div>
            )}
            {activeTab === 'groups' && (
                <div className="animate-fadeIn p-2">
                    <h3 className="text-base font-semibold text-text-light dark:text-text-dark mb-3">
                        Quản Lý Nhóm Hiện Có ({groups.length})
                    </h3>
                    {groups.length === 0 ? (
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 italic py-4">Chưa có nhóm nào được tạo.</p>
                    ) : (
                        <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                        {groups.map(group => (
                            <div key={group.id} className="p-2.5 border rounded-lg flex justify-between items-center bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-3 flex-grow min-w-0">
                                <InitialAvatar name={group.name} avatarUrl={group.avatarUrl} className="w-9 h-9 rounded-full flex-shrink-0" />
                                <div className="min-w-0">
                                <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate block">{group.name}</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{group.memberIds.length} thành viên</p>
                                </div>
                            </div>
                            <div className="flex-shrink-0 ml-2 flex items-center gap-1.5">
                                <Button size="xs" variant="secondary" onClick={() => onEditGroup(group)} title={`Chỉnh sửa nhóm ${group.name}`}>
                                    <i className="fas fa-edit"></i>
                                </Button>
                                <Button size="xs" variant="danger" onClick={() => handleDeleteGroupWithConfirm(group)} title={`Xóa nhóm ${group.name}`}>
                                    <i className="fas fa-trash-alt"></i>
                                </Button>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={onClose} size="lg" className="px-6">Đóng</Button>
        </div>
    </Modal>
  );
};

export default CharacterManagementAndImportModal;
