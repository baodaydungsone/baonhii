
import React, { useState, useEffect } from 'react';
import { AIChatCharacter, ChatMessage, AIGroupChat } from '../types'; 
import { LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX } from '../constants';
import InitialAvatar from '../components/InitialAvatar';
import { StorageService } from '../services/StorageService';

type ConversationEntity = 
    | { type: 'character'; data: AIChatCharacter }
    | { type: 'group'; data: AIGroupChat };

interface HistoryScreenProps {
  characters: AIChatCharacter[];
  groups: AIGroupChat[];
  onSelectCharacter: (character: AIChatCharacter) => void;
  onSelectGroup: (group: AIGroupChat) => void;
}

interface RecentConversation {
  entity: ConversationEntity;
  lastMessage: ChatMessage | null;
  lastMessageTimestamp: string | null;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ characters, groups, onSelectCharacter, onSelectGroup }) => {
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);

  useEffect(() => {
    const loadConversations = async () => {
      const conversations: RecentConversation[] = [];
      const allEntities: ConversationEntity[] = [
        ...characters.map(c => ({ type: 'character' as const, data: c })),
        ...groups.map(g => ({ type: 'group' as const, data: g })),
      ];

      for (const entity of allEntities) {
        try {
          const historyKey = LOCAL_STORAGE_CHAT_HISTORY_KEY_PREFIX + entity.data.id;
          const storedHistory = await StorageService.getItem<ChatMessage[]>(historyKey);
          if (storedHistory && Array.isArray(storedHistory)) {
            const parsedHistory: ChatMessage[] = storedHistory;
            if (parsedHistory.length > 0) {
              const lastMsg = [...parsedHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              conversations.push({
                entity,
                lastMessage: lastMsg,
                lastMessageTimestamp: lastMsg.timestamp,
              });
            }
          }
        } catch (error) {
          console.error(`Error loading chat history for ${entity.data.name}:`, error);
        }
      }

      // Sort by last message timestamp, newest first
      conversations.sort((a, b) => {
        if (!a.lastMessageTimestamp) return 1;
        if (!b.lastMessageTimestamp) return -1;
        return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
      });
      setRecentConversations(conversations);
    };

    loadConversations();
  }, [characters, groups]);
  
  const renderConversationItem = (conversation: RecentConversation) => {
    const { entity, lastMessage } = conversation;
    const isCharacter = entity.type === 'character';
    const data = entity.data;

    const lastMessageSenderChar = lastMessage?.sender === 'ai' && !isCharacter && lastMessage.senderCharacterId 
        ? characters.find(c => c.id === lastMessage.senderCharacterId) 
        : null;

    let lastMessagePrefix = '';
    if (lastMessage?.sender === 'user') {
        lastMessagePrefix = 'Bạn: ';
    } else if (lastMessageSenderChar) {
        lastMessagePrefix = `${lastMessageSenderChar.name}: `;
    }

    return (
        <div
          key={data.id}
          onClick={() => isCharacter ? onSelectCharacter(data as AIChatCharacter) : onSelectGroup(data as AIGroupChat)}
          className="bg-card-light dark:bg-card-dark p-2.5 sm:p-3 rounded-lg shadow-subtle hover:shadow-md transition-shadow cursor-pointer flex items-center space-x-2.5 sm:space-x-3"
        >
          <InitialAvatar
            name={data.name}
            avatarUrl={data.avatarUrl}
            animatedAvatarUrl={isCharacter ? (data as AIChatCharacter).animatedAvatarUrl : undefined}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0 bg-slate-200 dark:bg-slate-700"
            altText={`Avatar của ${data.name}`}
          />
          <div className="flex-grow min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-text-light dark:text-text-dark truncate">{data.name}</h3>
            {lastMessage && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate line-clamp-1">
                {lastMessagePrefix}{lastMessage.content || (lastMessage.imagePart ? '[Hình ảnh]' : '')}
              </p>
            )}
            {lastMessage && (
               <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {new Date(lastMessage.timestamp).toLocaleString('vi-VN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
               </p>
            )}
          </div>
          <i className="fas fa-chevron-right text-slate-300 dark:text-slate-500 text-xs sm:text-sm"></i>
        </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 flex-grow bg-slate-50 dark:bg-slate-900">
      <header className="mb-4 sm:mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-primary dark:text-primary-light">Lịch Sử Trò Chuyện</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Xem lại các cuộc trò chuyện gần đây.</p>
      </header>

      {recentConversations.length === 0 ? (
        <div className="text-center py-10">
          <i className="fas fa-comment-dots fa-3x text-slate-400 dark:text-slate-500 mb-4"></i>
          <p className="text-slate-500 dark:text-slate-400 text-md">Chưa có lịch sử trò chuyện nào.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Hãy bắt đầu một cuộc trò chuyện từ Trang Chủ!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recentConversations.map(renderConversationItem)}
        </div>
      )}
    </div>
  );
};

export default HistoryScreen;
