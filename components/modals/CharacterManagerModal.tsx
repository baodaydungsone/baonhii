
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input'; // Added missing import
import { AIChatCharacter, SavedCharacterSlotInfo } from '../../types';
import { LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX } from '../../constants';
import { usePublicToast } from '../../contexts/ToastContext';

interface CharacterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: AIChatCharacter[];
  onSaveCharacterToJsonFile: (character: AIChatCharacter) => void;
  onSaveAllCharactersToJsonFile: () => void;
  onSaveAllCharactersAndHistoryToJsonFile: () => void; // New prop
  onSaveCharacterToSlot: (character: AIChatCharacter, slotName: string) => void;
  onDeleteCharacter: (characterId: string) => void; 
}

interface ExistingSlotInfo {
  key: string;
  characterName: string; // Name of the character in the slot
  savedAt: string;
}

const getAvailableCharacterSlots = (): ExistingSlotInfo[] => {
  const slots: ExistingSlotInfo[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX)) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed: SavedCharacterSlotInfo = JSON.parse(item);
          if (parsed.character && parsed.savedAt) {
            slots.push({
              key: key,
              characterName: parsed.character.name,
              savedAt: parsed.savedAt,
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


const CharacterManagerModal: React.FC<CharacterManagerModalProps> = ({
  isOpen,
  onClose,
  characters,
  onSaveCharacterToJsonFile,
  onSaveAllCharactersToJsonFile,
  onSaveAllCharactersAndHistoryToJsonFile, // New prop
  onSaveCharacterToSlot,
  onDeleteCharacter,
}) => {
  const { addToast } = usePublicToast();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [slotName, setSlotName] = useState<string>('');
  const [existingSlots, setExistingSlots] = useState<ExistingSlotInfo[]>([]);

  const refreshSlots = useCallback(() => {
    setExistingSlots(getAvailableCharacterSlots());
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      if (characters.length > 0 && !selectedCharacterId) {
        // Only set if selectedCharacterId is not already set or not in current characters list
        if (!characters.find(c => c.id === selectedCharacterId)) {
             setSelectedCharacterId(characters[0].id);
        }
      } else if (characters.length === 0) {
        setSelectedCharacterId('');
      }
      // Auto-fill slot name if a character is selected
      const currentlySelectedChar = characters.find(c => c.id === selectedCharacterId);
      if (currentlySelectedChar) {
        setSlotName(currentlySelectedChar.name);
      } else if (characters.length > 0) {
         setSlotName(characters[0].name); // Default to first character's name if none selected yet
      } else {
        setSlotName('');
      }
    }
  }, [isOpen, characters, selectedCharacterId, refreshSlots]);

  useEffect(() => {
    // Update slotName when selectedCharacterId changes and modal is open
    if (isOpen && selectedCharacterId) {
        const char = characters.find(c => c.id === selectedCharacterId);
        if (char) setSlotName(char.name);
    }
  }, [selectedCharacterId, characters, isOpen]);

  const getSelectedCharacter = (): AIChatCharacter | undefined => {
    return characters.find(c => c.id === selectedCharacterId);
  };

  const handleSaveToSlot = () => {
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

    onSaveCharacterToSlot(characterToSave, normalizedSlotIdentifier); // Pass normalized for saving
    
    if (isOverwriting) {
      addToast({ message: `Đã ghi đè slot "${trimmedSlotName}" với nhân vật ${characterToSave.name}.`, type: 'success', icon: 'fas fa-hdd' });
    } else {
      addToast({ message: `Nhân vật ${characterToSave.name} đã được lưu vào slot mới: "${trimmedSlotName}"`, type: 'success', icon: 'fas fa-save' });
    }
    refreshSlots();
  };

  const handleDeleteCharacterAndSlot = (charId: string, slotKey?: string) => {
    const charToDelete = characters.find(c => c.id === charId);
    if (!charToDelete) return;

    if (window.confirm(`Bạn có chắc muốn xóa nhân vật "${charToDelete.name}"? Hành động này không thể hoàn tác.`)) {
        onDeleteCharacter(charId); // Deletes from main list and its chat history
        if (slotKey && slotKey.includes(charToDelete.name.replace(/\s+/g, '_'))) { // Basic check if slot might be related
            localStorage.removeItem(slotKey); // Also remove from specific save slots if provided
        }
        addToast({message: `Đã xóa nhân vật: "${charToDelete.name}"`, type: 'info'});
        if (selectedCharacterId === charId) setSelectedCharacterId(characters.length > 1 ? characters.filter(c => c.id !== charId)[0]?.id || '' : '');
        refreshSlots(); 
    }
  };
  
  const handleSelectSlotForOverwrite = (slotInfo: ExistingSlotInfo) => {
    setSlotName(slotInfo.characterName); // Use the character name from the slot for the input field
    addToast({message: `Tên slot "${slotInfo.characterName}" đã được điền. Chọn nhân vật và nhấn "Lưu Vào Slot Này" để ghi đè.`, type: 'info', icon: 'fas fa-edit'});
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản Lý & Lưu Trữ Nhân Vật" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel: Character List and Actions */}
        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
          <h3 className="text-md font-semibold text-text-light dark:text-text-dark mb-3">
            <i className="fas fa-users mr-2 text-primary dark:text-primary-light"></i>Chọn Nhân Vật ({characters.length})
          </h3>
          {characters.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Chưa có nhân vật nào được tạo.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2 mb-4">
              {characters.map(char => (
                <div 
                    key={char.id} 
                    className={`p-2.5 border rounded-md flex justify-between items-center cursor-pointer transition-all
                                ${selectedCharacterId === char.id 
                                    ? 'bg-primary/10 dark:bg-primary-dark/20 border-primary dark:border-primary-light ring-1 ring-primary dark:ring-primary-light' 
                                    : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                }`}
                    onClick={() => setSelectedCharacterId(char.id)}
                >
                  <span className={`font-medium text-sm ${selectedCharacterId === char.id ? 'text-primary dark:text-primary-light' : 'text-slate-700 dark:text-slate-200'}`}>{char.name}</span>
                  <Button 
                      size="xs" 
                      variant="danger" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCharacterAndSlot(char.id); }}
                      className="!p-1.5"
                      title={`Xóa nhân vật ${char.name}`}
                  >
                      <i className="fas fa-trash-alt"></i>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 mt-auto pt-3 border-t border-slate-200 dark:border-slate-600">
             <Button 
                onClick={() => {
                    const char = getSelectedCharacter();
                    if(char) onSaveCharacterToJsonFile(char);
                    else addToast({message: "Vui lòng chọn một nhân vật.", type: 'warning'});
                }}
                variant="outline"
                className="w-full"
                leftIcon={<i className="fas fa-file-export"></i>}
                disabled={!selectedCharacterId}
              >
                Lưu Nhân Vật Đã Chọn Ra File JSON
            </Button>
            <Button 
                onClick={onSaveAllCharactersToJsonFile}
                variant="outline"
                className="w-full"
                leftIcon={<i className="fas fa-archive"></i>}
                disabled={characters.length === 0}
              >
                Lưu Tất Cả Nhân Vật Ra File JSON
            </Button>
            <Button 
                onClick={onSaveAllCharactersAndHistoryToJsonFile} // New button
                variant="outline"
                className="w-full"
                leftIcon={<i className="fas fa-book-medical"></i>} // Example icon
                disabled={characters.length === 0}
            >
                Lưu Tất Cả NV & Lịch Sử Chat
            </Button>
          </div>
        </div>

        {/* Right Panel: Save to Slot */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/60 border-blue-200 dark:border-blue-700">
          <h3 className="text-md font-semibold text-text-light dark:text-text-dark mb-3">
            <i className="fas fa-save mr-2 text-blue-500 dark:text-blue-400"></i>Lưu Nhân Vật Đã Chọn Vào Slot Trình Duyệt
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Nhân vật chọn ở cột trái sẽ được lưu vào slot đặt tên bên dưới. Dữ liệu này có thể bị mất nếu xóa cache trình duyệt.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 items-end mb-4">
            <Input
              label="Tên Slot Lưu Trữ:"
              value={slotName}
              onChange={(e) => setSlotName(e.target.value)}
              placeholder="Ví dụ: Nhân vật phản diện chính"
              wrapperClass="flex-grow !mb-0"
              disabled={!selectedCharacterId}
            />
            <Button 
              onClick={handleSaveToSlot}
              variant="secondary"
              className="w-full sm:w-auto mt-2 sm:mt-0"
              disabled={!slotName.trim() || !selectedCharacterId}
              leftIcon={<i className="fas fa-hdd"></i>}
            >
              Lưu Vào Slot Này
            </Button>
          </div>

          {existingSlots.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Các slot đã lưu (nhấn để điền tên và ghi đè):</h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                {existingSlots.map(slot => (
                  <div 
                    key={slot.key} 
                    className="p-2.5 border rounded-md bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 flex justify-between items-center text-xs hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors"
                  >
                    <div className="cursor-pointer flex-grow mr-2" onClick={() => handleSelectSlotForOverwrite(slot)} title={`Chọn để ghi đè slot: ${slot.characterName}`}>
                      <strong className="block text-slate-800 dark:text-slate-100">{slot.characterName}</strong>
                      <span className="text-slate-500 dark:text-slate-400">Lưu lúc: {new Date(slot.savedAt).toLocaleString('vi-VN')}</span>
                    </div>
                     <Button 
                      size="xs" 
                      variant="danger" 
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc muốn xóa slot lưu trữ "${slot.characterName}"?`)) {
                           localStorage.removeItem(slot.key);
                           refreshSlots();
                           addToast({message: `Đã xóa slot: "${slot.characterName}"`, type: 'info'});
                        }
                      }}
                      className="!p-1.5 ml-2 flex-shrink-0"
                      title={`Xóa slot: ${slot.characterName}`}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
           {existingSlots.length === 0 && !selectedCharacterId && (
             <p className="text-xs text-slate-500 dark:text-slate-400 italic">Chưa có slot nào được lưu.</p>
           )}
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <Button variant="outline" onClick={onClose} size="lg">Đóng</Button>
      </div>
    </Modal>
  );
};

export default CharacterManagerModal;