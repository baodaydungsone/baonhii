
import React from 'react';
import { ModalType, ActiveTab } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import InitialAvatar from '../components/InitialAvatar';
import { DEFAULT_USER_BIO, DEFAULT_USER_NAME } from '../constants';
import { motion } from 'motion/react';

interface ProfileScreenProps {
  openModal: (modalType: ModalType, data?: any) => void;
  onTabChange: (tab: ActiveTab) => void;
}

const BentoCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
}> = ({ children, className = '', onClick, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: "easeOut" }}
    whileHover={onClick ? { scale: 1.02, y: -2 } : {}}
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={`
      bg-white dark:bg-slate-800 
      rounded-3xl p-6 
      shadow-sm border border-slate-200 dark:border-slate-700
      flex flex-col justify-between
      transition-colors duration-200
      ${onClick ? 'cursor-pointer hover:border-primary/50 dark:hover:border-primary/50' : ''}
      ${className}
    `}
  >
    {children}
  </motion.div>
);

const ProfileScreen: React.FC<ProfileScreenProps> = ({ openModal, onTabChange }) => {
  const { userProfile } = useSettings();

  const effectiveName = userProfile.name || DEFAULT_USER_NAME;
  const effectiveBio = userProfile.bio || DEFAULT_USER_BIO;

  return (
    <div className="p-4 sm:p-8 flex-grow bg-slate-50 dark:bg-slate-950 min-h-screen">
      <header className="mb-10 max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Hồ Sơ <span className="text-primary">Của Bạn</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Quản lý danh tính và kho lưu trữ cá nhân.</p>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[180px]">
        {/* Profile Card - Large */}
        <BentoCard className="md:col-span-2 md:row-span-2 flex-row items-center gap-8" delay={0.1}>
          <div className="flex-shrink-0">
            <InitialAvatar
              name={effectiveName}
              avatarUrl={userProfile.avatarUrl}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl object-cover shadow-2xl border-4 border-white dark:border-slate-700"
              altText="Ảnh đại diện"
            />
          </div>
          <div className="flex-grow">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">{effectiveName}</h2>
            <p className="text-slate-500 dark:text-slate-400 line-clamp-3 text-sm sm:text-base leading-relaxed">
              {effectiveBio}
            </p>
          </div>
        </BentoCard>

        {/* Edit Profile - Small */}
        <BentoCard 
          className="md:col-span-1 md:row-span-1 bg-primary/5 dark:bg-primary/10 border-primary/20" 
          onClick={() => openModal(ModalType.UserProfileSettings)}
          delay={0.2}
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-4">
            <i className="fas fa-user-edit text-xl"></i>
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-white">Chỉnh Sửa</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật tên và tiểu sử</p>
          </div>
        </BentoCard>

        {/* App Settings - Small */}
        <BentoCard 
          className="md:col-span-1 md:row-span-1" 
          onClick={() => openModal(ModalType.MainAppSettings)}
          delay={0.3}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-4">
            <i className="fas fa-cog text-xl"></i>
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-white">Cài Đặt</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cấu hình ứng dụng & API</p>
          </div>
        </BentoCard>

        {/* Character Management - Medium */}
        <BentoCard 
          className="md:col-span-1 md:row-span-1" 
          onClick={() => openModal(ModalType.CharacterManagementAndImportModal)}
          delay={0.4}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <i className="fas fa-users-cog text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg dark:text-white">Nhân Vật</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quản lý & Nhập/Xuất</p>
            </div>
          </div>
        </BentoCard>

        {/* Notebook - Medium */}
        <BentoCard 
          className="md:col-span-1 md:row-span-1" 
          onClick={() => onTabChange('notebook')}
          delay={0.5}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <i className="fas fa-book text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg dark:text-white">Sổ Tay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ghi chép & Lorebook</p>
            </div>
          </div>
        </BentoCard>

        {/* Knowledge Base - Medium */}
        <BentoCard 
          className="md:col-span-1 md:row-span-1" 
          onClick={() => onTabChange('knowledge')}
          delay={0.6}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <i className="fas fa-brain text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg dark:text-white">Kiến Thức</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dữ liệu RAG cá nhân</p>
            </div>
          </div>
        </BentoCard>
      </div>

      <footer className="mt-16 text-center max-w-5xl mx-auto border-t border-slate-200 dark:border-slate-800 pt-8">
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
          Dữ liệu được lưu trữ cục bộ • Bảo mật & Riêng tư
        </p>
      </footer>
    </div>
  );
};

export default ProfileScreen;
