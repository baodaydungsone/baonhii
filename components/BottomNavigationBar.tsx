
import React from 'react';
import { ActiveTab } from '../types';

interface BottomNavigationBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onCreate: () => void;
}

const NavItem: React.FC<{
  tab: ActiveTab;
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ tab, icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 text-xs transition-colors duration-200 ease-in-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-md
                  ${isActive ? 'text-primary dark:text-primary-light' : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-light'}`}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
    >
      <i className={`fas ${icon} text-lg mb-0.5`}></i> {/* Reduced icon size from sm:text-xl */}
      <span>{label}</span> {/* Reduced text size from sm:text-sm */}
    </button>
  );
};

const CreateButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center flex-1 text-white bg-primary dark:bg-primary-dark rounded-full
                 mx-2 shadow-lg hover:bg-primary-dark dark:hover:bg-primary
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-light
                 transform hover:scale-105 active:scale-95 transition-transform"
      aria-label="Tạo mới nhân vật"
      style={{ width: '52px', height: '52px' }} // Reduced size
    >
      <i className="fas fa-plus text-xl"></i> {/* Reduced icon size */}
    </button>
  );
};

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({ activeTab, onTabChange, onCreate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-border-light dark:border-border-dark shadow-top-md z-[100] flex items-center justify-around h-14"> {/* Reduced height from h-16 */}
      <NavItem
        tab="home"
        icon="fa-home"
        label="Trang Chủ"
        isActive={activeTab === 'home'}
        onClick={() => onTabChange('home')}
      />
      <NavItem
        tab="history"
        icon="fa-history"
        label="Lịch Sử"
        isActive={activeTab === 'history'}
        onClick={() => onTabChange('history')}
      />
      <CreateButton onClick={onCreate} />
      <NavItem
        tab="profile"
        icon="fa-user-circle"
        label="Hồ Sơ"
        isActive={activeTab === 'profile'}
        onClick={() => onTabChange('profile')}
      />
    </nav>
  );
};

export default BottomNavigationBar;
