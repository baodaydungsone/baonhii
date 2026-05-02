
import React, { useState, useEffect, useRef, useCallback, ChangeEvent, ClipboardEvent } from 'react';
import { AIChatCharacter, AIGroupChat, ChatMessage, ModalType, NSFWPreferences, UserProfile, Settings } from '../types';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import {
    generateCharacterChatResponse,
    generateGroupChatResponse,
    generateUserReplySuggestion,
    extractKeyMemoriesFromHistory, 
    determineCharacterEmotion     
} from '../services/GeminiService';
import { useSettings } from '../contexts/SettingsContext';
import { usePublicToast } from '../contexts/ToastContext';
import { DEFAULT_AVATAR_PATH, DEFAULT_USER_NAME } from '../constants';
import { censorText } from '../services/ProfanityFilter'; 
import InitialAvatar from '../components/InitialAvatar';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';


interface ChatScreenProps {
  character: AIChatCharacter | null;
  group: AIGroupChat | null;
  allCharacters: AIChatCharacter[];
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onBack: () => void;
  openModal: (modalType: ModalType, data?: any) => void;
  nsfwSettings: NSFWPreferences;
  userProfile: UserProfile;
}

const ChatScreen: React.FC<ChatScreenProps> = ({
  character,
  group,
  allCharacters,
  messages,
  setMessages,
  onBack,
  openModal,
  nsfwSettings,
  userProfile,
}) => {
  const { settings, setSettings } = useSettings();
  const { addToast } = usePublicToast();
  const [userInput, setUserInput] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isRequestingSuggestion, setIsRequestingSuggestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [pastedImageToSend, setPastedImageToSend] = useState<{ dataUrl: string; mimeType: string } | null>(null);

  const [currentEmotion, setCurrentEmotion] = useState<string | null>("Neutral"); // For character emotion
  const [isProcessingMemoryOrEmotion, setIsProcessingMemoryOrEmotion] = useState(false);
  
  const [showMembersTooltip, setShowMembersTooltip] = useState(false);
  const membersTooltipRef = useRef<HTMLDivElement>(null);

  const isGroupChat = !!group;
  const activeChatPartner = isGroupChat ? group : character;

  useEffect(() => {
    if (!activeChatPartner) {
      onBack();
    }
  }, [activeChatPartner, onBack]);

  if (!activeChatPartner) return null;
  const activeChatId = activeChatPartner.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, pastedImagePreview, isLoadingAI]);

  useEffect(() => {
    textareaRef.current?.focus();
    setCurrentEmotion("Neutral");
  }, [character, group]);
  
  useEffect(() => {
    if (!showMembersTooltip) return;

    const handleClickOutside = (event: MouseEvent) => {
        if (membersTooltipRef.current && !membersTooltipRef.current.contains(event.target as Node)) {
            setShowMembersTooltip(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMembersTooltip]);

  useEffect(() => {
    if (character && messages.length === 0 && character.greetingMessage && !isLoadingAI) {
      const greetingMsg: ChatMessage = {
        id: `ai-greeting-${character.id}-${Date.now()}`,
        chatId: character.id,
        sender: 'ai',
        content: character.greetingMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages([greetingMsg]);
    }
  }, [character, messages, setMessages, isLoadingAI]);

  // Effect để tự động mở rộng chiều cao của khung nhập liệu khi người dùng nhập văn bản dài
  // Giúp giao diện linh hoạt và "to lên" theo nội dung như yêu cầu của cậu
  useEffect(() => {
    if (textareaRef.current) {
      // Debug log để theo dõi việc thay đổi kích thước trong console
      console.log(`[InputResizeDebug] User input length: ${userInput.length}, current scrollHeight: ${textareaRef.current.scrollHeight}`);
      
      // Reset chiều cao về mặc định để tính toán chính xác scrollHeight mới
      textareaRef.current.style.height = '42px'; 
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Đặt chiều cao mới dựa trên nội dung, giới hạn tối đa là 150px để không che hết màn hình
      const calculatedHeight = Math.min(scrollHeight, 150);
      textareaRef.current.style.height = `${calculatedHeight}px`;
      
      console.log(`[InputResizeDebug] Set new height to: ${calculatedHeight}px`);
    }
  }, [userInput]);

  const handleSendMessage = useCallback(async (messageContentOverride?: string) => {
    const originalContent = typeof messageContentOverride === 'string' ? messageContentOverride : userInput.trim();

    if ((!originalContent && !pastedImageToSend) || isLoadingAI || isRequestingSuggestion || isProcessingMemoryOrEmotion) return;
    if (!activeChatPartner) return;

    setIsLoadingAI(true);
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      chatId: activeChatId,
      sender: 'user',
      content: originalContent,
      timestamp: new Date().toISOString(),
      ...(pastedImageToSend && { imagePart: pastedImageToSend })
    };

    setMessages(prev => [...prev, userMessage]);
    
    if (typeof messageContentOverride !== 'string') setUserInput('');
    const imageToSend = pastedImageToSend;
    setPastedImagePreview(null);
    setPastedImageToSend(null);

    try {
        if (isGroupChat && group) {
            const groupMembers = allCharacters.filter(c => group.memberIds.includes(c.id));
            const responses = await generateGroupChatResponse(settings, group, groupMembers, [...messages, userMessage], originalContent, nsfwSettings, userProfile, imageToSend, userMessage.timestamp);
            const newAiMessages: ChatMessage[] = responses.map(res => ({
                id: `ai-group-${res.characterId}-${Date.now()}-${Math.random()}`,
                chatId: group.id,
                sender: 'ai',
                senderCharacterId: res.characterId,
                content: res.response,
                timestamp: new Date().toISOString(),
            }));
            setMessages(prev => [...prev, ...newAiMessages]);
        } else if (character) {
            setIsProcessingMemoryOrEmotion(true);
            let memoriesForPrompt: string[] = [];
            if (settings.enableMemory) {
                try {
                    memoriesForPrompt = await extractKeyMemoriesFromHistory(settings, character, userProfile, messages, userMessage);
                } catch (memError) {
                    console.error("Error extracting memories:", memError);
                    addToast({ message: "Lỗi khi AI cố gắng ghi nhớ chi tiết.", type: 'warning' });
                }
            }
            setIsProcessingMemoryOrEmotion(false);
            
            const historyForAI = [...messages, userMessage].map(msg => ({ ...msg, content: (msg.sender === 'user' && nsfwSettings.enabled) ? censorText(msg.content) : msg.content }));
            const aiResponseData = await generateCharacterChatResponse(settings, character, historyForAI, originalContent, nsfwSettings, userProfile, imageToSend, false, currentEmotion, memoriesForPrompt, userMessage.timestamp);
            const aiMessage: ChatMessage = {
                id: `ai-${Date.now()}`,
                chatId: character.id,
                sender: 'ai',
                content: aiResponseData.text,
                timestamp: new Date().toISOString(),
                groundingAttributions: aiResponseData.groundingAttributions,
            };
            setMessages(prev => [...prev, aiMessage]);
            if (settings.enableEmotions) {
                setIsProcessingMemoryOrEmotion(true);
                try {
                    const newEmotion = await determineCharacterEmotion(settings, character, userProfile, [...messages, userMessage, aiMessage]);
                    if (newEmotion) setCurrentEmotion(newEmotion);
                } catch (emoError) { console.error("Error determining emotion:", emoError); } 
                finally { setIsProcessingMemoryOrEmotion(false); }
            }
        }
    } catch (error: any) {
      console.error("Error getting AI response:", error);
      let errorMsg = `Lỗi từ AI: ${error.message || 'Không thể nhận phản hồi.'}`;
      const errorString = String(error.message || error).toLowerCase();
      
      // Preserve detailed proxy errors if they come from our GeminiService
      if (errorString.includes("[proxyerror]")) {
        errorMsg = `Lỗi từ Proxy: ${error.message.replace("[ProxyError] ", "")}`;
      } else if (errorString.includes("lỗi từ proxy/google")) {
        errorMsg = error.message;
      } else if (errorString.includes("api key") || errorString.includes("billing") || errorString.includes("quota") || errorString.includes("permission denied")) {
        errorMsg = "Lỗi API Key: Key không hợp lệ, hết hạn, hoặc có vấn đề thanh toán. Vui lòng kiểm tra cài đặt API Key và thử lại.";
        if(settings.apiProvider === 'geminiCustom') setSettings(s => ({...s, apiKeyStatus: 'invalid'}));
      }
      addToast({ message: errorMsg, type: 'error', duration: 10000 });
    } finally {
        setIsLoadingAI(false);
        setIsProcessingMemoryOrEmotion(false);
        textareaRef.current?.focus();
    }
  }, [userInput, pastedImageToSend, isLoadingAI, isRequestingSuggestion, isProcessingMemoryOrEmotion, activeChatPartner, messages, setMessages, settings, nsfwSettings, addToast, userProfile, setSettings, currentEmotion, allCharacters, isGroupChat, group, character, activeChatId]);

  const handleRequestSuggestion = useCallback(async () => {
    if (isLoadingAI || isRequestingSuggestion || isProcessingMemoryOrEmotion || !character) return;

    setIsRequestingSuggestion(true);
    addToast({ message: "AI đang nghĩ gợi ý tin nhắn...", type: 'info', duration: 3000 });

    try {
      const userSuggestedMessage = await generateUserReplySuggestion(settings, character, messages, userProfile);
      setUserInput(userSuggestedMessage);
      addToast({ message: "Gợi ý đã được điền vào ô nhập liệu!", type: 'success' });

    } catch (error: any) {
      console.error("Error in suggestion flow:", error);
      addToast({ message: `Lỗi gợi ý: ${error.message || 'Không thể tạo gợi ý.'}`, type: 'error' });
    } finally {
      setIsRequestingSuggestion(false);
      textareaRef.current?.focus();
    }
  }, [character, messages, settings, addToast, isLoadingAI, isRequestingSuggestion, userProfile, isProcessingMemoryOrEmotion]);


  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteHistory = () => {
    if (window.confirm(`Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện với ${activeChatPartner.name} không?`)) {
      setMessages([]);
      if(!isGroupChat) setCurrentEmotion("Neutral");
      addToast({ message: `Đã xóa lịch sử chat với ${activeChatPartner.name}.`, type: 'info' });
    }
  };

  const handleEditChatPartner = () => {
    if (isGroupChat) {
        openModal(ModalType.GroupCreation, group);
    } else {
        openModal(ModalType.CharacterCreation, character);
    }
  }

  const handleToggleWebSearch = () => {
    let newState = false;
    setSettings(prev => {
        newState = !prev.enableWebSearch;
        return {...prev, enableWebSearch: newState };
    });
    addToast({ message: `Tìm kiếm trên web ${newState ? "đã bật" : "đã tắt"}.`, type: 'info' });
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result && typeof e.target.result === 'string') {
              setPastedImagePreview(e.target.result);
              setPastedImageToSend({ dataUrl: e.target.result, mimeType: file.type });
              addToast({ message: "Đã dán hình ảnh.", type: "info" });
            }
          };
          reader.readAsDataURL(file);
          event.preventDefault();
          return;
        }
      }
    }
  };

  const removePastedImage = () => {
    setPastedImagePreview(null);
    setPastedImageToSend(null);
  };
  
   const handleInitiateEdit = useCallback((messageIdToEdit: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageIdToEdit);
    if (messageIndex === -1 || messages[messageIndex].sender !== 'user') return;

    const messageToEdit = messages[messageIndex];
    setUserInput(messageToEdit.content);
    if (messageToEdit.imagePart) {
        setPastedImagePreview(messageToEdit.imagePart.dataUrl);
        setPastedImageToSend({dataUrl: messageToEdit.imagePart.dataUrl, mimeType: messageToEdit.imagePart.mimeType });
    } else {
        setPastedImagePreview(null);
        setPastedImageToSend(null);
    }
    
    let messagesToRemoveIds = [messageIdToEdit];
    const userMessageIndexInFullArray = messages.findIndex(m => m.id === messageIdToEdit);
    const isLastUserMsg = messages.filter(m => m.sender === 'user').pop()?.id === messageIdToEdit;
    
    if (isLastUserMsg && userMessageIndexInFullArray + 1 < messages.length) {
        // In group chats, multiple AI messages can follow. Remove all of them until next user message or end.
        for (let i = userMessageIndexInFullArray + 1; i < messages.length; i++) {
            if (messages[i].sender === 'ai') {
                messagesToRemoveIds.push(messages[i].id);
            } else {
                break; // Stop at the next user message
            }
        }
    }

    const aiMessagesRemoved = messagesToRemoveIds.length > 1;
    setMessages(prev => prev.filter(m => !messagesToRemoveIds.includes(m.id)));
    addToast({ message: "Nội dung tin nhắn đã được đưa vào ô nhập. Hãy sửa và gửi lại.", type: 'info' });
    textareaRef.current?.focus();
    if (isLoadingAI && aiMessagesRemoved) {
        setIsLoadingAI(false);
        setIsProcessingMemoryOrEmotion(false);
    }
  }, [messages, setMessages, setUserInput, addToast, isLoadingAI]);

  const handleDeleteMessage = useCallback((messageIdToDelete: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageIdToDelete));
    addToast({ message: "Đã xóa tin nhắn.", type: 'success' });
  }, [setMessages, addToast]);

  const handleImageUploadClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          setPastedImagePreview(e.target.result);
          setPastedImageToSend({ dataUrl: e.target.result, mimeType: file.type });
          addToast({ message: "Đã chọn hình ảnh.", type: "info" });
        }
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  };

  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const chatBackgroundSettings = settings.chatBackground;
  const trimmedImageUrl = chatBackgroundSettings?.imageUrl?.trim();

  return (
    <div className="flex flex-col h-screen relative">
      {chatBackgroundSettings?.enabled && trimmedImageUrl && (
        <div
          style={{ backgroundImage: `url(${trimmedImageUrl})`, filter: `blur(${chatBackgroundSettings.blur || 0}px)`, opacity: chatBackgroundSettings.opacity || 1 }}
          className="absolute inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
          aria-hidden="true"
        />
      )}

      <header className="flex-shrink-0 bg-white dark:bg-slate-800 shadow-md p-3 sm:p-4 flex items-center justify-between relative z-[2]">
        <div className="flex items-center min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2 p-2 rounded-full"><i className="fas fa-arrow-left text-lg"></i></Button>
          <button
            type="button"
            onClick={() => openModal(ModalType.ImagePreview, { imageUrl: isGroupChat ? group?.avatarUrl : (character?.animatedAvatarUrl || character?.avatarUrl) })}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-full"
            aria-label={`Xem ảnh đại diện của ${activeChatPartner.name}`}
            title={`Xem ảnh đại diện của ${activeChatPartner.name}`}
          >
            <InitialAvatar
              name={activeChatPartner.name}
              avatarUrl={activeChatPartner.avatarUrl}
              animatedAvatarUrl={!isGroupChat ? character?.animatedAvatarUrl : undefined}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-3 object-cover flex-shrink-0 bg-slate-300 dark:bg-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
            />
          </button>
          <div className="flex flex-col min-w-0">
            <h2 className="text-md sm:text-lg font-semibold text-text-light dark:text-text-dark truncate">{activeChatPartner.name}</h2>
            {isGroupChat && (
                <div className="relative" ref={membersTooltipRef}>
                    <button
                        type="button"
                        className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
                        onClick={() => setShowMembersTooltip(prev => !prev)}
                        aria-haspopup="true"
                        aria-expanded={showMembersTooltip}
                    >
                        {group?.memberIds.length} thành viên
                    </button>
                    {showMembersTooltip && (
                        <div 
                            className="absolute z-30 top-full left-0 mt-2 w-max max-w-xs bg-card-light dark:bg-card-dark rounded-lg shadow-xl p-3 border border-border-light dark:border-border-dark animate-fadeIn"
                            role="tooltip"
                        >
                            <h4 className="font-bold mb-2 text-sm text-text-light dark:text-text-dark border-b border-border-light dark:border-border-dark pb-1.5">
                                Thành viên nhóm:
                            </h4>
                            {group?.memberIds && group.memberIds.length > 0 ? (
                                <ul className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {group.memberIds.map(id => {
                                        const member = allCharacters.find(c => c.id === id);
                                        return (
                                            <li key={id} className="text-sm text-text-light dark:text-text-dark flex items-center gap-2">
                                                <InitialAvatar name={member?.name || '?'} avatarUrl={member?.avatarUrl} animatedAvatarUrl={member?.animatedAvatarUrl} className="w-5 h-5 rounded-full" />
                                                <span>{member?.name || 'Nhân vật không xác định'}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Không có thành viên nào.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
        <div className="relative">
           <Button variant="ghost" size="sm" onClick={() => setIsChatMenuOpen(prev => !prev)} className="p-2 rounded-full"><i className="fas fa-ellipsis-v text-lg"></i></Button>
           {isChatMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-700 rounded-lg shadow-xl py-1.5 z-20 border border-border-light dark:border-border-dark" role="menu">
                {isGroupChat ? (
                  <button role="menuitem" onClick={() => { handleEditChatPartner(); setIsChatMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-600/70 transition-colors flex items-center gap-2"><i className="fas fa-users-cog w-4 text-center"></i> Chỉnh Sửa Nhóm</button>
                ) : (
                  <button role="menuitem" onClick={() => { handleEditChatPartner(); setIsChatMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-600/70 transition-colors flex items-center gap-2"><i className="fas fa-user-edit w-4 text-center"></i> Sửa Hồ Sơ Nhân Vật</button>
                )}
                <button role="menuitem" onClick={() => { openModal(ModalType.ChatBackgroundSettings); setIsChatMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-600/70 transition-colors flex items-center gap-2"><i className="fas fa-image w-4 text-center"></i> Tùy Chỉnh Hình Nền Chat</button>
                 <div role="menuitemcheckbox" aria-checked={settings.enableWebSearch} className="w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-600/70 transition-colors flex items-center gap-2 cursor-pointer" onClick={() => { handleToggleWebSearch(); setIsChatMenuOpen(false);}} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { handleToggleWebSearch(); setIsChatMenuOpen(false);}}}>
                    <i className={`fas ${settings.enableWebSearch ? 'fa-globe-americas' : 'fa-search-slash'} w-4 text-center`}></i>
                    <span className="flex-grow" id="web-search-label">Cho phép AI tìm kiếm web</span>
                    <input type="checkbox" className="form-checkbox h-4 w-4 text-primary dark:text-primary-light rounded border-gray-300 dark:border-gray-500 focus:ring-primary dark:focus:ring-primary-light" checked={settings.enableWebSearch} readOnly aria-labelledby="web-search-label" tabIndex={-1} />
                </div>
                <button role="menuitem" onClick={() => { handleDeleteHistory(); setIsChatMenuOpen(false);}} className="block w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2"><i className="fas fa-trash-alt w-4 text-center"></i> Xóa Lịch Sử Chat</button>
             </div>
           )}
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-3 sm:p-4 custom-scrollbar relative z-[1]">
        <div className="flex flex-col h-full">
            <div className="space-y-3">
                {messages.length === 0 && !isLoadingAI && (
                <div className="text-center text-slate-500 dark:text-slate-400 mt-10 p-4 rounded-lg bg-slate-200/50 dark:bg-slate-700/30 max-w-md mx-auto">
                    <InitialAvatar name={activeChatPartner.name} avatarUrl={activeChatPartner.avatarUrl} animatedAvatarUrl={!isGroupChat ? character?.animatedAvatarUrl : undefined} className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-600"/>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Bắt đầu trò chuyện với {activeChatPartner.name}!</p>
                    <p className="text-xs mt-1">{`Hãy gửi tin nhắn đầu tiên cho ${isGroupChat ? 'nhóm' : activeChatPartner.name}.`}</p>
                    <p className="text-xs mt-1">Bạn đang chat với tư cách là <span className="font-semibold">{userProfile.name}</span>.</p>
                     {settings.enableWebSearch && (<p className="text-xs mt-2 text-green-600 dark:text-green-400"><i className="fas fa-globe-americas mr-1"></i>AI có thể tìm kiếm thông tin trên web.</p>)}
                </div>
                )}
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} allCharacters={allCharacters} isGroupChat={isGroupChat} openModal={openModal} onEditRequest={handleInitiateEdit} onDeleteRequest={handleDeleteMessage} />
                ))}
                {isLoadingAI && (
                  <div className="mt-3">
                    <TypingIndicator characterName={isGroupChat ? "AI" : character!.name} avatarUrl={isGroupChat ? '' : character!.avatarUrl} animatedAvatarUrl={isGroupChat ? '' : character!.animatedAvatarUrl} />
                  </div>
                )}
            </div>
            <div ref={messagesEndRef} className="mt-auto flex-shrink-0" style={{height: '1px'}} />
        </div>
      </main>

      <footer className="flex-shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 relative z-[2]">
        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileSelected} />
        
        <AnimatePresence>
          {pastedImagePreview && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mb-2 p-2 border border-dashed border-primary dark:border-primary-light rounded-lg relative max-w-xs mx-auto sm:mx-0"
            >
              <img src={pastedImagePreview} alt="Pasted preview" className="max-h-24 max-w-full rounded object-contain" />
              <Button variant="danger" size="xs" onClick={removePastedImage} className="!absolute -top-2 -right-2 !rounded-full !p-0 w-6 h-6" title="Xóa ảnh đã dán"><i className="fas fa-times"></i></Button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout className="flex items-end space-x-2">
           <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
             <Button 
                onClick={handleRequestSuggestion} 
                isLoading={isRequestingSuggestion} 
                disabled={isGroupChat || isLoadingAI || isRequestingSuggestion || isProcessingMemoryOrEmotion} 
                className="!rounded-full !p-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-secondary hover:bg-secondary-dark dark:bg-secondary-dark dark:hover:bg-secondary text-white shadow-sm" 
                aria-label="Gợi ý tin nhắn" 
                title={isGroupChat ? "Gợi ý chưa hỗ trợ trong chat nhóm" : "Gợi ý tin nhắn"}
              >
                <i className="fas fa-lightbulb text-md sm:text-lg"></i>
              </Button>
           </motion.div>

           <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
             <Button 
                onClick={handleImageUploadClick} 
                disabled={isLoadingAI || isRequestingSuggestion || isProcessingMemoryOrEmotion} 
                className="!rounded-full !p-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white shadow-sm" 
                aria-label="Gửi hình ảnh" 
                title="Gửi hình ảnh"
              >
                <i className="fas fa-image text-md sm:text-lg"></i>
              </Button>
           </motion.div>

          <motion.div layout className="flex-grow">
            <Textarea
              ref={textareaRef} 
              value={userInput} 
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setUserInput(e.target.value)} 
              onKeyDown={handleKeyDown} 
              onPaste={handlePaste}
              placeholder={`Nhắn tin với ${activeChatPartner.name}...`}
              rows={1} 
              className="w-full !py-2.5 !px-3.5 text-sm resize-none custom-scrollbar !rounded-2xl transition-all duration-300 bg-slate-100 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light"
              wrapperClass="!mb-0" 
              disabled={isLoadingAI || isRequestingSuggestion || isProcessingMemoryOrEmotion}
              style={{ minHeight: '42px' }}
            />
          </motion.div>

          <motion.div 
            animate={{ 
              scale: (userInput.trim() || pastedImageToSend) ? 1 : 0.9,
              opacity: (userInput.trim() || pastedImageToSend) ? 1 : 0.7
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button 
              onClick={() => handleSendMessage()} 
              isLoading={isLoadingAI || isProcessingMemoryOrEmotion} 
              disabled={isLoadingAI || isRequestingSuggestion || isProcessingMemoryOrEmotion || (!userInput.trim() && !pastedImageToSend)} 
              className="!rounded-full !p-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-primary hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary shadow-lg" 
              aria-label="Gửi tin nhắn"
            >
              <i className="fas fa-paper-plane text-white text-md sm:text-lg"></i>
            </Button>
          </motion.div>
        </motion.div>
      </footer>
    </div>
  );
};

export default ChatScreen;
