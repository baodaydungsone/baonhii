
import React, { useState, useEffect } from 'react';
import Modal from '../Modal'; 
import Button from '../Button'; 
import Input from '../Input';   
import Textarea from '../Textarea'; 
import { AIChatCharacter, AISuggestionField, AISuggestionLoadingState, AIGenerationLoadingState, AIGenerationType } from '../../types'; 
import { usePublicToast } from '../../contexts/ToastContext'; 
import { generateAIChatCreativeHelp, generateFullCharacterConcept, extractCharacterDetailsFromText } from '../../services/GeminiService';
import { useSettings } from '../../contexts/SettingsContext';
import InitialAvatar from '../InitialAvatar';

interface CharacterCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCharacter: (character: AIChatCharacter) => void;
  existingCharacter?: AIChatCharacter | null; 
}

type ActiveTab = 'manual' | 'randomAI' | 'extractAI';

const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({
  isOpen,
  onClose,
  onSaveCharacter,
  existingCharacter,
}) => {
  const { addToast } = usePublicToast();
  const { settings } = useSettings(); 
  const [character, setCharacter] = useState<Partial<AIChatCharacter>>({
    name: '', avatarUrl: '', animatedAvatarUrl: '', personality: '', greetingMessage: '',
    voiceTone: '', exampleResponses: '',
  });
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('manual');
  
  const [randomGenTheme, setRandomGenTheme] = useState('');
  const [randomGenIdea, setRandomGenIdea] = useState('');
  const [extractText, setExtractText] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState<AIGenerationLoadingState>({});


  const [isLoadingFieldSuggestion, setIsLoadingFieldSuggestion] = useState<AISuggestionLoadingState>({
    name: false, personality: false, greeting: false, voiceTone: false, example: false,
  });

  useEffect(() => {
    if (isOpen) {
        if (existingCharacter) {
            setCharacter(existingCharacter);
        } else {
            setCharacter({
                name: '', avatarUrl: '', animatedAvatarUrl: '', personality: '', greetingMessage: '',
                voiceTone: '', exampleResponses: '',
            });
        }
        setActiveTab('manual'); 
        setRandomGenTheme('');
        setRandomGenIdea('');
        setExtractText('');
        setIsAIGenerating({});
        setIsLoadingFieldSuggestion({ name: false, personality: false, greeting: false, voiceTone: false, example: false });
        // Clear file inputs when modal opens/changes character
        const avatarFileInput = document.getElementById('avatar-file-upload') as HTMLInputElement;
        if (avatarFileInput) avatarFileInput.value = '';
        const animatedAvatarFileInput = document.getElementById('animated-avatar-file-upload') as HTMLInputElement;
        if (animatedAvatarFileInput) animatedAvatarFileInput.value = '';
    }
  }, [existingCharacter, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCharacter((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCharacter((prev) => ({ ...prev, avatarUrl: result })); 
      };
      reader.readAsDataURL(file);
    } else {
        // If file is deselected, retain existing URL if any, or clear if no URL
        const currentAvatar = character.avatarUrl?.startsWith('data:image/') ? '' : character.avatarUrl;
        setCharacter(prev => ({ ...prev, avatarUrl: currentAvatar || '' })); 
    }
  };
  
  const handleAvatarUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCharacter((prev) => ({ ...prev, avatarUrl: url }));
  };

  const handleAnimatedAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "image/gif") {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setCharacter((prev) => ({ ...prev, animatedAvatarUrl: result }));
        };
        reader.readAsDataURL(file);
      } else {
        addToast({ message: "Vui lòng chọn một file GIF hợp lệ.", type: 'error'});
        e.target.value = ''; // Clear the file input
      }
    } else {
        // If file is deselected, retain existing URL if any, or clear if no URL
        const currentAnimatedAvatar = character.animatedAvatarUrl?.startsWith('data:image/gif') ? '' : character.animatedAvatarUrl;
        setCharacter(prev => ({ ...prev, animatedAvatarUrl: currentAnimatedAvatar || '' }));
    }
  };

  const handleAnimatedAvatarUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCharacter((prev) => ({ ...prev, animatedAvatarUrl: url }));
  };

  const clearAnimatedAvatar = () => {
    setCharacter(prev => ({...prev, animatedAvatarUrl: ''}));
    const animatedAvatarFileInput = document.getElementById('animated-avatar-file-upload') as HTMLInputElement;
    if (animatedAvatarFileInput) animatedAvatarFileInput.value = '';
    addToast({message: "Đã xóa ảnh đại diện động.", type: "info"})
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!character.name?.trim()) {
      addToast({ message: "Tên nhân vật không được để trống.", type: 'error' });
      setActiveTab('manual'); return;
    }
    if (!character.personality?.trim()) {
      addToast({ message: "Mô tả tính cách không được để trống.", type: 'error' });
      setActiveTab('manual'); return;
    }
     if (!character.greetingMessage?.trim()) {
      addToast({ message: "Lời chào không được để trống.", type: 'error' });
      setActiveTab('manual'); return;
    }

    const finalCharacter: AIChatCharacter = {
      id: existingCharacter?.id || `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: character.name.trim(),
      avatarUrl: character.avatarUrl?.trim() || '', 
      animatedAvatarUrl: character.animatedAvatarUrl?.trim() || '',
      personality: character.personality.trim(),
      greetingMessage: character.greetingMessage.trim(),
      voiceTone: character.voiceTone?.trim() || '',
      exampleResponses: typeof character.exampleResponses === 'string' ? character.exampleResponses.trim() : '',
      systemPrompt: character.systemPrompt?.trim() || '', 
      createdAt: existingCharacter?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveCharacter(finalCharacter);
  };
  

  const handleAISuggestionForField = async (
    fieldType: AISuggestionField,
    geminiPromptType: "charName" | "charPersonality" | "charGreeting" | "charVoiceTone" | "charExamplePair"
  ) => {
    setIsLoadingFieldSuggestion(prev => ({ ...prev, [fieldType]: true }));
    try {
      const suggestion = await generateAIChatCreativeHelp( 
        settings, 
        geminiPromptType,
        { 
          currentName: character.name, 
          currentPersonality: character.personality,
          currentGreeting: character.greetingMessage,
          currentVoiceTone: character.voiceTone,
          existingExamples: typeof character.exampleResponses === 'string' ? character.exampleResponses : '',
        }
      );
      
      if (geminiPromptType === 'charExamplePair') {
        setCharacter(prev => {
          const currentExamples = typeof prev.exampleResponses === 'string' ? prev.exampleResponses : '';
          const updatedExamples = currentExamples && suggestion
                                  ? `${currentExamples}\n\n${suggestion}` 
                                  : (currentExamples || suggestion); 
          return { ...prev, exampleResponses: updatedExamples };
        });
      } else {
        const fieldToUpdate = fieldType === 'greeting' ? 'greetingMessage' : fieldType;
        setCharacter(prev => ({ ...prev, [fieldToUpdate]: suggestion }));
      }
      addToast({ message: `AI đã gợi ý ${fieldType === 'greeting' ? 'lời chào' : fieldType === 'voiceTone' ? 'giọng điệu' : fieldType}.`, type: 'success' });
    } catch (error: any) {
      console.error(`Error getting AI suggestion for ${fieldType}:`, error);
      addToast({ message: `Lỗi khi lấy gợi ý từ AI: ${error.message}`, type: 'error' });
    } finally {
      setIsLoadingFieldSuggestion(prev => ({ ...prev, [fieldType]: false }));
    }
  };


  const AISuggestButton: React.FC<{ fieldType: AISuggestionField; onClick: () => void; className?: string; title: string }> = ({ fieldType, onClick, className, title }) => (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      isLoading={isLoadingFieldSuggestion[fieldType]}
      className={`!p-1.5 h-7 w-7 rounded-full text-primary dark:text-primary-light ${className}`}
      title={title}
    >
      {!isLoadingFieldSuggestion[fieldType] && <i className="fas fa-magic"></i>}
    </Button>
  );

  const handleFullRandomGeneration = async () => {
    setIsAIGenerating(prev => ({...prev, fullRandom: true}));
    try {
        const aiGeneratedCharacter = await generateFullCharacterConcept(
            settings, 
            randomGenTheme, 
            randomGenIdea
        );
        setCharacter(prev => ({
            ...prev, 
            name: aiGeneratedCharacter.name || prev.name,
            personality: aiGeneratedCharacter.personality || prev.personality,
            greetingMessage: aiGeneratedCharacter.greetingMessage || prev.greetingMessage,
            voiceTone: aiGeneratedCharacter.voiceTone || prev.voiceTone,
            exampleResponses: aiGeneratedCharacter.exampleResponses || (typeof prev.exampleResponses === 'string' ? prev.exampleResponses : ''),
        }));
        addToast({message: "AI đã tạo xong một nhân vật brouillon! Hãy kiểm tra và tinh chỉnh ở tab 'Thiết Lập Thủ Công'.", type: 'success', duration: 7000});
        setActiveTab('manual'); 
    } catch (error: any) {
        console.error("Error generating full random character:", error);
        addToast({ message: `Lỗi khi AI tạo nhân vật: ${error.message}`, type: 'error', duration: 7000 });
    } finally {
        setIsAIGenerating(prev => ({...prev, fullRandom: false}));
    }
  };

  const handleExtractFromText = async () => {
    if (!extractText.trim()) {
        addToast({message: "Vui lòng nhập mô tả nhân vật để AI trích xuất.", type: 'warning'});
        return;
    }
    setIsAIGenerating(prev => ({...prev, extractFromText: true}));
    try {
        const extractedDetails = await extractCharacterDetailsFromText(
            settings, 
            extractText
        ); 
        setCharacter(prev => ({
            ...prev, 
            name: extractedDetails.name || prev.name,
            personality: extractedDetails.personality || prev.personality,
            greetingMessage: extractedDetails.greetingMessage || prev.greetingMessage,
            voiceTone: extractedDetails.voiceTone || prev.voiceTone,
            exampleResponses: extractedDetails.exampleResponses || (typeof prev.exampleResponses === 'string' ? prev.exampleResponses : ''),
        }));
        addToast({message: "AI đã trích xuất thông tin nhân vật! Hãy kiểm tra và tinh chỉnh ở tab 'Thiết Lập Thủ Công'.", type: 'success', duration: 7000});
        setActiveTab('manual'); 
    } catch (error: any) {
        console.error("Error extracting character from text:", error);
        addToast({ message: `Lỗi khi AI trích xuất: ${error.message}`, type: 'error', duration: 7000 });
    } finally {
        setIsAIGenerating(prev => ({...prev, extractFromText: false}));
    }
  };

  const TabButton: React.FC<{tabId: ActiveTab; title: string; icon: string;}> = ({ tabId, title, icon }) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === tabId}
      onClick={() => setActiveTab(tabId)}
      className={`flex-1 sm:flex-initial sm:flex-shrink-0 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                  transition-all duration-200 ease-in-out flex items-center justify-center gap-2
                  ${activeTab === tabId
                    ? 'border-primary text-primary dark:border-primary-light dark:text-primary-light bg-primary/5 dark:bg-primary-light/10'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
    >
      <i className={`fas ${icon} text-base`}></i>
      <span className="hidden sm:inline">{title}</span>
      <span className="sm:hidden">{title.split(' ')[0]}</span>
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingCharacter ? "Chỉnh Sửa Nhân vật AI" : "Khởi Tạo Nhân Vật AI Mới"} size="2xl">
      <div className="flex flex-col sm:flex-row border-b border-border-light dark:border-border-dark mb-2 sm:mb-4 -mt-2 sm:-mt-3 overflow-x-auto no-scrollbar">
        <TabButton tabId="manual" title="Thiết Lập Thủ Công" icon="fa-sliders-h" />
        <TabButton tabId="randomAI" title="AI Khởi Tạo Ngẫu Nhiên" icon="fa-dice-d20" />
        <TabButton tabId="extractAI" title="AI Trích Xuất Từ Văn Bản" icon="fa-file-import" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
        {activeTab === 'manual' && (
          <div className="animate-fadeIn">
            <div className="md:grid md:grid-cols-3 md:gap-4 items-start">
                <div className="md:col-span-1 mb-4 md:mb-0">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Ảnh Đại Diện:</label>
                    <InitialAvatar
                        name={character.name || ''}
                        avatarUrl={character.avatarUrl || ''}
                        animatedAvatarUrl={character.animatedAvatarUrl || ''}
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover border-2 border-primary/20 dark:border-primary-light/20 shadow-md mx-auto md:mx-0"
                        altText="Xem trước Ảnh Đại Diện"
                    />
                     {character.animatedAvatarUrl && (
                        <Button 
                            type="button" 
                            size="xs" 
                            variant="danger" 
                            onClick={clearAnimatedAvatar} 
                            className="!py-1 !px-2 mt-1.5 mx-auto md:mx-0 block"
                            leftIcon={<i className="fas fa-times"></i>}
                        >
                            Xóa GIF
                        </Button>
                    )}
                </div>
                <div className="md:col-span-2 space-y-3">
                    <Input
                      label="Tên Nhân Vật (*):"
                      name="name"
                      value={character.name || ''}
                      onChange={handleChange}
                      placeholder="Ví dụ: Lão Hạc, ChatGPT Hài Hước"
                      required
                      rightIcon={<AISuggestButton fieldType="name" onClick={() => handleAISuggestionForField('name', 'charName')} title="Gợi ý tên nhân vật"/>}
                    />
                    <div>
                        <label htmlFor="avatar-file-upload" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Tải Ảnh Tĩnh Từ Máy:</label>
                        <input 
                            id="avatar-file-upload"
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarFileChange} 
                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                                    file:mr-4 file:py-2 file:px-3
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-primary-light/20 file:text-primary dark:file:bg-primary-dark/30 dark:file:text-primary-light
                                    hover:file:bg-primary-light/30 dark:hover:file:bg-primary-dark/40
                                    focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:focus:ring-primary-dark"
                        />
                    </div>
                    <Input
                        label="Hoặc nhập URL ảnh đại diện tĩnh:"
                        name="avatarUrl"
                        value={character.avatarUrl?.startsWith('data:image/') ? '' : (character.avatarUrl || '')} // Don't show data URL in text input
                        onChange={handleAvatarUrlInputChange}
                        placeholder={character.avatarUrl?.startsWith('data:image/') ? 'Ảnh tĩnh đã được tải lên' : 'https://example.com/avatar.png'}
                        disabled={character.avatarUrl?.startsWith('data:image/')}
                    />
                     <div>
                        <label htmlFor="animated-avatar-file-upload" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Tải Ảnh Động GIF Từ Máy:</label>
                        <input 
                            id="animated-avatar-file-upload"
                            type="file" 
                            accept="image/gif" 
                            onChange={handleAnimatedAvatarFileChange} 
                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                                    file:mr-4 file:py-2 file:px-3
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-secondary-light/20 file:text-secondary dark:file:bg-secondary-dark/30 dark:file:text-secondary-light
                                    hover:file:bg-secondary-light/30 dark:hover:file:bg-secondary-dark/40
                                    focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-secondary dark:focus:ring-secondary-dark"
                        />
                    </div>
                    <Input
                        label="Hoặc nhập URL Ảnh Đại Diện Động (GIF):"
                        name="animatedAvatarUrl"
                        value={character.animatedAvatarUrl?.startsWith('data:image/gif') ? '' : (character.animatedAvatarUrl || '')} // Don't show data URL
                        onChange={handleAnimatedAvatarUrlInputChange}
                        placeholder={character.animatedAvatarUrl?.startsWith('data:image/gif') ? 'GIF đã được tải lên' : 'https://example.com/avatar.gif'}
                        disabled={character.animatedAvatarUrl?.startsWith('data:image/gif')}
                    />
                </div>
            </div>
            
            <Textarea
              label="Mô Tả Tính Cách (*):"
              name="personality"
              value={character.personality || ''}
              onChange={handleChange}
              rows={5}
              placeholder="Mô tả chi tiết về tính cách, sở thích, kiến thức, phong cách nói chuyện của nhân vật..."
              required
            />
             <div className="flex justify-end -mt-2">
                <AISuggestButton fieldType="personality" onClick={() => handleAISuggestionForField('personality', 'charPersonality')} title="Gợi ý mô tả tính cách" className="relative -top-1 right-1"/>
            </div>

             <Textarea
              label="Lời Chào Mở Đầu (*):"
              name="greetingMessage"
              value={character.greetingMessage || ''}
              onChange={handleChange}
              rows={2}
              placeholder="Nhân vật sẽ nói gì khi bạn bắt đầu chat?"
              required
            />
             <div className="flex justify-end -mt-2">
               <AISuggestButton fieldType="greeting" onClick={() => handleAISuggestionForField('greeting', 'charGreeting')} title="Gợi ý lời chào" className="relative -top-1 right-1"/>
            </div>

            <Textarea
              label="Giọng Nói / Giọng Điệu (Mô tả):"
              name="voiceTone"
              value={character.voiceTone || ''}
              onChange={handleChange}
              rows={2}
              placeholder="Ví dụ: Trầm ấm, nhẹ nhàng; Nhanh nhẹn, hoạt bát; Giọng cổ trang, uy nghiêm."
            />
            <div className="flex justify-end -mt-2">
                <AISuggestButton fieldType="voiceTone" onClick={() => handleAISuggestionForField('voiceTone', 'charVoiceTone')} title="Gợi ý giọng nói/giọng điệu" className="relative -top-1 right-1"/>
            </div>

            <Textarea
              label="Ví Dụ Hội Thoại (Cách nhân vật phản hồi):"
              name="exampleResponses"
              value={typeof character.exampleResponses === 'string' ? character.exampleResponses : ''}
              onChange={handleChange}
              rows={5}
              placeholder="Cung cấp các ví dụ 'User: ...' và 'Character: ...' trên dòng riêng."
            />
            <div className="flex justify-end -mt-2">
                <AISuggestButton fieldType="example" onClick={() => handleAISuggestionForField('example', 'charExamplePair')} title="Gợi ý một cặp hội thoại mẫu" className="relative -top-1 right-1"/>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1 mt-3">
                Lưu ý: Để khởi tạo, các trường có dấu (*) trong tab này phải được điền đầy đủ, kể cả khi sử dụng AI để tạo hoặc trích xuất.
            </p>
          </div>
        )}

        {activeTab === 'randomAI' && (
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-fadeIn">
            <h3 className="text-lg font-semibold text-primary dark:text-primary-light flex items-center"><i className="fas fa-dice-d20 mr-2"></i>AI Khởi Tạo Nhân Vật Ngẫu Nhiên</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Cung cấp một vài gợi ý (tùy chọn) và để AI tự do sáng tạo một nhân vật hoàn chỉnh cho bạn.
              Kết quả sẽ được điền vào tab "Thiết Lập Thủ Công" để bạn xem và chỉnh sửa.
            </p>
            <Input
              label="Chủ đề / Loại hình nhân vật (Tùy chọn):"
              value={randomGenTheme}
              onChange={(e) => setRandomGenTheme(e.target.value)}
              placeholder="Ví dụ: Robot quản gia, Nhà thám hiểm không gian, Pháp sư cổ đại, Thám tử tài ba..."
            />
            <Textarea
              label="Mô tả ngắn gọn về ý tưởng nhân vật (Tùy chọn):"
              value={randomGenIdea}
              onChange={(e) => setRandomGenIdea(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Một AI quản gia trung thành nhưng hơi vụng về. Hoặc một nhà thám hiểm không gian bị mắc kẹt trên hành tinh lạ, tìm cách sinh tồn..."
            />
            <Button 
                type="button" 
                onClick={handleFullRandomGeneration} 
                isLoading={isAIGenerating.fullRandom}
                leftIcon={<i className="fas fa-brain"></i>}
                variant="secondary"
                fullWidth
                size="lg"
            >
              Để AI Sáng Tạo Toàn Bộ Nhân Vật
            </Button>
          </div>
        )}

        {activeTab === 'extractAI' && (
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-fadeIn">
            <h3 className="text-lg font-semibold text-primary dark:text-primary-light flex items-center"><i className="fas fa-file-import mr-2"></i>AI Trích Xuất Thiết Lập Từ Văn Bản</h3>
             <p className="text-sm text-slate-600 dark:text-slate-300">
              Dán hoặc viết mô tả chi tiết về nhân vật bạn mong muốn. AI sẽ cố gắng phân tích và điền các thông tin vào tab "Thiết Lập Thủ Công".
            </p>
            <Textarea
              label="Dán hoặc viết mô tả toàn bộ thiết lập nhân vật mong muốn của bạn tại đây:"
              value={extractText}
              onChange={(e) => setExtractText(e.target.value)}
              rows={8}
              placeholder="Ví dụ: Tên: Luna. Tính cách: Một AI vui vẻ, lạc quan, hơi tò mò, thích học hỏi về con người. Lời chào: 'Xin chào! Mình là Luna, rất vui được làm quen!'. Giọng điệu: Thân thiện, trong trẻo. Ví dụ hội thoại: User: Bạn thích làm gì? Character: Mình thích đọc sách và khám phá những điều mới mẻ trên mạng!"
            />
            <Button 
                type="button" 
                onClick={handleExtractFromText} 
                isLoading={isAIGenerating.extractFromText}
                leftIcon={<i className="fas fa-wand-magic-sparkles"></i>} 
                variant="secondary"
                fullWidth
                size="lg"
            >
              Để AI Trích Xuất Thiết Lập Từ Mô Tả Trên
            </Button>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-border-light dark:border-border-dark mt-6">
          <Button type="button" variant="outline" onClick={onClose} size="lg">
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="lg" disabled={Object.values(isAIGenerating).some(Boolean) || Object.values(isLoadingFieldSuggestion).some(Boolean)}>
            {existingCharacter ? "Lưu Thay Đổi" : "Tạo Nhân Vật"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CharacterCreationModal;
