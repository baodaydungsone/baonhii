
import React from 'react';
import Modal from '../Modal'; // Assuming Modal.tsx path
import Button from '../Button'; // Assuming Button.tsx path
import { AIChatCharacter, SavedCharacterSlotInfo } from '../../types'; // Assuming types.ts path
import { usePublicToast } from '../../contexts/ToastContext'; // Assuming ToastContext.tsx path
import { LOCAL_STORAGE_CHARACTER_SLOT_KEY_PREFIX } from '../../constants'; // Assuming constants.ts path

interface ImportCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCharacterFromFile: (character: AIChatCharacter) => void;
  onLoadCharacterFromSlot: (slotKey: string) => void;
}

interface ExistingSlotInfo {
  key: string;
  characterName: string;
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

const ImportCharacterModal: React.FC<ImportCharacterModalProps> = ({
  isOpen,
  onClose,
  onLoadCharacterFromFile,
  onLoadCharacterFromSlot,
}) => {
  const { addToast } = usePublicToast();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = React.useState(false);
  const [existingSlots, setExistingSlots] = React.useState<ExistingSlotInfo[]>([]);

  const refreshSlots = React.useCallback(() => {
    setExistingSlots(getAvailableCharacterSlots());
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setSelectedFile(null); // Reset selected file when modal opens
    }
  }, [isOpen, refreshSlots]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'application/json') {
        setSelectedFile(file);
      } else {
        addToast({ message: 'Vui lòng chọn một file .json hợp lệ.', type: 'error' });
        setSelectedFile(null);
        event.target.value = ''; // Reset file input
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
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const parsedJson = JSON.parse(text);
          
          if (Array.isArray(parsedJson)) {
            // Handle array of characters
            let importedCount = 0;
            let updatedCount = 0; // Not explicitly tracked by onLoadCharacterFromFile, but it handles update
            parsedJson.forEach((charData: any) => {
              // Basic validation for each character object
              if (charData && charData.id && charData.name && charData.personality) {
                onLoadCharacterFromFile(charData as AIChatCharacter);
                importedCount++;
              } else {
                console.warn("Skipping invalid character object in array:", charData);
              }
            });
            if (importedCount > 0) {
              addToast({ message: `Đã nhập và xử lý ${importedCount} nhân vật từ file. Các nhân vật trùng ID sẽ được cập nhật.`, type: 'success', duration: 7000 });
            } else {
              addToast({ message: 'Không tìm thấy nhân vật hợp lệ nào trong file.', type: 'warning' });
            }
          } else if (parsedJson && parsedJson.id && parsedJson.name && parsedJson.personality) {
            // Handle single character object
            onLoadCharacterFromFile(parsedJson as AIChatCharacter);
            // Toast for single character success is handled by the `handleCreateCharacter` in App.tsx
          } else {
            throw new Error('Cấu trúc file JSON không hợp lệ. Phải là một nhân vật hoặc một mảng các nhân vật.');
          }
           // No automatic close on success to allow multiple imports if desired
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
        // Clear selected file after processing to allow re-selection of same file if needed
        setSelectedFile(null); 
        const fileInput = document.getElementById('char-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    };
    reader.onerror = () => {
      addToast({ message: 'Lỗi khi đọc file.', type: 'error' });
      setIsLoadingFile(false);
    };
    reader.readAsText(selectedFile);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nhập Nhân Vật AI" size="md">
      <div className="space-y-6">
        <div className="p-4 border rounded-lg bg-primary/5 dark:bg-primary-dark/10 border-primary/30 dark:border-primary-dark/40">
          <h3 className="text-lg font-semibold text-primary dark:text-primary-light mb-2 flex items-center">
            <i className="fas fa-history mr-2"></i>Nhập Từ Các Slot Đã Lưu Trong Trình Duyệt
          </h3>
          {existingSlots.length > 0 ? (
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {existingSlots.map(slot => (
                <div key={slot.key} className="p-3 border rounded-md bg-white dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <strong className="block text-sm text-slate-800 dark:text-slate-100">{slot.characterName}</strong>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Lưu lúc: {new Date(slot.savedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <Button onClick={() => { onLoadCharacterFromSlot(slot.key); }} variant="primary" size="xs" className="!px-2.5 !py-1 mt-2 sm:mt-0" leftIcon={<i className="fas fa-download"></i>}>
                    Tải Từ Slot Này
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Không tìm thấy slot nhân vật nào được lưu trong trình duyệt.</p>
          )}
        </div>

        <hr className="border-border-light dark:border-border-dark my-4" />

        <div>
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2 flex items-center">
            <i className="fas fa-file-import mr-2"></i>Hoặc Nhập Nhân Vật Từ File JSON
          </h3>
          <p className="text-sm text-text-light dark:text-text-dark mb-2">
            Chọn file JSON (.json) chứa định nghĩa một hoặc nhiều nhân vật đã lưu.
          </p>
          <div>
            <label htmlFor="char-file-upload" className="block text-xs font-medium text-text-light dark:text-text-dark mb-1 sr-only">
              Chọn file nhân vật:
            </label>
            <input
              id="char-file-upload"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 dark:text-slate-400
                         file:mr-4 file:py-2 file:px-3
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-primary-light/20 file:text-primary dark:file:bg-primary-dark/30 dark:file:text-primary-light
                         hover:file:bg-primary-light/30 dark:hover:file:bg-primary-dark/40
                         focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:focus:ring-primary-dark"
            />
          </div>
          {selectedFile && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
              Đã chọn: <span className="font-medium">{selectedFile.name}</span>
            </p>
          )}
          <Button
            onClick={handleLoadFromFile}
            disabled={!selectedFile || isLoadingFile}
            isLoading={isLoadingFile}
            className="mt-3 w-full sm:w-auto"
            variant="outline"
            leftIcon={<i className="fas fa-upload"></i>}
          >
            {isLoadingFile ? "Đang Nhập Từ File..." : "Nhập Từ File"}
          </Button>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="ghost" onClick={onClose} disabled={isLoadingFile} size="lg">
          Đóng
        </Button>
      </div>
    </Modal>
  );
};

export default ImportCharacterModal;
