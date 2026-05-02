
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import { AIGroupChat, AIChatCharacter } from '../../types';
import { usePublicToast } from '../../contexts/ToastContext';
import InitialAvatar from '../InitialAvatar';
import { useSettings } from '../../contexts/SettingsContext';

interface GroupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGroup: (group: AIGroupChat) => void;
  allCharacters: AIChatCharacter[];
  existingGroup?: AIGroupChat | null;
}

const GroupCreationModal: React.FC<GroupCreationModalProps> = ({
  isOpen,
  onClose,
  onSaveGroup,
  allCharacters,
  existingGroup,
}) => {
  const { addToast } = usePublicToast();
  const { settings } = useSettings();
  const [group, setGroup] = useState<Partial<AIGroupChat>>({ name: '', avatarUrl: '', memberIds: [] });
  
  useEffect(() => {
    if (isOpen) {
      if (existingGroup) {
        setGroup(existingGroup);
      } else {
        setGroup({ name: '', avatarUrl: '', memberIds: [] });
      }
    }
  }, [existingGroup, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGroup(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => setGroup(prev => ({ ...prev, avatarUrl: reader.result as string }));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleMemberToggle = (charId: string) => {
    let showLimitToast = false;
    setGroup(prev => {
      const currentMembers = prev.memberIds || [];
      const isAdding = !currentMembers.includes(charId);

      if (isAdding && !settings.allowUnlimitedGroupMembers && currentMembers.length >= 5) {
        showLimitToast = true;
        return prev;
      }

      const newMembers = isAdding
        ? [...currentMembers, charId]
        : currentMembers.filter(id => id !== charId);
      return { ...prev, memberIds: newMembers };
    });

    if (showLimitToast) {
      addToast({
        message: "Đã đạt giới hạn 5 thành viên. Để thêm, hãy bật 'Nhóm không giới hạn' trong Cài đặt AI.",
        type: 'warning',
        duration: 7000
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group.name?.trim()) {
      addToast({ message: "Tên nhóm không được để trống.", type: 'error' });
      return;
    }
    if (!group.memberIds || group.memberIds.length < 1) {
      addToast({ message: "Nhóm phải có ít nhất 1 thành viên.", type: 'error' });
      return;
    }
    if (!settings.allowUnlimitedGroupMembers && group.memberIds.length > 5) {
      addToast({ message: `Nhóm vượt quá giới hạn 5 thành viên. Hiện tại có ${group.memberIds.length}.`, type: 'error' });
      return;
    }


    const finalGroup: AIGroupChat = {
      id: existingGroup?.id || `group-${Date.now()}`,
      name: group.name.trim(),
      avatarUrl: group.avatarUrl?.trim() || '',
      memberIds: group.memberIds,
      createdAt: existingGroup?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveGroup(finalGroup);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingGroup ? "Chỉnh Sửa Nhóm Chat" : "Tạo Nhóm Chat Mới"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="md:grid md:grid-cols-3 md:gap-4 items-start">
            <div className="md:col-span-1 mb-4 md:mb-0 text-center">
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Ảnh Đại Diện Nhóm:</label>
                <InitialAvatar
                    name={group.name || '?'}
                    avatarUrl={group.avatarUrl}
                    className="w-32 h-32 rounded-lg object-cover border-2 border-primary/20 dark:border-primary-light/20 shadow-md mx-auto"
                />
            </div>
            <div className="md:col-span-2 space-y-3">
                <Input
                  label="Tên Nhóm (*):"
                  name="name"
                  value={group.name || ''}
                  onChange={handleChange}
                  placeholder="Ví dụ: Hội Bàn Tròn, Biệt Đội Siêu Anh Hùng"
                  required
                />
                <Input
                    label="URL Ảnh Đại Diện Nhóm:"
                    name="avatarUrl"
                    value={group.avatarUrl?.startsWith('data:') ? '' : (group.avatarUrl || '')}
                    onChange={handleChange}
                    placeholder={group.avatarUrl?.startsWith('data:') ? 'Ảnh đã được tải lên' : 'https://example.com/group.png'}
                    disabled={group.avatarUrl?.startsWith('data:')}
                />
                <div>
                    <label htmlFor="group-avatar-file" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Hoặc Tải Ảnh Từ Máy:</label>
                    <input 
                        id="group-avatar-file" type="file" accept="image/*" onChange={handleAvatarFileChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                </div>
            </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-text-light dark:text-text-dark">Chọn Thành Viên (*):</label>
            <span className={`text-xs font-mono px-2 py-1 rounded-md ${
                !settings.allowUnlimitedGroupMembers && (group.memberIds?.length || 0) >= 5 
                ? 'text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50' 
                : 'text-slate-600 bg-slate-200 dark:text-slate-300 dark:bg-slate-700'
            }`}>
                {(group.memberIds?.length || 0)}/{settings.allowUnlimitedGroupMembers ? '∞' : 5}
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md custom-scrollbar">
            {allCharacters.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center">Bạn cần tạo nhân vật trước khi có thể thêm vào nhóm.</p>
            ) : allCharacters.map(char => (
              <div
                key={char.id}
                onClick={() => handleMemberToggle(char.id)}
                className={`flex items-center p-2 rounded-md cursor-pointer transition-all duration-200 ${
                  group.memberIds?.includes(char.id)
                    ? 'bg-primary/20 dark:bg-primary-dark/30 ring-2 ring-primary'
                    : 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                <InitialAvatar name={char.name} avatarUrl={char.avatarUrl} animatedAvatarUrl={char.animatedAvatarUrl} className="w-8 h-8 rounded-full mr-3 flex-shrink-0" />
                <span className="font-medium text-sm text-text-light dark:text-text-dark flex-grow">{char.name}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    group.memberIds?.includes(char.id) ? 'bg-primary border-primary-dark' : 'bg-slate-300 dark:bg-slate-600 border-slate-400'
                }`}>
                    {group.memberIds?.includes(char.id) && <i className="fas fa-check text-white text-xs"></i>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border-light dark:border-border-dark mt-4">
          <Button type="button" variant="outline" onClick={onClose} size="lg">Hủy</Button>
          <Button type="submit" variant="primary" size="lg">{existingGroup ? "Lưu Thay Đổi" : "Tạo Nhóm"}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default GroupCreationModal;