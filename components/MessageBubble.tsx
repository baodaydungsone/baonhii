
import React, { useState, useEffect, useRef } from 'react';
import { AIChatCharacter, ChatMessage, ModalType } from '../types';
import { DEFAULT_USER_NAME } from '../constants';
import InitialAvatar from './InitialAvatar';
import { useSettings } from '../contexts/SettingsContext';
import { usePublicToast } from '../contexts/ToastContext';

interface MessageBubbleProps {
  message: ChatMessage;
  allCharacters: AIChatCharacter[];
  isGroupChat: boolean;
  openModal: (modalType: ModalType, data?: any) => void;
  onEditRequest: (messageId: string) => void;
  onDeleteRequest: (messageId: string) => void;
}

function parseTextSegment(text: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    const markdownRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
    let match;

    while ((match = markdownRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            elements.push(text.substring(lastIndex, match.index));
        }
        if (match[2]) {
            elements.push(<strong key={`strong-${lastIndex}-${match.index}`}>{match[2]}</strong>);
        } else if (match[4]) {
            elements.push(<em key={`italic-${lastIndex}-${match.index}`} className="text-slate-500 dark:text-slate-400">{match[4]}</em>);
        }
        lastIndex = markdownRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        elements.push(text.substring(lastIndex));
    }
    return elements;
}

const parseContentToJSX = (content: string): React.ReactNode => {
    if (!content) return '';
    const urlRegex = /(https?:\/\/[^\s"<>{}|\^`\\]+)/g;
    const segments = content.split(urlRegex);
    const jsxElements: React.ReactNode[] = [];

    for (let i = 0; i < segments.length; i++) {
        if (i % 2 === 0) {
            if (segments[i]) {
                 jsxElements.push(...parseTextSegment(segments[i]));
            }
        } else {
            if (segments[i]) {
                jsxElements.push(
                    <a key={`url-${i}-${segments[i]}`} href={segments[i]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {segments[i]}
                    </a>
                );
            }
        }
    }
    return jsxElements.map((el, idx) => <React.Fragment key={`frag-${idx}`}>{el}</React.Fragment>);
};


const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    allCharacters,
    isGroupChat,
    openModal,
    onEditRequest,
    onDeleteRequest
}) => {
  const { userProfile } = useSettings(); 
  const { addToast } = usePublicToast();
  const isUser = message.sender === 'user';
  const [showUserActions, setShowUserActions] = useState(false);
  const [showAiActions, setShowAiActions] = useState(false);
  const userActionsMenuRef = useRef<HTMLDivElement>(null);
  const aiActionsMenuRef = useRef<HTMLDivElement>(null);

  const speakingCharacter = !isUser 
    ? allCharacters.find(c => c.id === message.senderCharacterId) || allCharacters.find(c => c.id === message.chatId)
    : null;

  const currentUserAvatarSrc = userProfile.avatarUrl; 
  const currentUserName = userProfile.name || DEFAULT_USER_NAME;

  const avatarSizeClasses = "w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shadow-sm bg-slate-300 dark:bg-slate-600 flex-shrink-0";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userActionsMenuRef.current && !userActionsMenuRef.current.contains(event.target as Node)) setShowUserActions(false);
      if (aiActionsMenuRef.current && !aiActionsMenuRef.current.contains(event.target as Node)) setShowAiActions(false);
    };
    if (showUserActions || showAiActions) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserActions, showAiActions]);

  const handleCopyToClipboard = async () => {
    if (!message.content) {
      addToast({ message: "Không có nội dung để sao chép.", type: 'warning' });
      return;
    }
    try {
      await navigator.clipboard.writeText(message.content);
      addToast({ message: "Đã sao chép nội dung tin nhắn!", type: 'success' });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      addToast({ message: "Lỗi khi sao chép tin nhắn.", type: 'error' });
    }
    setShowAiActions(false);
  };

  const nameToShow = isUser ? currentUserName : speakingCharacter?.name || 'AI';
  const avatarUrlToShow = isUser ? currentUserAvatarSrc : speakingCharacter?.avatarUrl;
  const animatedAvatarUrlToShow = isUser ? undefined : speakingCharacter?.animatedAvatarUrl;

  return (
    <div className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} relative`}>
      {isGroupChat && !isUser && speakingCharacter && (
        <span className="text-xs text-slate-500 dark:text-slate-400 ml-10 mb-0.5">{speakingCharacter.name}</span>
      )}
      <div className={`flex items-end space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : 'justify-start'} w-full`}>
        <button
          type="button"
          onClick={() => openModal && (animatedAvatarUrlToShow || avatarUrlToShow) && openModal(ModalType.ImagePreview, { imageUrl: animatedAvatarUrlToShow || avatarUrlToShow })}
          disabled={!(animatedAvatarUrlToShow || avatarUrlToShow)}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-full self-start"
          aria-label={`Xem ảnh đại diện của ${nameToShow}`}
          title={(animatedAvatarUrlToShow || avatarUrlToShow) ? `Xem ảnh đại diện của ${nameToShow}` : nameToShow}
        >
          <InitialAvatar
            name={nameToShow}
            avatarUrl={avatarUrlToShow}
            animatedAvatarUrl={animatedAvatarUrlToShow}
            className={`${avatarSizeClasses} ${avatarUrlToShow ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          />
        </button>

        <div className={`relative flex items-center ${isUser ? 'flex-row' : 'flex-row-reverse'}`}> 
          <div className="relative">
            <button
              onClick={() => isUser ? setShowUserActions(s => !s) : setShowAiActions(s => !s)}
              className={`p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary mx-1 self-center`}
              aria-label="Tùy chọn tin nhắn"
            >
              <i className="fas fa-ellipsis-h text-sm"></i>
            </button>
            {isUser && showUserActions && (
              <div ref={userActionsMenuRef} className="absolute z-10 w-36 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 border border-border-light dark:border-border-dark" style={{ top: '-8px', right: 'calc(100% + 4px)'}}>
                <button onClick={() => { onEditRequest(message.id); setShowUserActions(false); }} className="block w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"><i className="fas fa-pencil-alt w-3 text-center"></i>Sửa</button>
                <button onClick={() => { onDeleteRequest(message.id); setShowUserActions(false); }} className="block w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-800/50 transition-colors flex items-center gap-2"><i className="fas fa-trash-alt w-3 text-center"></i>Xóa</button>
              </div>
            )}
            {!isUser && showAiActions && (
              <div ref={aiActionsMenuRef} className="absolute z-10 w-40 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 border border-border-light dark:border-border-dark" style={{ top: '-8px', left: 'calc(100% + 4px)'}}>
                <button onClick={handleCopyToClipboard} className="block w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"><i className="fas fa-copy w-3 text-center"></i>Sao chép nội dung</button>
              </div>
            )}
          </div>
          <div className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg text-sm sm:text-base leading-relaxed shadow-sm ${isUser ? 'bg-primary text-white dark:bg-primary-dark dark:text-gray-100 rounded-br-lg' : 'bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 rounded-bl-lg'}`}>
            {message.imagePart && (
              <div className="mb-1.5 max-w-xs max-h-48 overflow-hidden rounded-md">
                <img src={message.imagePart.dataUrl} alt="Hình ảnh đính kèm" className="w-full h-full object-contain cursor-pointer" onClick={() => openModal && openModal(ModalType.ImagePreview, { imageUrl: message.imagePart?.dataUrl })} />
              </div>
            )}
            {message.content && <div className="whitespace-pre-wrap break-words">{parseContentToJSX(message.content)}</div>}
            {!isUser && message.groundingAttributions && message.groundingAttributions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600 text-xs">
                <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-1 opacity-80">Nguồn tham khảo:</h4>
                <ul className="space-y-0.5">
                  {message.groundingAttributions.map((attr, index) => (attr.web && attr.web.uri && (
                    <li key={`grounding-${message.id}-${index}`} className="truncate">
                      <a href={attr.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1" title={attr.web.uri} onClick={(e) => e.stopPropagation()}>
                        <i className="fas fa-link fa-xs opacity-70"></i>{attr.web.title || attr.web.uri}
                      </a>
                    </li>
                  )))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;