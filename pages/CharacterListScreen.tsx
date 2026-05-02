

import React, { useState } from 'react';
import { AIChatCharacter, AIGroupChat, ModalType, UserProfile } from '../types';
import Button from '../components/Button';
import InitialAvatar from '../components/InitialAvatar';
import Input from '../components/Input';

interface CharacterListScreenProps {
  characters: AIChatCharacter[];
  groups: AIGroupChat[];
  onSelectCharacter: (character: AIChatCharacter) => void;
  onSelectGroup: (group: AIGroupChat) => void;
  openModal: (modalType: ModalType, data?: any) => void;
  userProfile: UserProfile;
}

type HomeTab = 'characters' | 'groups';

const CharacterListScreen: React.FC<CharacterListScreenProps> = ({ characters, groups, onSelectCharacter, onSelectGroup, openModal, userProfile }) => {
    const [activeHomeTab, setActiveHomeTab] = useState<HomeTab>('characters');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false); // State to toggle search UI

    const filteredCharacters = characters.filter(char =>
        char.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getDynamicGreeting = () => {
        const hour = new Date().getHours();
        let timeOfDayGreeting = "Chào mừng";
        if (hour >= 5 && hour < 12) timeOfDayGreeting = 'Chào buổi sáng';
        if (hour >= 12 && hour < 18) timeOfDayGreeting = 'Chào buổi chiều';
        if (hour >= 18 && hour < 22) timeOfDayGreeting = 'Buổi tối tốt lành';
        if (hour >= 22 || hour < 5) timeOfDayGreeting = 'Khuya rồi';

        return `${timeOfDayGreeting}!`;
    };

    const TabButton: React.FC<{tabId: HomeTab; title: string; count: number;}> = ({ tabId, title, count }) => (
        <button
            onClick={() => setActiveHomeTab(tabId)}
            className={`w-1/2 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ease-in-out flex items-center justify-center gap-2
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-0
            ${activeHomeTab === tabId 
                ? 'text-primary dark:text-primary-light border-primary dark:border-primary-light'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
        >
            {title}
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeHomeTab === tabId ? 'bg-primary/10 dark:bg-primary-light/10' : 'bg-slate-200 dark:bg-slate-700'}`}>{count}</span>
        </button>
    );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 dark:from-slate-900 dark:via-background-dark dark:to-slate-800">
      <header className="p-4 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-40 h-[88px] flex items-center">
        <div className="container mx-auto flex justify-between items-center gap-3 w-full">
            {!isSearching ? (
            <>
                {/* Spacer to balance the search button for centering the title */}
                <div className="w-10 h-10 flex-shrink-0" aria-hidden="true"></div>

                <h1 className="text-xl sm:text-2xl font-bold text-primary dark:text-primary-light text-center truncate">
                    {getDynamicGreeting()}
                </h1>
                
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSearching(true)}
                    className="!p-2.5 !rounded-full flex-shrink-0 w-10 h-10"
                    title="Tìm kiếm"
                >
                    <i className="fas fa-search text-lg"></i>
                </Button>
            </>
            ) : (
            <div className="flex items-center gap-2 w-full animate-fadeIn">
                <Input
                id="character-search"
                type="search"
                placeholder="Tìm kiếm nhân vật hoặc nhóm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                wrapperClass="!mb-0 flex-grow"
                leftIcon={<i className="fas fa-search text-gray-400"></i>}
                className="!rounded-full !py-2"
                autoFocus
                />
                <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    setIsSearching(false);
                    setSearchTerm('');
                }}
                className="!p-2.5 !rounded-full flex-shrink-0"
                title="Đóng tìm kiếm"
                >
                <i className="fas fa-times text-lg"></i>
                </Button>
            </div>
            )}
        </div>
      </header>

       <nav className="flex sticky top-[88px] z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm">
            <TabButton tabId="characters" title="Nhân Vật" count={filteredCharacters.length} />
            <TabButton tabId="groups" title="Chat Nhóm" count={filteredGroups.length} />
        </nav>

      <main className="flex-grow container mx-auto p-4 sm:p-6">
        {activeHomeTab === 'characters' && (
             <>
                {characters.length > 0 && filteredCharacters.length === 0 ? (
                    <div className="text-center py-10">
                        <i className="fas fa-search-minus fa-3x text-slate-400 dark:text-slate-500 mb-4"></i>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Không tìm thấy nhân vật nào khớp.</p>
                        <p className="text-slate-500 dark:text-slate-400">Hãy thử một từ khóa tìm kiếm khác.</p>
                    </div>
                ) : characters.length === 0 ? (
                <div className="text-center py-10">
                    <i className="fas fa-users-slash fa-3x text-slate-400 dark:text-slate-500 mb-4"></i>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Chưa có nhân vật nào được tạo.</p>
                    <p className="text-slate-500 dark:text-slate-400">Hãy nhấn nút <i className="fas fa-plus-circle text-primary"></i> ở thanh dưới cùng để tạo mới!</p>
                </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredCharacters.map(char => (
                    <div
                        key={char.id}
                        className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                        onClick={() => onSelectCharacter(char)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectCharacter(char);}}
                        role="button"
                        tabIndex={0}
                        aria-label={`Trò chuyện với ${char.name}`}
                    >
                        <div className="w-full h-48 overflow-hidden bg-slate-200 dark:bg-slate-700 relative group">
                        <InitialAvatar
                            name={char.name}
                            avatarUrl={char.avatarUrl}
                            animatedAvatarUrl={char.animatedAvatarUrl}
                            className="object-cover w-full h-full"
                            altText={`Avatar của ${char.name}`}
                        />
                        </div>
                        <div className="p-3 text-center flex-grow flex flex-col justify-center">
                        <h3 className="font-semibold text-md text-text-light dark:text-text-dark truncate" title={char.name}>
                            {char.name}
                        </h3>
                        {char.greetingMessage && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 px-1 line-clamp-2" title={char.greetingMessage}>
                            {char.greetingMessage}
                            </p>
                        )}
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </>
        )}
        {activeHomeTab === 'groups' && (
             <>
                {groups.length > 0 && filteredGroups.length === 0 ? (
                     <div className="text-center py-10">
                        <i className="fas fa-search-minus fa-3x text-slate-400 dark:text-slate-500 mb-4"></i>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Không tìm thấy nhóm nào khớp.</p>
                        <p className="text-slate-500 dark:text-slate-400">Hãy thử một từ khóa tìm kiếm khác.</p>
                    </div>
                ) : groups.length === 0 ? (
                <div className="text-center py-10">
                    <i className="fas fa-user-friends fa-3x text-slate-400 dark:text-slate-500 mb-4"></i>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Chưa có nhóm chat nào.</p>
                    <Button onClick={() => openModal(ModalType.GroupCreation)} variant="primary" size="lg" className="mt-4" leftIcon={<i className="fas fa-plus"></i>}>
                        Tạo Nhóm Chat Mới
                    </Button>
                </div>
                ) : (
                <>
                    <div className="text-right mb-4">
                         <Button onClick={() => openModal(ModalType.GroupCreation)} variant="primary" size="md" leftIcon={<i className="fas fa-plus"></i>}>
                            Tạo Nhóm Chat Mới
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredGroups.map(group => (
                        <div
                            key={group.id}
                            className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between transform hover:-translate-y-1 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 cursor-pointer"
                             onClick={() => onSelectGroup(group)}
                             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectGroup(group);}}
                             role="button"
                             tabIndex={0}
                             aria-label={`Trò chuyện với nhóm ${group.name}`}
                        >
                            <div className="w-full h-48 overflow-hidden bg-slate-200 dark:bg-slate-700 relative">
                            <InitialAvatar
                                name={group.name}
                                avatarUrl={group.avatarUrl}
                                className="object-cover w-full h-full"
                                altText={`Avatar của nhóm ${group.name}`}
                            />
                            </div>
                            <div className="p-3 text-center flex-grow flex flex-col justify-center">
                            <h3 className="font-semibold text-md text-text-light dark:text-text-dark truncate" title={group.name}>
                                {group.name}
                            </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 px-1">
                                {group.memberIds.length} thành viên
                            </p>
                            </div>
                        </div>
                        ))}
                    </div>
                 </>
                )}
            </>
        )}
      </main>
    </div>
  );
};

export default CharacterListScreen;