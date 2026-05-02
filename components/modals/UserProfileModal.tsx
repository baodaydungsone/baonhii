import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import Textarea from '../Textarea'; // Added Textarea
import InitialAvatar from '../InitialAvatar'; // Added InitialAvatar
import { useSettings } from '../../contexts/SettingsContext';
import { usePublicToast } from '../../contexts/ToastContext';
import { DEFAULT_USER_NAME, DEFAULT_USER_BIO } from '../../constants'; // Removed DEFAULT_AVATAR_PATH as InitialAvatar handles fallback visuals

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, setUserProfile } = useSettings();
  const { addToast } = usePublicToast();
  
  const [currentName, setCurrentName] = useState(userProfile.name);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(userProfile.avatarUrl || '');
  const [currentBio, setCurrentBio] = useState(userProfile.bio || ''); 
  // Avatar preview is now handled by InitialAvatar directly based on currentAvatarUrl

  useEffect(() => {
    if (isOpen) {
      setCurrentName(userProfile.name || DEFAULT_USER_NAME);
      setCurrentAvatarUrl(userProfile.avatarUrl || '');
      setCurrentBio(userProfile.bio || DEFAULT_USER_BIO); 
    }
  }, [isOpen, userProfile]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentName(e.target.value);
  };

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCurrentAvatarUrl(url);
  };
  
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentAvatarUrl(result); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { 
    setCurrentBio(e.target.value);
  };

  const handleSave = () => {
    const finalName = currentName.trim() || DEFAULT_USER_NAME;
    const finalBio = currentBio.trim() || DEFAULT_USER_BIO;
    setUserProfile({
      name: finalName,
      avatarUrl: currentAvatarUrl.trim() || '', 
      bio: finalBio, 
    });
    addToast({ message: 'Đã cập nhật hồ sơ của bạn!', type: 'success' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hồ Sơ Của Bạn" size="sm"> 
      <div className="space-y-2.5"> 
        <div className="flex flex-col md:flex-row md:items-start gap-2.5"> 
          <div className="flex-shrink-0 md:w-1/3 text-center md:text-left">
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Ảnh Đại Diện:</label>
            <InitialAvatar
              name={currentName || DEFAULT_USER_NAME}
              avatarUrl={currentAvatarUrl}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-primary dark:border-primary-light shadow-lg mx-auto md:mx-0"
              altText="Ảnh đại diện của bạn"
            />
          </div>
          <div className="space-y-2 flex-grow md:w-2/3"> 
            <Input
              label="Tên Hiển Thị Của Bạn:"
              value={currentName}
              onChange={handleNameChange}
              placeholder="Nhập tên của bạn..."
              leftIcon={<i className="fas fa-user text-gray-400"></i>}
              wrapperClass="!mb-2" 
            />
            <div>
              <label htmlFor="user-avatar-file-upload" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Tải Ảnh Từ Máy:</label>
              <input 
                  id="user-avatar-file-upload"
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarFileChange} 
                  className="block w-full text-xs sm:text-sm text-slate-500 dark:text-slate-400
                            file:mr-3 file:py-1.5 file:px-2.5
                            file:rounded-md file:border-0
                            file:text-xs sm:file:text-sm file:font-semibold
                            file:bg-primary-light/20 file:text-primary dark:file:bg-primary-dark/30 dark:file:text-primary-light
                            hover:file:bg-primary-light/30 dark:hover:file:bg-primary-dark/40
                            focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:focus:ring-primary-dark"
              />
            </div>
            <Input
              label="Hoặc nhập URL ảnh đại diện:"
              value={currentAvatarUrl}
              onChange={handleAvatarUrlChange}
              placeholder="https://example.com/your-avatar.png"
              leftIcon={<i className="fas fa-link text-gray-400"></i>}
              wrapperClass="!mb-2" 
            />
          </div>
        </div>
        <Textarea 
          label="Giới Thiệu Ngắn Về Bạn (Bio):"
          value={currentBio}
          onChange={handleBioChange}
          rows={2} 
          placeholder="Ví dụ: Một tỷ phú thích phiêu lưu..."
          wrapperClass="mt-2 !mb-2" 
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
            AI sẽ sử dụng tên và bio này để trò chuyện với bạn.
            Nếu không đặt, tên mặc định "{DEFAULT_USER_NAME}" và bio "{DEFAULT_USER_BIO}" sẽ được dùng.
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2"> 
        <Button variant="outline" onClick={onClose} size="sm">Hủy</Button> 
        <Button onClick={handleSave} size="sm" variant="primary">Lưu Hồ Sơ</Button> 
      </div>
    </Modal>
  );
};

export default UserProfileModal;
